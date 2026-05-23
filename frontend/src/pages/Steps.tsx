import { useEffect, useRef, useState } from "react";
import { useListStepLogs, useCreateStepLog, useDeleteStepLog, getListStepLogsQueryKey, getGetTodaySummaryQueryKey, getGetWeeklySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Trash2, Footprints, MapPin, Flame, Play, Square, Route, Timer, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { localDateString } from "@/utils/date";

const optionalNumber = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce.number().min(0).nullable().optional(),
);

function parseStepInput(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase().replace(/,/g, "");
  const shorthand = normalized.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (shorthand) {
    return Number(shorthand[1]) * 1000;
  }

  return normalized;
}

const formSchema = z.object({
  steps: z.preprocess(parseStepInput, z.coerce.number().min(0)),
  date: z.string().min(1, "Date is required"),
  distanceKm: optionalNumber,
  caloriesBurned: optionalNumber,
});
type FormValues = z.infer<typeof formSchema>;

function todayStr() {
  return localDateString();
}

const STEP_GOAL = 10000;
const TEAL = "hsl(174,65%,38%)";
const DEFAULT_MAP_CENTER: L.LatLngTuple = [14.5995, 120.9842];
const STEP_LENGTH_METERS = 0.75;
const CALORIES_PER_STEP = 0.04;
const GPS_STORAGE_PREFIX = "vitaltrack:gps-activity:";

type RoutePoint = {
  lat: number;
  lng: number;
};

type TrackingStatus = "idle" | "starting" | "tracking" | "permission-denied" | "unsupported" | "error";

type GpsActivitySnapshot = {
  steps: number;
  distanceKm: number;
  caloriesBurned: number;
  route: RoutePoint[];
  elapsedSeconds: number;
  savedAt: string;
};

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

function StepRing({ value, max }: { value: number; max: number }) {
  const r = 72;
  const sw = 12;
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} strokeWidth={sw} fill="none" stroke="hsl(185,30%,86%)" />
      <circle
        cx={cx} cy={cy} r={r} strokeWidth={sw} fill="none"
        stroke={TEAL}
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

function haversineDistanceKm(from: RoutePoint, to: RoutePoint) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hrs, mins, secs].map((part) => String(part).padStart(2, "0")).join(":");
}

function createEmptyGpsActivity(): GpsActivitySnapshot {
  return {
    steps: 0,
    distanceKm: 0,
    caloriesBurned: 0,
    route: [],
    elapsedSeconds: 0,
    savedAt: new Date().toISOString(),
  };
}

function estimateStepsFromDistance(distanceKm: number) {
  return Math.round((distanceKm * 1000) / STEP_LENGTH_METERS);
}

function calculateCalories(steps: number) {
  return Number((steps * CALORIES_PER_STEP).toFixed(1));
}

