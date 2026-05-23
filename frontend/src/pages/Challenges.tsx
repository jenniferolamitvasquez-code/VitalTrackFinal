import { useEffect, useMemo, useState } from "react";
import {
  getGetTodaySummaryQueryKey,
  getGetWeeklySummaryQueryKey,
  useGetTodaySummary,
  useGetWeeklySummary,
} from "@workspace/api-client-react";
import {
  Activity,
  Award,
  Flame,
  Footprints,
  MapPin,
  RefreshCw,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreferences } from "@/context/preferences-context";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "vital-track-joined-challenges";

type ChallengeStatus = "ready" | "active" | "completed";

type Challenge = {
  id: string;
  title: string;
  description: string;
  value: number;
  goal: number;
  unit: string;
  icon: typeof Trophy;
  accent: string;
  window: "Today" | "This week";
};

function readJoinedChallenges() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set<string>();
  }
}

function saveJoinedChallenges(ids: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

function formatSyncTime(timestamp: number) {
  if (!timestamp) {
    return "Waiting for sync";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusFor(challenge: Challenge, joined: boolean): ChallengeStatus {
  if (challenge.value >= challenge.goal) {
    return "completed";
  }

  return joined ? "active" : "ready";
}

function percent(value: number, goal: number) {
  if (goal <= 0) {
    return 0;
  }

  return Math.min(Math.round((value / goal) * 100), 100);
}

function displayNumber(value: number, unit: string) {
  if (unit === "km" || unit === "mi") {
    return value.toFixed(1);
  }

  return Math.round(value).toLocaleString();
}

export default function Challenges() {
  const preferences = usePreferences();
  const refreshInterval =
    preferences.autoRefreshEnabled && preferences.autoRefreshSeconds > 0
      ? preferences.autoRefreshSeconds * 1000
      : false;
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(() =>
    readJoinedChallenges(),
  );

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

  const today = todayQuery.data;
  const weekly = weeklyQuery.data ?? [];
  const isLoading = todayQuery.isLoading || weeklyQuery.isLoading;
  const isRefreshing = todayQuery.isFetching || weeklyQuery.isFetching;
  const lastUpdated = Math.max(
    todayQuery.dataUpdatedAt,
    weeklyQuery.dataUpdatedAt,
  );

  const weeklyTotals = useMemo(
    () =>
      weekly.reduce(
        (total, day) => ({
          steps: total.steps + day.steps,
          caloriesBurned: total.caloriesBurned + day.caloriesBurned,
          distanceKm: total.distanceKm + day.distanceKm,
          exerciseMinutes: total.exerciseMinutes + day.exerciseMinutes,
        }),
        { steps: 0, caloriesBurned: 0, distanceKm: 0, exerciseMinutes: 0 },
      ),
    [weekly],
  );

  const distanceFactor = preferences.distanceUnit === "mi" ? 0.621371 : 1;
  const distanceUnit = preferences.distanceUnit;
  const weeklyDistance = weeklyTotals.distanceKm * distanceFactor;
  const distanceGoal = 25 * distanceFactor;

  const challenges: Challenge[] = [
    {
      id: "daily-steps",
      title: "Daily Step Closer",
      description: "Hit your live step goal from logs and GPS tracking.",
      value: today?.totalSteps ?? 0,
      goal: today?.stepGoal ?? 10000,
      unit: "steps",
      icon: Footprints,
      accent: "hsl(174,65%,38%)",
      window: "Today",
    },
    {
      id: "weekly-burn",
      title: "Weekly Burn Builder",
      description: "Combine exercise and step calories for the week.",
      value: weeklyTotals.caloriesBurned,
      goal: 2500,
      unit: "kcal",
      icon: Flame,
      accent: "hsl(25,95%,55%)",
      window: "This week",
    },
    {
      id: "active-minutes",
      title: "Active Minutes Pro",
      description: "Log consistent training time across all exercise types.",
      value: weeklyTotals.exerciseMinutes,
      goal: 300,
      unit: "min",
      icon: Timer,
      accent: "hsl(215,80%,55%)",
      window: "This week",
    },
    {
      id: "distance-drive",
      title: "Distance Drive",
      description: "Use accurate route distance from step and GPS entries.",
      value: weeklyDistance,
      goal: distanceGoal,
      unit: distanceUnit,
      icon: MapPin,
      accent: "hsl(140,65%,45%)",
      window: "This week",
    },
  ];

  const joinedCount = challenges.filter((item) =>
    joinedChallenges.has(item.id),
  ).length;
  const completedCount = challenges.filter(
    (item) => item.value >= item.goal,
  ).length;
  const averageProgress = Math.round(
    challenges.reduce((total, item) => total + percent(item.value, item.goal), 0) /
      challenges.length,
  );

  function toggleChallenge(id: string) {
    setJoinedChallenges((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveJoinedChallenges(next);
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
          title="Challenges"
          description="Live fitness challenges powered by your tracked steps, calories, distance, and exercise logs."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live data
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
          { label: "Active challenges", value: joinedCount, icon: Target },
          { label: "Completed", value: completedCount, icon: Award },
          { label: "Average progress", value: `${averageProgress}%`, icon: Activity },
        ].map((metric) => (
          <Card key={metric.label} className="border-card-border p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {metric.value}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-card-border p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Data accuracy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Calculations use the same API summaries as Dashboard and refresh every{" "}
              {preferences.autoRefreshEnabled
                ? `${preferences.autoRefreshSeconds}s`
                : "manual sync"}
              .
            </p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Last sync: {formatSyncTime(lastUpdated)}
          </p>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-2xl" />
            ))
          : challenges.map((challenge) => {
              const Icon = challenge.icon;
              const joined = joinedChallenges.has(challenge.id);
              const status = statusFor(challenge, joined);
              const progress = percent(challenge.value, challenge.goal);

              return (
                <Card
                  key={challenge.id}
                  className="border-card-border p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: challenge.accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{challenge.title}</h2>
                          <Badge variant={status === "completed" ? "default" : "outline"}>
                            {status === "completed"
                              ? "Completed"
                              : status === "active"
                                ? "Active"
                                : "Ready"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{challenge.window}</Badge>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <p className="font-display text-2xl font-bold">
                        {displayNumber(challenge.value, challenge.unit)}
                        <span className="ml-1 text-sm font-medium text-muted-foreground">
                          / {displayNumber(challenge.goal, challenge.unit)}{" "}
                          {challenge.unit}
                        </span>
                      </p>
                      <p className="text-sm font-semibold">{progress}%</p>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Source: live summaries from your logged activity.
                    </p>
                    <Button
                      type="button"
                      variant={joined ? "outline" : "default"}
                      onClick={() => toggleChallenge(challenge.id)}
                      className="rounded-xl"
                      disabled={status === "completed"}
                    >
                      <Trophy className="h-4 w-4" />
                      {status === "completed"
                        ? "Goal reached"
                        : joined
                          ? "Leave challenge"
                          : "Join challenge"}
                    </Button>
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
