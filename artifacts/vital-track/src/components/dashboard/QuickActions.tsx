import { Link } from "wouter";
import { FilePlus2, PackagePlus, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

const actions = [
  { label: "New report", href: "/reports", icon: FilePlus2 },
  { label: "Add inventory", href: "/inventory", icon: PackagePlus },
  { label: "Update profile", href: "/profile", icon: UserPlus },
];

export function QuickActions() {
  return (
    <Card className="border-card-border p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
      <div className="mt-4 grid gap-3">
        {actions.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

