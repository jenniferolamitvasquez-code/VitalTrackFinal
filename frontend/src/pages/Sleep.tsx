import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MoonStar,
  Play,
  Plus,
  RefreshCw,
  Square,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "vital-track-sleep-logs";
const ACTIVE_SLEEP_KEY = "vital-track-active-sleep-start";
const TARGET_MINUTES = 8 * 60;

type SleepLog = {
  id: string;
  startAt: string;
  endAt: string;
  quality: number;
};

function loadSleepLogs(): SleepLog[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((log): log is SleepLog => {
      return (
        log &&
        typeof log.id === "string" &&
        typeof log.startAt === "string" &&
        typeof log.endAt === "string" &&
        typeof log.quality === "number"
      );
    });
  } catch {
    return [];
  }
}

function saveSleepLogs(logs: SleepLog[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function minutesBetween(startAt: string, endAt: string) {
  return Math.max(
    0,
    Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000),
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

function dateInputValue(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function scoreSleep(minutes: number, quality: number) {
  const durationScore = Math.max(0, 100 - Math.abs(TARGET_MINUTES - minutes) / 3.2);
  return Math.round(durationScore * 0.7 + quality * 10 * 0.3);
}

function lastSevenDays(logs: SleepLog[]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);

  return logs.filter((log) => new Date(log.endAt) >= cutoff);
}

export default function Sleep() {
  const [logs, setLogs] = useState<SleepLog[]>(() => loadSleepLogs());
  const [activeStart, setActiveStart] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(ACTIVE_SLEEP_KEY),
  );
  const [now, setNow] = useState(() => Date.now());
  const [manualStart, setManualStart] = useState(() => dateInputValue());
  const [manualEnd, setManualEnd] = useState(() => dateInputValue());
  const [manualQuality, setManualQuality] = useState(8);
  const { toast } = useToast();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime()),
    [logs],
  );
  const weeklyLogs = useMemo(() => lastSevenDays(logs), [logs]);
  const lastLog = sortedLogs[0];
  const lastMinutes = lastLog ? minutesBetween(lastLog.startAt, lastLog.endAt) : 0;
  const weeklyAverage = weeklyLogs.length
    ? Math.round(
        weeklyLogs.reduce(
          (total, log) => total + minutesBetween(log.startAt, log.endAt),
          0,
        ) / weeklyLogs.length,
      )
    : 0;
  const averageQuality = weeklyLogs.length
    ? Math.round(
        (weeklyLogs.reduce((total, log) => total + log.quality, 0) /
          weeklyLogs.length) *
          10,
      ) / 10
    : 0;
  const lastScore = lastLog ? scoreSleep(lastMinutes, lastLog.quality) : 0;
  const activeMinutes = activeStart
    ? Math.max(0, Math.round((now - new Date(activeStart).getTime()) / 60000))
    : 0;

  function setAndSaveLogs(nextLogs: SleepLog[]) {
    setLogs(nextLogs);
    saveSleepLogs(nextLogs);
  }

  function startSleep() {
    const start = new Date().toISOString();
    setActiveStart(start);
    window.localStorage.setItem(ACTIVE_SLEEP_KEY, start);
    toast({ title: "Sleep tracking started" });
  }

  function stopSleep() {
    if (!activeStart) {
      return;
    }

    const log: SleepLog = {
      id: crypto.randomUUID(),
      startAt: activeStart,
      endAt: new Date().toISOString(),
      quality: 8,
    };
    const nextLogs = [log, ...logs];
    setAndSaveLogs(nextLogs);
    setActiveStart(null);
    window.localStorage.removeItem(ACTIVE_SLEEP_KEY);
    toast({ title: "Sleep session saved" });
  }

  function addManualLog() {
    const startAt = new Date(manualStart).toISOString();
    const endAt = new Date(manualEnd).toISOString();
    const minutes = minutesBetween(startAt, endAt);

    if (minutes <= 0) {
      toast({
        title: "Invalid sleep window",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    const log: SleepLog = {
      id: crypto.randomUUID(),
      startAt,
      endAt,
      quality: Math.min(10, Math.max(1, manualQuality)),
    };
    setAndSaveLogs([log, ...logs]);
    toast({ title: "Sleep log added" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sleep"
        description="Track sleep sessions, live duration, quality, and recovery consistency."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Last night", value: lastLog ? formatDuration(lastMinutes) : "No data", icon: MoonStar },
          { label: "Sleep score", value: lastLog ? `${lastScore}` : "0", icon: RefreshCw },
          { label: "7-day average", value: weeklyAverage ? formatDuration(weeklyAverage) : "No data", icon: CalendarDays },
          { label: "Avg quality", value: averageQuality ? `${averageQuality}/10` : "No data", icon: Timer },
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
                <h2 className="text-sm font-semibold">Live sleep session</h2>
                <Badge
                  variant="outline"
                  className={
                    activeStart
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : ""
                  }
                >
                  {activeStart ? "Tracking" : "Idle"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Uses precise start and stop timestamps from this device.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={startSleep}
                disabled={Boolean(activeStart)}
                className="rounded-xl"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={stopSleep}
                disabled={!activeStart}
                className="rounded-xl"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-full border-[12px] border-primary/15 bg-primary/5">
              <div className="text-center">
                <p className="font-display text-3xl font-bold">
                  {formatDuration(activeStart ? activeMinutes : lastMinutes)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeStart ? "current session" : "last session"}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Target progress</p>
                <p className="text-sm font-semibold">
                  {Math.min(
                    Math.round(((activeStart ? activeMinutes : lastMinutes) / TARGET_MINUTES) * 100),
                    100,
                  )}
                  %
                </p>
              </div>
              <Progress
                value={Math.min(
                  Math.round(((activeStart ? activeMinutes : lastMinutes) / TARGET_MINUTES) * 100),
                  100,
                )}
                className="h-2.5"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="font-semibold">{formatDuration(TARGET_MINUTES)}</p>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold">
                    {(activeStart ? activeMinutes : lastMinutes) >= TARGET_MINUTES
                      ? "Target met"
                      : "Building recovery"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-card-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Add sleep log</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sleep-start">Start</Label>
              <Input
                id="sleep-start"
                type="datetime-local"
                value={manualStart}
                onChange={(event) => setManualStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep-end">End</Label>
              <Input
                id="sleep-end"
                type="datetime-local"
                value={manualEnd}
                onChange={(event) => setManualEnd(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleep-quality">Quality 1-10</Label>
              <Input
                id="sleep-quality"
                type="number"
                min={1}
                max={10}
                value={manualQuality}
                onChange={(event) => setManualQuality(Number(event.target.value))}
              />
            </div>
            <Button type="button" onClick={addManualLog} className="w-full rounded-xl">
              <Plus className="h-4 w-4" />
              Add log
            </Button>
          </div>
        </Card>
      </div>

      <Card className="border-card-border p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Recent sleep logs</h2>
        <div className="mt-4 space-y-3">
          {sortedLogs.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              No sleep data yet. Start a live session or add a past sleep log.
            </div>
          ) : (
            sortedLogs.slice(0, 7).map((log) => {
              const minutes = minutesBetween(log.startAt, log.endAt);
              return (
                <div
                  key={log.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {new Date(log.endAt).toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.startAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(log.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{formatDuration(minutes)}</Badge>
                    <Badge variant="outline">Score {scoreSleep(minutes, log.quality)}</Badge>
                    <Badge variant="outline">Q {log.quality}/10</Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
