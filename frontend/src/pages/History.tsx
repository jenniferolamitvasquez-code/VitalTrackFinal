import {
  getListCalorieLogsQueryKey,
  getListExercisesQueryKey,
  getListStepLogsQueryKey,
  useListCalorieLogs,
  useListExercises,
  useListStepLogs,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  firstSignedInStorageKey,
  LOCAL_AUTH_USER_KEY,
  type LocalUser,
} from "@/lib/local-auth";
import { localDateString } from "@/utils/date";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const TEAL = "hsl(174,65%,38%)";
const ORANGE = "hsl(25,95%,55%)";
const BLUE = "hsl(215,80%,55%)";
const RED = "hsl(0,80%,60%)";

type HistoryDay = {
  date: string;
  caloriesIn: number;
  caloriesBurned: number;
  calorieBalance: number;
  steps: number;
  exerciseMinutes: number;
};

function formatDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function shortDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dateKeyFromIso(value: string) {
  return localDateString(new Date(value));
}

function readCurrentUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalUser>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string"
    ) {
      return parsed as LocalUser;
    }
  } catch {
    return null;
  }

  return null;
}

function firstSignedInDate() {
  const user = readCurrentUser();
  if (!user) {
    return localDateString();
  }

  const key = firstSignedInStorageKey(user);
  const existing = localStorage.getItem(key);
  if (existing) {
    return dateKeyFromIso(existing);
  }

  const now = new Date().toISOString();
  localStorage.setItem(key, now);
  return dateKeyFromIso(now);
}

function dateRange(startDate: string, endDate: string) {
  const days: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  while (cursor <= end) {
    days.push(localDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export default function History() {
  const {
    data: calories,
    isLoading: loadingCalories,
  } = useListCalorieLogs(undefined, {
    query: { queryKey: getListCalorieLogsQueryKey() },
  });
  const {
    data: steps,
    isLoading: loadingSteps,
  } = useListStepLogs(undefined, {
    query: { queryKey: getListStepLogsQueryKey() },
  });
  const {
    data: exercises,
    isLoading: loadingExercises,
  } = useListExercises(undefined, {
    query: { queryKey: getListExercisesQueryKey() },
  });

  const isLoading = loadingCalories || loadingSteps || loadingExercises;
  const startDate = firstSignedInDate();
  const today = localDateString();
  const rows = dateRange(startDate, today).map<HistoryDay>((date) => {
    const caloriesIn = (calories ?? [])
      .filter((entry) => dateKeyFromIso(entry.loggedAt) === date)
      .reduce((total, entry) => total + entry.calories, 0);
    const stepRows = (steps ?? []).filter((entry) => entry.date === date);
    const exerciseRows = (exercises ?? []).filter(
      (entry) => dateKeyFromIso(entry.loggedAt) === date,
    );
    const stepCalories = stepRows.reduce(
      (total, entry) => total + (entry.caloriesBurned ?? 0),
      0,
    );
    const exerciseCalories = exerciseRows.reduce(
      (total, entry) => total + (entry.caloriesBurned ?? 0),
      0,
    );
    const caloriesBurned = stepCalories + exerciseCalories;

    return {
      date,
      caloriesIn,
      caloriesBurned,
      calorieBalance: caloriesIn - caloriesBurned,
      steps: stepRows.reduce((total, entry) => total + entry.steps, 0),
      exerciseMinutes: exerciseRows.reduce(
        (total, entry) => total + entry.durationMinutes,
        0,
      ),
    };
  });

  const chartData = rows.map((day) => ({
    day: shortDay(day.date),
    "Calories In": day.caloriesIn,
    "Calories Burned": day.caloriesBurned,
    Balance: day.calorieBalance,
    Steps: Math.round(day.steps / 100),
    "Ex. Min": day.exerciseMinutes,
  }));

  const totalCals = rows.reduce((total, day) => total + day.caloriesIn, 0);
  const totalBurned = rows.reduce((total, day) => total + day.caloriesBurned, 0);
  const totalSteps = rows.reduce((total, day) => total + day.steps, 0);
  const totalExMin = rows.reduce((total, day) => total + day.exerciseMinutes, 0);
  const totalBalance = totalCals - totalBurned;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Progress History
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          From your first sign-in date ({formatDay(startDate)}) through today.
        </p>
      </div>

      <div className="grid gap-3 mb-6 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Calorie Intake", value: totalCals.toLocaleString(), unit: "kcal", color: ORANGE },
          { label: "Calories Burned", value: Math.round(totalBurned).toLocaleString(), unit: "kcal", color: TEAL },
          { label: "Calorie Balance", value: Math.round(totalBalance).toLocaleString(), unit: "kcal", color: totalBalance >= 0 ? ORANGE : TEAL },
          { label: "Total Steps", value: totalSteps.toLocaleString(), unit: "steps", color: BLUE },
          { label: "Exercise Time", value: totalExMin.toLocaleString(), unit: "min", color: RED },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-card-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className="text-xl font-display font-bold" style={{ color: stat.color }}>
              {isLoading ? "..." : stat.value}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {stat.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-2xl mb-6" />
      ) : (
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Calories In</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Burned</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Balance</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Steps</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Ex. Min</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((day) => {
                  const isToday = day.date === today;
                  const hasData =
                    day.caloriesIn > 0 ||
                    day.caloriesBurned > 0 ||
                    day.steps > 0 ||
                    day.exerciseMinutes > 0;

                  return (
                    <tr
                      key={day.date}
                      data-testid={`history-row-${day.date}`}
                      className={isToday ? "bg-accent/40" : "hover:bg-secondary/20 transition-colors"}
                    >
                      <td className="px-5 py-3 font-medium text-foreground">
                        {formatDay(day.date)}
                        {isToday && <span className="ml-2 text-xs bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded-full">Today</span>}
                        {!hasData && <span className="ml-2 text-xs bg-secondary text-muted-foreground font-semibold px-1.5 py-0.5 rounded-full">No data</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: ORANGE }}>{day.caloriesIn.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: TEAL }}>{Math.round(day.caloriesBurned).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: day.calorieBalance >= 0 ? ORANGE : TEAL }}>{Math.round(day.calorieBalance).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: BLUE }}>{day.steps.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-foreground font-medium">{day.exerciseMinutes.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-card-border p-5 mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Calorie Balance
        </h2>
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(185,20%,88%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(210,15%,45%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(210,15%,45%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(185,20%,88%)", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Calories In" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Calories Burned" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Balance" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-card-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Steps & Exercise (steps divided by 100)
        </h2>
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(185,20%,88%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(210,15%,45%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(210,15%,45%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(185,20%,88%)", fontSize: "12px" }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="Steps" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Ex. Min" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
