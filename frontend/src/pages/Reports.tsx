import { FileText, Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Create exports and keep important summaries in one place."
        actions={
          <Button className="rounded-xl">
            <Plus />
            New report
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Weekly summary", value: "Ready" },
          { title: "Inventory audit", value: "Pending" },
          { title: "Engagement trend", value: "Draft" },
        ].map((item) => (
          <Card key={item.title} className="border-card-border p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{item.title}</p>
            <p className="mt-3 text-2xl font-display font-bold">
              {item.value}
            </p>
          </Card>
        ))}
      </div>

      <Empty className="min-h-[320px] border border-dashed border-border bg-card shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No saved reports yet</EmptyTitle>
          <EmptyDescription>
            Generate your first report to keep a reusable record of the latest
            business snapshot.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="rounded-xl">
            <TrendingUp />
            Generate report
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