function normalizeStepCount(value: unknown) {
  const parsed = Number(parseStepInput(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function getGpsStorageKey(date: string) {
  return `${GPS_STORAGE_PREFIX}${date}`;
}

function normalizeRoute(value: unknown): RoutePoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((point): point is RoutePoint => {
    if (!point || typeof point !== "object") {
      return false;
    }

    const maybePoint = point as Partial<RoutePoint>;
    return typeof maybePoint.lat === "number" && typeof maybePoint.lng === "number";
  });
}

function readSavedGpsActivity(date: string): GpsActivitySnapshot {
  if (typeof window === "undefined") {
    return createEmptyGpsActivity();
  }

  try {
    const raw = window.localStorage.getItem(getGpsStorageKey(date));
    if (!raw) {
      return createEmptyGpsActivity();
    }

    const parsed = JSON.parse(raw) as Partial<GpsActivitySnapshot>;
    const parsedDistanceKm = Number(parsed.distanceKm ?? 0);
    const parsedElapsedSeconds = Number(parsed.elapsedSeconds ?? 0);
    const parsedSteps = Number(parsed.steps ?? 0);
    const distanceKm = Number.isFinite(parsedDistanceKm) ? Math.max(0, parsedDistanceKm) : 0;
    const route = normalizeRoute(parsed.route);
    const steps = Math.max(
      Number.isFinite(parsedSteps) ? Math.max(0, Math.round(parsedSteps)) : 0,
      estimateStepsFromDistance(distanceKm),
    );

    return {
      steps,
      distanceKm,
      caloriesBurned: calculateCalories(steps),
      route,
      elapsedSeconds: Number.isFinite(parsedElapsedSeconds) ? Math.max(0, Math.round(parsedElapsedSeconds)) : 0,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return createEmptyGpsActivity();
  }
}

function saveGpsActivity(date: string, activity: GpsActivitySnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getGpsStorageKey(date), JSON.stringify(activity));
  } catch {
    // Local storage can be unavailable in private browsing or locked-down contexts.
  }
}

function GpsActivityMap({
  date,
  onActivityChange,
}: {
  date: string;
  onActivityChange: (activity: GpsActivitySnapshot) => void;
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const motionListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const pointsRef = useRef<RoutePoint[]>([]);
  const activityRef = useRef<GpsActivitySnapshot>(createEmptyGpsActivity());
  const motionStepsRef = useRef(0);
  const lastMotionMagnitudeRef = useRef(0);
  const lastMotionStepAtRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const trackingSessionRef = useRef(0);
  const [activity, setActivity] = useState<GpsActivitySnapshot>(() => createEmptyGpsActivity());
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function statusMeta() {
    if (status === "starting") {
      return {
        label: "Starting",
        detail: "Getting GPS lock",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        dotClassName: "bg-amber-500",
      };
    }

    if (status === "tracking") {
      return {
        label: "Tracking",
        detail: "Recording activity",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dotClassName: "bg-emerald-500",
      };
    }

    if (status === "permission-denied") {
      return {
        label: "Permission denied",
        detail: "Location access needed",
        className: "border-red-200 bg-red-50 text-red-700",
        dotClassName: "bg-red-500",
      };
    }

    if (status === "unsupported") {
      return {
        label: "Unsupported",
        detail: "GPS not available",
        className: "border-slate-200 bg-slate-50 text-slate-600",
        dotClassName: "bg-slate-400",
      };
    }

    if (status === "error") {
      return {
        label: "Location error",
        detail: "Try again outdoors",
        className: "border-red-200 bg-red-50 text-red-700",
        dotClassName: "bg-red-500",
      };
    }

    return {
      label: "Stopped",
      detail: "Ready to start",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      dotClassName: "bg-slate-400",
    };
  }

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    routeRef.current = L.polyline([], {
      color: TEAL,
      weight: 5,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    mapRef.current = map;
    drawRoute(activityRef.current.route);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapElRef.current);

    return () => {
      resizeObserver.disconnect();
      clearLocationWatch();
      stopMotionStepDetection();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    trackingSessionRef.current += 1;
    clearLocationWatch();
    stopMotionStepDetection();
    setStatus("idle");
    setErrorMessage("");

    const savedActivity = readSavedGpsActivity(date);
    activityRef.current = savedActivity;
    pointsRef.current = savedActivity.route;
    motionStepsRef.current = savedActivity.steps;
    startedAtRef.current = null;
    setMotionAvailable(false);
    setActivity(savedActivity);
    onActivityChange(savedActivity);
    drawRoute(savedActivity.route);
  }, [date, onActivityChange]);

  useEffect(() => {
    if (status !== "tracking") {
      return;
    }

    const timer = window.setInterval(() => {
      if (startedAtRef.current != null) {
        updateActivity({
          elapsedSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status]);

  function clearLocationWatch() {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  function stopMotionStepDetection() {
    if (motionListenerRef.current) {
      window.removeEventListener("devicemotion", motionListenerRef.current);
      motionListenerRef.current = null;
    }
  }

  function updateActivity(partial: Partial<GpsActivitySnapshot>) {
    const previous = activityRef.current;
    const rawDistanceKm = partial.distanceKm ?? previous.distanceKm;
    const distanceKm = Number.isFinite(rawDistanceKm) ? Math.max(0, rawDistanceKm) : 0;
    const route = partial.route ?? previous.route;
    const rawElapsedSeconds = partial.elapsedSeconds ?? previous.elapsedSeconds;
    const rawPartialSteps = partial.steps ?? previous.steps;
    const elapsedSeconds = Number.isFinite(rawElapsedSeconds) ? Math.max(0, Math.round(rawElapsedSeconds)) : 0;
    const steps = Math.max(
      Number.isFinite(rawPartialSteps) ? Math.max(0, Math.round(rawPartialSteps)) : 0,
      estimateStepsFromDistance(distanceKm),
      motionStepsRef.current,
    );
    const nextActivity: GpsActivitySnapshot = {
      steps,
      distanceKm,
      caloriesBurned: calculateCalories(steps),
      route,
      elapsedSeconds,
      savedAt: new Date().toISOString(),
    };

    activityRef.current = nextActivity;
    pointsRef.current = route;
    setActivity(nextActivity);
    onActivityChange(nextActivity);
    saveGpsActivity(date, nextActivity);
    drawRoute(route);
  }

  function ensureMarker(latLng: L.LatLngTuple) {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, {
        icon: L.divIcon({
          className: "",
          html: '<span class="block h-5 w-5 rounded-full border-[3px] border-white bg-teal-500 shadow-[0_0_0_8px_rgba(20,184,166,0.18)]"></span>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      })
        .addTo(map)
        .bindPopup("You are here");
    } else {
      markerRef.current.setLatLng(latLng);
    }

    markerRef.current.openPopup();
  }

  function drawRoute(route: RoutePoint[]) {
    const map = mapRef.current;
    const latLngs = route.map((point) => [point.lat, point.lng] as L.LatLngTuple);

    routeRef.current?.setLatLngs(latLngs);

    if (!map) {
      return;
    }

    if (latLngs.length === 0) {
      markerRef.current?.remove();
      accuracyCircleRef.current?.remove();
      markerRef.current = null;
      accuracyCircleRef.current = null;
      map.setView(DEFAULT_MAP_CENTER, 13);
      return;
    }

    const currentLatLng = latLngs[latLngs.length - 1];
    ensureMarker(currentLatLng);

    if (latLngs.length === 1) {
      map.setView(currentLatLng, 16);
      return;
    }

    map.fitBounds(L.latLngBounds(latLngs).pad(0.2), { maxZoom: 17 });
  }

  function handlePosition(position: GeolocationPosition, countDistance = true) {
    const point = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const previousPoint = pointsRef.current.at(-1);
    const nextRoute = [...pointsRef.current, point];
    let nextDistanceKm = activityRef.current.distanceKm;

    if (previousPoint && countDistance) {
      const segmentKm = haversineDistanceKm(previousPoint, point);
      const hasUsableAccuracy = !position.coords.accuracy || position.coords.accuracy <= 100;
      if (segmentKm > 0.003 && hasUsableAccuracy) {
        nextDistanceKm += segmentKm;
      }
    }

    const latLng: L.LatLngTuple = [point.lat, point.lng];
    ensureMarker(latLng);

    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: position.coords.accuracy,
        color: TEAL,
        fillColor: TEAL,
        fillOpacity: 0.12,
        weight: 1,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(position.coords.accuracy);
    }

    updateActivity({
      distanceKm: nextDistanceKm,
      route: nextRoute,
    });
  }

  function handleLocationError(error: GeolocationPositionError, sessionId = trackingSessionRef.current) {
    if (sessionId !== trackingSessionRef.current) {
      return;
    }

    clearLocationWatch();
    stopMotionStepDetection();
    startedAtRef.current = null;

    if (error.code === error.PERMISSION_DENIED) {
      setStatus("permission-denied");
      setErrorMessage("Location permission was denied. Enable location access to track your route.");
      return;
    }

    setStatus("error");
    setErrorMessage("GPS location is unavailable right now. Try again outdoors or check device location settings.");
  }

  async function startMotionStepDetection(sessionId: number) {
    if (!("DeviceMotionEvent" in window)) {
      setMotionAvailable(false);
      return;
    }

    try {
      const motionEvent = window.DeviceMotionEvent as DeviceMotionEventWithPermission;
      if (typeof motionEvent.requestPermission === "function") {
        const permission = await motionEvent.requestPermission();
        if (sessionId !== trackingSessionRef.current) {
          return;
        }

        if (permission !== "granted") {
          setMotionAvailable(false);
          return;
        }
      }

      if (sessionId !== trackingSessionRef.current) {
        return;
      }

      if (!motionListenerRef.current) {
        motionListenerRef.current = (event: DeviceMotionEvent) => {
          if (sessionId !== trackingSessionRef.current) {
            return;
          }

          const acceleration = event.accelerationIncludingGravity;
          if (!acceleration) {
            return;
          }

          const x = acceleration.x ?? 0;
          const y = acceleration.y ?? 0;
          const z = acceleration.z ?? 0;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();
          const crossedStepPeak = magnitude > 12 && lastMotionMagnitudeRef.current <= 12;

          if (crossedStepPeak && now - lastMotionStepAtRef.current > 350) {
            lastMotionStepAtRef.current = now;
            motionStepsRef.current += 1;
            updateActivity({ steps: motionStepsRef.current });
          }

          lastMotionMagnitudeRef.current = magnitude;
        };
      }

      window.addEventListener("devicemotion", motionListenerRef.current);
      setMotionAvailable(true);
    } catch {
      setMotionAvailable(false);
    }
  }

  function startTracking() {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      setErrorMessage("GPS tracking is not supported by this browser.");
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15000,
    };

    const sessionId = trackingSessionRef.current + 1;
    trackingSessionRef.current = sessionId;
    clearLocationWatch();
    setErrorMessage("");
    setStatus("starting");
    startedAtRef.current = Date.now() - activityRef.current.elapsedSeconds * 1000;
    void startMotionStepDetection(sessionId);

    navigator.geolocation.getCurrentPosition((position) => {
      if (sessionId !== trackingSessionRef.current) {
        return;
      }

      handlePosition(position, false);
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (nextPosition) => {
            if (sessionId === trackingSessionRef.current) {
              handlePosition(nextPosition);
            }
          },
          (error) => handleLocationError(error, sessionId),
          options,
        );
        setStatus("tracking");
      } catch {
        if (sessionId === trackingSessionRef.current) {
          setStatus("error");
          setErrorMessage("Unable to keep GPS tracking active. Please try again.");
        }
      }
    }, (error) => handleLocationError(error, sessionId), options);
  }

  function stopTracking() {
    trackingSessionRef.current += 1;
    clearLocationWatch();
    stopMotionStepDetection();
    setMotionAvailable(false);
    if (startedAtRef.current != null) {
      updateActivity({
        elapsedSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000),
      });
    }
    startedAtRef.current = null;
    setStatus("idle");
    setErrorMessage("");
  }

  const meta = statusMeta();
  const isStarting = status === "starting";
  const isTracking = status === "tracking";
  const canStop = isStarting || isTracking;

  return (
    <div className="bg-card rounded-2xl border border-card-border shadow-sm p-5 mb-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 xl:max-w-[360px]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">GPS Activity Map</h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  meta.className,
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", meta.dotClassName)} />
                {meta.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{meta.detail}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button
                type="button"
                onClick={startTracking}
                disabled={isStarting || isTracking}
                className="h-10 min-w-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
              >
                <Play className="mr-2 h-4 w-4" />
                <span className="truncate">
                  {isStarting ? "Starting..." : isTracking ? "Tracking..." : "Start Tracking"}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={stopTracking}
                disabled={!canStop}
                className="h-10 min-w-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-45"
              >
                <Square className="mr-2 h-4 w-4" />
                <span className="truncate">Stop Tracking</span>
              </Button>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 text-sm sm:grid-cols-3 xl:w-[430px] 2xl:w-[500px]">
            <div className="min-w-0 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Route className="h-4 w-4" style={{ color: TEAL }} />
                <span>Distance</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-foreground">{activity.distanceKm.toFixed(2)} km</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Timer className="h-4 w-4" style={{ color: TEAL }} />
                <span>Duration</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-foreground">{formatDuration(activity.elapsedSeconds)}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <LocateFixed className="h-4 w-4" style={{ color: TEAL }} />
                <span>Status</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{meta.label}</p>
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div
        ref={mapElRef}
        className="mt-4 h-[280px] overflow-hidden rounded-xl border border-border bg-secondary/30 sm:h-[340px]"
      />

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary/10 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Footprints className="h-5 w-5" style={{ color: TEAL }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Track your walk, run, or hike in real-time.</p>
          <p className="text-xs text-muted-foreground">
            {motionAvailable
              ? "Device motion is active; GPS distance remains the fallback for step estimates."
              : "Steps are estimated from GPS distance when a native step sensor is not available."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Steps() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [gpsActivity, setGpsActivity] = useState<GpsActivitySnapshot>(() => createEmptyGpsActivity());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading } = useListStepLogs({ date }, { query: { queryKey: getListStepLogsQueryKey({ date }) } });
  const createMutation = useCreateStepLog();
  const deleteMutation = useDeleteStepLog();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { steps: 0, date: todayStr(), distanceKm: null, caloriesBurned: null },
  });
  const watchedSteps = form.watch("steps");
  const watchedDistanceKm = form.watch("distanceKm");

  useEffect(() => {
    const steps = normalizeStepCount(watchedSteps);
    if (steps <= 0) {
      return;
    }

    const currentDistance = Number(form.getValues("distanceKm") ?? 0);
    form.setValue("caloriesBurned", calculateCalories(steps), {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (!currentDistance) {
      form.setValue(
        "distanceKm",
        Number(((steps * STEP_LENGTH_METERS) / 1000).toFixed(2)),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    }
  }, [form, watchedSteps]);

  useEffect(() => {
    const distanceKm = Number(watchedDistanceKm) || 0;
    const steps = normalizeStepCount(form.getValues("steps"));
    if (distanceKm <= 0 || steps > 0) {
      return;
    }

    const estimatedSteps = estimateStepsFromDistance(distanceKm);
    form.setValue("steps", estimatedSteps, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("caloriesBurned", calculateCalories(estimatedSteps), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, watchedDistanceKm]);

  const loggedSteps = (logs ?? []).reduce((acc, l) => acc + l.steps, 0);
  const loggedDistanceKm = (logs ?? []).reduce((acc, l) => acc + (l.distanceKm ?? 0), 0);
  const loggedCaloriesBurned = (logs ?? []).reduce((acc, l) => acc + (l.caloriesBurned ?? 0), 0);
  const displaySteps = loggedSteps + gpsActivity.steps;
  const displayDistanceKm = loggedDistanceKm + gpsActivity.distanceKm;
  const displayCaloriesBurned = loggedCaloriesBurned + gpsActivity.caloriesBurned;
  const pct = Math.min(Math.round((displaySteps / STEP_GOAL) * 100), 100);

  async function onSubmit(values: FormValues) {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStepLogsQueryKey({ date: values.date }) });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
          toast({ title: "Steps logged" });
          form.reset({ steps: 0, date, distanceKm: null, caloriesBurned: null });
          setOpen(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to log steps.", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStepLogsQueryKey({ date }) });
        queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWeeklySummaryQueryKey() });
        toast({ title: "Removed" });
      },
    });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Steps</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your daily activity</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              data-testid="button-add-steps"
              onClick={() => form.setValue("date", date)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Log Steps</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <FormField control={form.control} name="steps" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Steps</FormLabel>
                    <FormControl><Input data-testid="input-steps" type="text" inputMode="decimal" placeholder="e.g. 1000 or 1k" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">
                      Try 1k for 1,000 steps. Distance and calories auto-estimate from your step count.
                    </p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input data-testid="input-steps-date" type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="distanceKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (km)</FormLabel>
                      <FormControl><Input data-testid="input-distance" type="number" min={0} step="0.01" placeholder="0.0" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calories burned</FormLabel>
                      <FormControl><Input data-testid="input-steps-calories" type="number" min={0} placeholder="0" {...field} value={field.value ?? ""} /></FormControl>
                      <p className="text-xs text-muted-foreground">
                        Uses {CALORIES_PER_STEP} kcal per step estimate.
                      </p>
                    </FormItem>
                  )} />
                </div>
                <Button data-testid="button-submit-steps" type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving..." : "Log Steps"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Label className="text-sm text-muted-foreground">Date:</Label>
        <Input data-testid="input-date-filter-steps" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
      </div>

      {/* Progress Ring Card */}
      <div className="bg-card rounded-2xl border border-card-border p-6 mb-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <StepRing value={displaySteps} max={STEP_GOAL} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-display font-bold text-foreground">{pct}%</p>
              <p className="text-xs text-muted-foreground">of goal</p>
            </div>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Steps Today</p>
              <p className="text-3xl font-display font-bold text-foreground">{displaySteps.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Goal: {STEP_GOAL.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(215,80%,55%)" }} />
                  <p className="text-xs text-muted-foreground">Distance</p>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{displayDistanceKm.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km</span></p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-calories" />
                  <p className="text-xs text-muted-foreground">Burned</p>
                </div>
                <p className="text-lg font-display font-bold text-foreground">{Math.round(displayCaloriesBurned)} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GpsActivityMap date={date} onActivityChange={setGpsActivity} />

      {/* Log entries */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (logs ?? []).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-card-border">
          <Footprints className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No steps logged</p>
          <p className="text-muted-foreground text-sm mt-1">Log your steps for this day</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Log Entries</p>
          </div>
          <ul className="divide-y divide-border">
            {(logs ?? []).map(log => (
              <li key={log.id} data-testid={`step-entry-${log.id}`} className="flex items-center gap-4 px-5 py-3 group hover:bg-secondary/20 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(174,65%,92%)" }}>
                  <Footprints className="w-4 h-4" style={{ color: TEAL }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{log.steps.toLocaleString()} steps</p>
                  <p className="text-xs text-muted-foreground">
                    {log.distanceKm != null ? `${log.distanceKm} km` : ""}
                    {log.caloriesBurned != null ? ` · ${log.caloriesBurned} kcal burned` : ""}
                  </p>
                </div>
                <button
                  data-testid={`button-delete-step-${log.id}`}
                  onClick={() => handleDelete(log.id)}
                  className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
