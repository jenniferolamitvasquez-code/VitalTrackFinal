import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone: string;
};

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  tone,
}: MetricCardProps) {
  return (
    <Card className="border-card-border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-3 text-2xl font-display font-bold">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{change}</p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${tone}1A`, color: tone }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

