import {
  useGetTodaySummary,
  useGetWeeklySummary,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Activity,
  Flame,
  Footprints,
  Heart,
  MapPin,
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
import { FitnessQuickActions } from "@/components/dashboard/FitnessQuickActions";
import { FitnessStatCard } from "@/components/dashboard/FitnessStatCard";
import { MotivationCard } from "@/components/dashboard/MotivationCard";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { StreakCard } from "@/components/dashboard/StreakCard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

const TEAL = "hsl(174,65%,38%)";
const AQUA = "hsl(168,72%,45%)";
const ORANGE = "hsl(25,95%,55%)";
const BLUE = "hsl(215,80%,55%)";
const GREEN = "hsl(140,65%,45%)";

function formatDayLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
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

function countCurrentStreak(days: { active: boolean }[]) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index].active) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function countBestStreak(days: { active: boolean }[]) {
  let current = 0;
  let best = 0;
  for (const day of days) {
    current = day.active ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

function CircularProgress({
  caloriesPercent,
  stepsPercent,
}: {
  caloriesPercent: number;
  stepsPercent: number;
}) {
  const size = 190;
  const center = size / 2;
  const outerRadius = 72;
  const innerRadius = 56;
  const circumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const totalProgress = Math.round(
    (Math.min(caloriesPercent, 100) + Math.min(stepsPercent, 100)) / 2,
  );

  return (
    <div className="relative flex h-[190px] w-[190px] items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="rgba(148,163,184,0.18)"
          strokeWidth="12"
          fill="none"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="url(#outerGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset:
              circumference - circumference * Math.min(caloriesPercent / 100, 1),
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="rgba(148,163,184,0.16)"
          strokeWidth="12"
          fill="none"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="url(#innerGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDashoffset: innerCircumference }}
          animate={{
            strokeDashoffset:
              innerCircumference -
              innerCircumference * Math.min(stepsPercent / 100, 1),
          }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.08 }}
          strokeDasharray={innerCircumference}
        />
        <defs>
          <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Activity className="mb-2 h-5 w-5 text-primary" />
        <span className="font-display text-3xl font-bold">{totalProgress}%</span>
        <span className="text-sm text-muted-foreground">of daily goal</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading } = useGetTodaySummary();
  const { data: weekly, isLoading: loadingWeekly } = useGetWeeklySummary();

  const calories = summary?.totalCaloriesIn ?? 0;
  const calorieGoal = summary?.calorieGoal ?? 2000;
  const steps = summary?.totalSteps ?? 0;
  const stepGoal = summary?.stepGoal ?? 10000;
  const exerciseMinutes = summary?.totalExerciseMinutes ?? 0;
  const caloriesBurned = summary?.totalCaloriesBurned ?? 0;
  const todayDistanceKm = summary?.totalDistanceKm ?? 0;
  const weeklyRows = weekly ?? [];
  const stepSparkline = weeklyRows.map((day) => day.steps);
  const calorieSparkline = weeklyRows.map((day) => day.caloriesIn);
  const distanceSparkline = weeklyRows.map((day) => day.distanceKm);
  const exerciseSparkline = weeklyRows.map((day) => day.exerciseMinutes);
  const weeklyDistanceKm = weeklyRows.reduce(
    (total, day) => total + day.distanceKm,
    0,
  );
  const caloriesPercent = Math.round((calories / calorieGoal) * 100);
  const stepsPercent = Math.round((steps / stepGoal) * 100);
  const weeklyData = (weekly ?? []).map((day) => ({
    ...day,
    day: formatDayLabel(day.date),
  }));
  const hasWeeklyData = weeklyData.some(
    (day) =>
      day.caloriesIn > 0 || day.steps > 0 || day.exerciseMinutes > 0,
  );
  const streakDays = weeklyRows.map((day) => ({
    id: day.date,
    label: formatDayLabel(day.date).slice(0, 1),
    active: isActiveDay(day),
  }));
  const currentStreak = countCurrentStreak(streakDays);
  const bestStreak = countBestStreak(streakDays);

  const activityItems = [
    {
      title: "Daily Step Goal",
      subtitle:
        steps > 0
          ? `${stepsPercent}% of daily goal completed`
          : "Keep going. You're on your way.",
      value: `${steps.toLocaleString()} steps`,
      timestamp: "Today",
      color: TEAL,
      icon: Footprints,
    },
    {
      title: "Calorie Goal",
      subtitle: `${caloriesPercent}% of daily goal`,
      value: `${calories.toLocaleString()} kcal`,
      timestamp: "Today",
      color: ORANGE,
      icon: Flame,
    },
    {
      title: "Distance Tracked",
      subtitle: "Weekly total",
      value: `${weeklyDistanceKm.toFixed(1)} km`,
      timestamp: "This week",
      color: BLUE,
      icon: MapPin,
    },
    {
      title: "Exercise Goal",
      subtitle: `${Math.round((exerciseMinutes / 60) * 100)}% of daily goal`,
      value: `${exerciseMinutes} min`,
      timestamp: "Today",
      color: GREEN,
      icon: Heart,
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.32fr)_minmax(360px,0.68fr)]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="glass-card rounded-[1.75rem] p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Daily activity</h2>
            <span className="rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-medium text-muted-foreground">
              Today
            </span>
          </div>

          {isLoading ? (
            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr]">
              <Skeleton className="h-[190px] w-[190px] rounded-full" />
              <div className="space-y-5">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </div>
            </div>
          ) : (
            <div className="mt-5 grid items-center gap-6 md:grid-cols-[220px_1fr]">
              <CircularProgress
                caloriesPercent={caloriesPercent}
                stepsPercent={stepsPercent}
              />
              <div className="space-y-5">
                {[
                  {
                    label: "Calories",
                    value: calories,
                    goal: calorieGoal,
                    suffix: "kcal",
                    color: TEAL,
                  },
                  {
                    label: "Steps",
                    value: steps,
                    goal: stepGoal,
                    suffix: "",
                    color: ORANGE,
                  },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-sm font-medium">
                        {metric.label}
                      </span>
                    </div>
                    <div className="mb-2 flex items-end gap-1">
                      <span className="font-display text-2xl font-bold">
                        {metric.value.toLocaleString()}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">
                        / {metric.goal.toLocaleString()} {metric.suffix}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(
                            (metric.value / metric.goal) * 100,
                            100,
                          )}%`,
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            metric.label === "Calories"
                              ? `linear-gradient(90deg, ${AQUA}, ${TEAL})`
                              : "linear-gradient(90deg,#fb923c,#f97316)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.section>

        <MotivationCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-[1.5rem]" />
          ))
        ) : (
          <>
            <FitnessStatCard
              label="Steps"
              value={steps.toLocaleString()}
              suffix="steps"
              subtitle={`Goal: ${stepGoal.toLocaleString()}`}
              icon={Footprints}
              color={TEAL}
              sparkline={stepSparkline}
            />
            <FitnessStatCard
              label="Calories"
              value={calories.toLocaleString()}
              suffix="kcal"
              subtitle={`Burned: ${caloriesBurned.toLocaleString()} kcal`}
              icon={Flame}
              color={ORANGE}
              sparkline={calorieSparkline}
              delay={0.04}
            />
            <FitnessStatCard
              label="Distance"
              value={todayDistanceKm.toFixed(1)}
              suffix="km"
              subtitle={`Week: ${weeklyDistanceKm.toFixed(1)} km`}
              icon={MapPin}
              color={BLUE}
              sparkline={distanceSparkline}
              delay={0.08}
            />
            <FitnessStatCard
              label="Exercise"
              value={exerciseMinutes.toString()}
              suffix="min"
              subtitle="Goal: 60 min"
              icon={Heart}
              color={GREEN}
              sparkline={exerciseSparkline}
              delay={0.12}
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
        <section className="glass-card rounded-[1.5rem] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Weekly overview</h2>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-5 rounded-full bg-emerald-400" />
                  Steps
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-5 rounded-full bg-orange-400" />
                  Calories
                </span>
              </div>
            </div>
            <span className="rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-medium text-muted-foreground">
              Last 7 days
            </span>
          </div>

          <div className="mt-5 h-[285px]">
            {loadingWeekly ? (
              <Skeleton className="h-full rounded-2xl" />
            ) : hasWeeklyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={TEAL} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ORANGE} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 5" stroke="rgba(148,163,184,0.24)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.9)",
                      boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="steps"
                    name="Steps"
                    stroke={TEAL}
                    strokeWidth={2.5}
                    fill="url(#stepsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="caloriesIn"
                    name="Calories"
                    stroke={ORANGE}
                    strokeWidth={2.5}
                    fill="url(#caloriesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty className="h-full border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Activity />
                  </EmptyMedia>
                  <EmptyTitle>No data recorded yet</EmptyTitle>
                  <EmptyDescription>
                    Start tracking your activities to see weekly progress here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </section>

        <RecentActivityList items={activityItems} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
        <FitnessQuickActions />
        <StreakCard
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          days={streakDays}
        />
      </div>
    </div>
  );
}
