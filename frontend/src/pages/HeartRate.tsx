import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bluetooth,
  HeartPulse,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "vital-track-heart-rate-readings";

type HeartReading = {
  id: string;
  bpm: number;
  recordedAt: string;
  source: "manual" | "bluetooth";
};

type BluetoothCharacteristic = EventTarget & {
  startNotifications: () => Promise<BluetoothCharacteristic>;
  addEventListener: (
    type: "characteristicvaluechanged",
    listener: (event: Event & { target: { value?: DataView } }) => void,
  ) => void;
};

type BluetoothRemoteGattServer = {
  getPrimaryService: (service: string) => Promise<{
    getCharacteristic: (characteristic: string) => Promise<BluetoothCharacteristic>;
  }>;
};

type BluetoothDevice = {
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothRemoteGattServer>;
  };
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice: (options: {
      filters: Array<{ services: string[] }>;
      optionalServices?: string[];
    }) => Promise<BluetoothDevice>;
  };
};

function loadReadings(): HeartReading[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((reading): reading is HeartReading => {
      return (
        reading &&
        typeof reading.id === "string" &&
        typeof reading.bpm === "number" &&
        typeof reading.recordedAt === "string" &&
        (reading.source === "manual" || reading.source === "bluetooth")
      );
    });
  } catch {
    return [];
  }
}

function saveReadings(readings: HeartReading[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings.slice(0, 200)));
}

function parseHeartRateValue(value?: DataView) {
  if (!value) {
    return null;
  }

  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x1) === 0x1;
  return isUint16 ? value.getUint16(1, true) : value.getUint8(1);
}

function zoneForBpm(bpm: number) {
  if (bpm < 60) {
    return { label: "Low", pct: 35, className: "border-blue-200 bg-blue-50 text-blue-700" };
  }

  if (bpm <= 100) {
    return { label: "Resting", pct: 52, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }

  if (bpm <= 140) {
    return { label: "Cardio", pct: 74, className: "border-amber-200 bg-amber-50 text-amber-700" };
  }

  return { label: "High", pct: 92, className: "border-red-200 bg-red-50 text-red-700" };
}

function minutesAgo(recordedAt?: string) {
  if (!recordedAt) {
    return "No readings yet";
  }

  const diff = Math.max(
    0,
    Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000),
  );

  if (diff === 0) {
    return "Just now";
  }

  return `${diff} min ago`;
}

