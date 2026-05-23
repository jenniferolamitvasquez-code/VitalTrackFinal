import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

type FitnessStatCardProps = {
  label: string;
  value: string;
  suffix?: string;
  subtitle: string;
  color: string;
  icon: LucideIcon;
  sparkline: number[];
  delay?: number;
};

export function FitnessStatCard({
  label,
  value,
  suffix,
  subtitle,
  color,
  icon: Icon,
  sparkline,
  delay = 0,
}: FitnessStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="glass-card rounded-[1.5rem] p-5 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}18`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {label}
            </p>
            <div className="mt-1 flex items-end gap-1">
              <span className="font-display text-2xl font-bold">{value}</span>
              {suffix && (
                <span className="pb-1 text-sm text-muted-foreground">
                  {suffix}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline.map((point, index) => ({ index, point }))}>
            <Line
              type="monotone"
              dataKey="point"
              stroke={color}
              strokeWidth={2.4}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

