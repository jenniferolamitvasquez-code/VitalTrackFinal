import { useGetWeeklySummary } from "@workspace/api-client-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Flame, Footprints, Timer } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TEAL = "hsl(174,65%,38%)";
const ORANGE = "hsl(25,95%,55%)";
const BLUE = "hsl(215,80%,55%)";

function formatDayLabel(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export default function Analytics() {
  const { data, isLoading } = useGetWeeklySummary();
  const rows = data ?? [];
  const calories = rows.reduce((total, row) => total + row.caloriesIn, 0);
  const steps = rows.reduce((total, row) => total + row.steps, 0);
  const exercise = rows.reduce(
    (total, row) => total + row.exerciseMinutes,
    0,
  );
  const activeDays = rows.filter(
    (row) =>
      row.caloriesIn > 0 ||
      row.caloriesBurned > 0 ||
      row.steps > 0 ||
      row.exerciseMinutes > 0,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Monitor weekly trends and compare key activity signals."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))
        ) : (
          <>
            <MetricCard
              title="Weekly calories"
              value={calories.toLocaleString()}
              change="Total consumed"
              icon={Flame}
              tone={ORANGE}
            />
            <MetricCard
              title="Weekly steps"
              value={steps.toLocaleString()}
              change="Across 7 days"
              icon={Footprints}
              tone={TEAL}
            />
            <MetricCard
              title="Exercise time"
              value={`${exercise} min`}
              change="Total activity"
              icon={Timer}
              tone={BLUE}
            />
            <MetricCard
              title="Active days"
              value={`${activeDays}/7`}
              change="Days with logged data"
              icon={BarChart3}
              tone={TEAL}
            />
          </>
        )}
      </div>

      <Card className="border-card-border p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Performance trend</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Calories and exercise minutes by day
        </p>
        <div className="mt-5">
          {isLoading ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={rows.map((row) => ({
                  ...row,
                  day: formatDayLabel(row.date),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(185,20%,88%)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="caloriesIn"
                  stroke={TEAL}
                  fill={TEAL}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="exerciseMinutes"
                  stroke={ORANGE}
                  fill={ORANGE}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
