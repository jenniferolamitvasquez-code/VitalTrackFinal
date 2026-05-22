import { useMemo, useState } from "react";
import {
  getGetTodaySummaryQueryKey,
  getGetWeeklySummaryQueryKey,
  useGetTodaySummary,
  useGetWeeklySummary,
} from "@workspace/api-client-react";
import {
  Activity,
  Flame,
  Footprints,
  RefreshCw,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/context/preferences-context";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vital-track-goal-targets";

type GoalTargets = {
  steps: number;
  calories: number;
  exerciseMinutes: number;
  weeklyActiveDays: number;
};

type Goal = {
  id: keyof GoalTargets;
  title: string;
  description: string;
  value: number;
  target: number;
  unit: string;
  icon: typeof Target;
  accent: string;
  scope: "Today" | "This week";
};

const defaultTargets: GoalTargets = {
  steps: 10000,
  calories: 2000,
  exerciseMinutes: 60,
  weeklyActiveDays: 5,
};

function loadTargets(): GoalTargets {
  if (typeof window === "undefined") {
    return defaultTargets;
  }

  try {
    return {
      ...defaultTargets,
      ...(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<GoalTargets>),
    };
  } catch {
    return defaultTargets;
  }
}

function saveTargets(targets: GoalTargets) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
}

function progress(value: number, target: number) {
  return target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0;
}

function isActiveDay(day: {
  caloriesIn: number;
  caloriesBurned: number;
  steps: number;
  exerciseMinutes: number;
}) {
  return (
    day.caloriesIn > 0 ||
    day.caloriesBurned > 0 ||
    day.steps > 0 ||
    day.exerciseMinutes > 0
  );
}

function formatSyncTime(timestamp: number) {
  return timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Waiting for sync";
}

export default function Goals() {
  const preferences = usePreferences();
  const refreshInterval =
    preferences.autoRefreshEnabled && preferences.autoRefreshSeconds > 0
      ? preferences.autoRefreshSeconds * 1000
      : false;
  const [targets, setTargets] = useState<GoalTargets>(() => loadTargets());

  const todayQuery = useGetTodaySummary({
    query: {
      queryKey: getGetTodaySummaryQueryKey(),
      refetchInterval: refreshInterval,
      refetchOnWindowFocus: true,
    },
  });
  const weeklyQuery = useGetWeeklySummary({
    query: {
      queryKey: getGetWeeklySummaryQueryKey(),
      refetchInterval: refreshInterval,
      refetchOnWindowFocus: true,
    },
  });

  const weekly = weeklyQuery.data ?? [];
  const activeDays = weekly.filter(isActiveDay).length;
  const today = todayQuery.data;
  const isLoading = todayQuery.isLoading || weeklyQuery.isLoading;
  const isRefreshing = todayQuery.isFetching || weeklyQuery.isFetching;
  const lastUpdated = Math.max(
    todayQuery.dataUpdatedAt,
    weeklyQuery.dataUpdatedAt,
  );

  const goals: Goal[] = useMemo(
    () => [
      {
        id: "steps",
        title: "Step Target",
        description: "Live progress from today's step logs and GPS-tracked distance.",
        value: today?.totalSteps ?? 0,
        target: targets.steps,
        unit: "steps",
        icon: Footprints,
        accent: "hsl(174,65%,38%)",
        scope: "Today",
      },
      {
        id: "calories",
        title: "Calorie Target",
        description: "Tracks today's calorie intake from your meal logs.",
        value: today?.totalCaloriesIn ?? 0,
        target: targets.calories,
        unit: "kcal",
        icon: Flame,
        accent: "hsl(25,95%,55%)",
        scope: "Today",
      },
      {
        id: "exerciseMinutes",
        title: "Training Minutes",
        description: "Uses logged exercise duration from the API summary.",
        value: today?.totalExerciseMinutes ?? 0,
        target: targets.exerciseMinutes,
        unit: "min",
        icon: Timer,
        accent: "hsl(215,80%,55%)",
        scope: "Today",
      },
      {
        id: "weeklyActiveDays",
        title: "Weekly Consistency",
        description: "Counts days with activity across steps, calories, or workouts.",
        value: activeDays,
        target: targets.weeklyActiveDays,
        unit: "days",
        icon: Trophy,
        accent: "hsl(140,65%,45%)",
        scope: "This week",
      },
    ],
    [activeDays, targets, today],
  );

  const completed = goals.filter((goal) => goal.value >= goal.target).length;
  const average = Math.round(
    goals.reduce((total, goal) => total + progress(goal.value, goal.target), 0) /
      goals.length,
  );

  function updateTarget(id: keyof GoalTargets, value: string) {
    const nextValue = Math.max(1, Math.round(Number(value) || 1));
    setTargets((current) => {
      const next = { ...current, [id]: nextValue };
      saveTargets(next);
      return next;
    });
  }

  function refetchAll() {
    void todayQuery.refetch();
    void weeklyQuery.refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="Goals"
          description="Professional goal tracking powered by live summaries and editable targets."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live API data
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refetchAll}
            disabled={isRefreshing}
            className="rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Sync now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Goals completed", value: `${completed}/${goals.length}`, icon: Trophy },
          { label: "On-track score", value: `${average}%`, icon: Activity },
          { label: "Last sync", value: formatSyncTime(lastUpdated), icon: RefreshCw },
        ].map((metric) => (
          <Card key={metric.label} className="border-card-border p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 truncate font-display text-2xl font-bold">
                  {metric.value}
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl" />
            ))
          : goals.map((goal) => {
              const Icon = goal.icon;
              const pct = progress(goal.value, goal.target);
              const complete = goal.value >= goal.target;

              return (
                <Card key={goal.id} className="border-card-border p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: goal.accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{goal.title}</h2>
                          <Badge variant={complete ? "default" : "outline"}>
                            {complete ? "Reached" : goal.scope}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {goal.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <p className="font-display text-2xl font-bold">
                        {Math.round(goal.value).toLocaleString()}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">
                          / {goal.target.toLocaleString()} {goal.unit}
                        </span>
                      </p>
                      <p className="text-sm font-semibold">{pct}%</p>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_150px] sm:items-end">
                    <div>
                      <Label htmlFor={`goal-${goal.id}`} className="text-xs">
                        Target
                      </Label>
                      <Input
                        id={`goal-${goal.id}`}
                        type="number"
                        min={1}
                        value={goal.target}
                        onChange={(event) =>
                          updateTarget(goal.id, event.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="font-semibold">
                        {Math.max(0, goal.target - goal.value).toLocaleString()}{" "}
                        {goal.unit}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
