import { Boxes, PackageCheck, PackageX, Plus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const inventoryRows = [
  { item: "Heart-rate sensors", stock: 42, status: "Healthy" },
  { item: "Smart scales", stock: 18, status: "Healthy" },
  { item: "Fitness bands", stock: 6, status: "Low" },
  { item: "Charging docks", stock: 0, status: "Out" },
];

export default function Inventory() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track devices, stock levels, and replenishment needs."
        actions={
          <Button className="rounded-xl">
            <Plus />
            Add item
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total items"
          value="66"
          change="Across 4 categories"
          icon={Boxes}
          tone="hsl(174,65%,38%)"
        />
        <MetricCard
          title="Ready to ship"
          value="60"
          change="In stock"
          icon={PackageCheck}
          tone="hsl(140,65%,45%)"
        />
        <MetricCard
          title="Needs attention"
          value="2"
          change="Low or out of stock"
          icon={PackageX}
          tone="hsl(0,84%,60%)"
        />
      </div>

      <Card className="overflow-hidden border-card-border shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Stock overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-muted/70 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((row) => (
                <tr key={row.item} className="border-t border-border">
                  <td className="px-5 py-4 font-medium">{row.item}</td>
                  <td className="px-5 py-4">{row.stock}</td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        row.status === "Healthy"
                          ? "secondary"
                          : row.status === "Low"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

