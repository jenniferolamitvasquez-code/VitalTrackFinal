import { motion } from "framer-motion";
import { Crown, HeartPulse, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  primaryNavigationItems,
  secondaryNavigationItems,
  supportNavigationItems,
} from "@/utils/navigation";

type AppSidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
  onSignOut?: () => void;
  className?: string;
};

function SidebarGroup({
  items,
  collapsed,
  location,
  onNavigate,
}: {
  items: readonly {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
  collapsed: boolean;
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = location === href;

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "group relative flex min-h-11 items-center rounded-2xl px-3 text-sm font-medium transition-all duration-200",
              collapsed ? "justify-center" : "gap-3",
              active
                ? "bg-white/14 text-white shadow-[0_0_24px_rgba(45,212,191,0.28)]"
                : "text-white/68 hover:bg-white/10 hover:text-white",
            )}
          >
            {active && (
              <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
            )}
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function AppSidebar({
  collapsed = false,
  onNavigate,
  onSignOut,
  className,
}: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#063b42_0%,#032d35_48%,#02252c_100%)] text-white shadow-[18px_0_50px_rgba(1,25,31,0.14)]",
        collapsed ? "w-24" : "w-64",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-3")}>
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <span className="absolute inset-0 rounded-2xl bg-emerald-300/20 blur-md" />
          <HeartPulse className="relative h-5 w-5 text-emerald-200" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display text-xl font-bold">
              Vital<span className="text-emerald-300">Track</span>
            </p>
            <p className="text-xs text-white/45">Premium fitness</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <SidebarGroup
          items={primaryNavigationItems}
          collapsed={collapsed}
          location={location}
          onNavigate={onNavigate}
        />

        <div className="my-5 h-px bg-white/10" />

        <SidebarGroup
          items={secondaryNavigationItems}
          collapsed={collapsed}
          location={location}
          onNavigate={onNavigate}
        />
      </div>

      <div className="space-y-4 border-t border-white/10 p-4">
        <SidebarGroup
          items={supportNavigationItems}
          collapsed={collapsed}
          location={location}
          onNavigate={onNavigate}
        />

        {!collapsed && (
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-3xl border border-white/10 bg-white/8 p-4 shadow-[0_18px_35px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Crown className="h-4 w-4 text-amber-300" />
              Go Premium
            </div>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Unlock exclusive plans, deeper recovery insights, and custom goals.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900 transition hover:bg-emerald-100"
            >
              Upgrade now
            </button>
          </motion.div>
        )}

        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "flex min-h-11 w-full items-center rounded-2xl px-3 text-sm font-medium text-white/68 transition hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