export default function HeartRate() {
  const [readings, setReadings] = useState<HeartReading[]>(() => loadReadings());
  const [manualBpm, setManualBpm] = useState(72);
  const [deviceName, setDeviceName] = useState("");
  const [sensorStatus, setSensorStatus] = useState<
    "idle" | "connecting" | "connected" | "unsupported"
  >("idle");
  const [now, setNow] = useState(() => Date.now());
  const { toast } = useToast();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedReadings = useMemo(
    () =>
      [...readings].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      ),
    [readings],
  );
  const latest = sortedReadings[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayReadings = sortedReadings.filter(
    (reading) => new Date(reading.recordedAt) >= todayStart,
  );
  const resting = todayReadings.length
    ? Math.min(...todayReadings.map((reading) => reading.bpm))
    : latest?.bpm ?? 0;
  const peak = todayReadings.length
    ? Math.max(...todayReadings.map((reading) => reading.bpm))
    : latest?.bpm ?? 0;
  const average = todayReadings.length
    ? Math.round(
        todayReadings.reduce((total, reading) => total + reading.bpm, 0) /
          todayReadings.length,
      )
    : latest?.bpm ?? 0;
  const zone = latest ? zoneForBpm(latest.bpm) : zoneForBpm(0);
  const chartData = [...sortedReadings]
    .reverse()
    .slice(-24)
    .map((reading) => ({
      time: new Date(reading.recordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      bpm: reading.bpm,
      source: reading.source,
    }));

  function addReading(bpm: number, source: HeartReading["source"]) {
    const cleanBpm = Math.min(230, Math.max(30, Math.round(bpm)));
    const nextReadings = [
      {
        id: crypto.randomUUID(),
        bpm: cleanBpm,
        recordedAt: new Date().toISOString(),
        source,
      },
      ...readings,
    ];
    setReadings(nextReadings);
    saveReadings(nextReadings);
  }

  function addManualReading() {
    addReading(manualBpm, "manual");
    toast({ title: "Heart rate saved" });
  }

  async function connectSensor() {
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    if (!bluetooth) {
      setSensorStatus("unsupported");
      toast({
        title: "Bluetooth heart-rate sensor unavailable",
        description: "Use a supported browser/device or log readings manually.",
      });
      return;
    }

    try {
      setSensorStatus("connecting");
      const device = await bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["heart_rate"],
      });
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Unable to connect to sensor.");
      }

      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const bpm = parseHeartRateValue(event.target.value);
        if (bpm != null) {
          addReading(bpm, "bluetooth");
        }
      });
      setDeviceName(device.name ?? "Heart-rate sensor");
      setSensorStatus("connected");
      toast({ title: "Heart-rate sensor connected" });
    } catch (cause) {
      setSensorStatus("idle");
      toast({
        title: "Sensor connection failed",
        description:
          cause instanceof Error ? cause.message : "Unable to connect right now.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Heart Rate"
          description="Log accurate pulse readings, connect a compatible Bluetooth sensor, and monitor live zones."
        />
        <Badge
          variant="outline"
          className={
            sensorStatus === "connected"
              ? "gap-2 border-emerald-200 bg-emerald-50 text-emerald-700"
              : "gap-2"
          }
        >
          <span
            className={
              sensorStatus === "connected"
                ? "h-2 w-2 rounded-full bg-emerald-500"
                : "h-2 w-2 rounded-full bg-slate-400"
            }
          />
          {sensorStatus === "connected" ? "Live sensor" : "Manual ready"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Current", value: latest ? `${latest.bpm} bpm` : "No data", icon: HeartPulse },
          { label: "Resting today", value: resting ? `${resting} bpm` : "No data", icon: ShieldCheck },
          { label: "Peak today", value: peak ? `${peak} bpm` : "No data", icon: TrendingUp },
          { label: "Average today", value: average ? `${average} bpm` : "No data", icon: Activity },
        ].map((metric) => (
          <Card key={metric.label} className="border-card-border p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 truncate font-display text-2xl font-bold">
                  {metric.value}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <Card className="border-card-border p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Live pulse zone</h2>
                <Badge variant="outline" className={zone.className}>
                  {latest ? zone.label : "Waiting"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Updated {minutesAgo(latest?.recordedAt)} from{" "}
                {latest?.source === "bluetooth" ? "Bluetooth sensor" : "manual reading"}.
                <span className="sr-only">{now}</span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={connectSensor}
              disabled={sensorStatus === "connecting" || sensorStatus === "connected"}
              className="rounded-xl"
            >
              <Bluetooth className="h-4 w-4" />
              {sensorStatus === "connecting"
                ? "Connecting..."
                : sensorStatus === "connected"
                  ? deviceName || "Connected"
                  : "Connect sensor"}
            </Button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-red-100 bg-red-50 text-red-600">
              <div className="text-center">
                <HeartPulse className="mx-auto mb-2 h-7 w-7" />
                <p className="font-display text-4xl font-bold">
                  {latest?.bpm ?? "--"}
                </p>
                <p className="text-xs font-medium text-red-500">bpm</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Zone intensity</p>
                <p className="text-sm font-semibold">{zone.pct}%</p>
              </div>
              <Progress value={latest ? zone.pct : 0} className="h-2.5" />
              <div className="mt-4 h-[250px]">
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="heartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 5" stroke="rgba(148,163,184,0.24)" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis axisLine={false} tickLine={false} fontSize={12} domain={["dataMin - 8", "dataMax + 8"]} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="bpm"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        fill="url(#heartGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border bg-secondary/30 text-sm text-muted-foreground">
                    Add a reading to see your trend.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-card-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Add accurate reading</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a measured pulse from a watch, chest strap, fingertip sensor, or manual count.
          </p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-bpm">Beats per minute</Label>
              <Input
                id="manual-bpm"
                type="number"
                min={30}
                max={230}
                value={manualBpm}
                onChange={(event) => setManualBpm(Number(event.target.value))}
              />
            </div>
            <Button type="button" onClick={addManualReading} className="w-full rounded-xl">
              <Plus className="h-4 w-4" />
              Save reading
            </Button>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Accuracy note</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Live heart-rate requires a connected sensor. Manual readings are only as accurate as the measuring device or count used.
            </p>
          </div>
        </Card>
      </div>

      <Card className="border-card-border p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Recent readings</h2>
        <div className="mt-4 space-y-3">
          {sortedReadings.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              No heart-rate readings yet.
            </div>
          ) : (
            sortedReadings.slice(0, 10).map((reading) => (
              <div
                key={reading.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{reading.bpm} bpm</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(reading.recordedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge variant={reading.source === "bluetooth" ? "default" : "outline"}>
                  {reading.source === "bluetooth" ? "Sensor" : "Manual"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
