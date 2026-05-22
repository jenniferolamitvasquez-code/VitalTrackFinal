import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

type FeatureMetric = {
  label: string;
  value: string;
};

type FeaturePageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  metrics: FeatureMetric[];
};

export function FeaturePage({
  title,
  description,
  icon: Icon,
  metrics,
}: FeaturePageProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#063b42_0%,#0f766e_100%)] p-6 text-white shadow-[0_20px_45px_rgba(2,24,31,0.2)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">
              {description}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
          >
            <Card className="glass-card rounded-[1.5rem] border-white/80 p-5 shadow-none">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-3 font-display text-3xl font-bold">
                {metric.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

