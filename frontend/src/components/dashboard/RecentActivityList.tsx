import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type ActivityItem = {
  title: string;
  subtitle: string;
  value: string;
  timestamp: string;
  color: string;
  icon: LucideIcon;
};

type RecentActivityListProps = {
  items: ActivityItem[];
};

export function RecentActivityList({ items }: RecentActivityListProps) {
  return (
    <section className="glass-card rounded-[1.5rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Recent activities</h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 divide-y divide-border/80">
        {items.map(({ title, subtitle, value, timestamp, color, icon: Icon }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24 }}
            className="flex items-center gap-3 py-4 first:pt-1 last:pb-1"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}14`, color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">{timestamp}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

