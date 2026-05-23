import { useState } from "react";
import { Crown, Bell, ChevronDown, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useCurrentTime } from "@/hooks/use-current-time";

type TopNavbarProps = {
  userName: string;
  userEmail?: string;
  userInitial: string;
  onOpenMobileSidebar: () => void;
  onSignOut?: () => void;
};

const initialNotifications: Array<{ title: string; description: string }> = [];

function firstDisplayName(name: string, email?: string) {
  const cleanName = name.trim();

  if (cleanName) {
    if (cleanName.toLowerCase().includes("jennifer")) {
      return "Jennifer";
    }

    return cleanName.split(/\s+/)[0];
  }

  const localPart = email?.split("@")[0] ?? "";

  if (localPart.toLowerCase().includes("jennifer")) {
    return "Jennifer";
  }

  return localPart || "Athlete";
}

export function TopNavbar({
  userName,
  userEmail,
  userInitial,
  onOpenMobileSidebar,
  onSignOut,
}: TopNavbarProps) {
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(initialNotifications);
  const now = useCurrentTime();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const firstName = firstDisplayName(userName, userEmail);

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-background/82 backdrop-blur-xl">
      <div className="flex min-h-[5.25rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-2xl lg:hidden"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>

        <div className="hidden min-w-[220px] lg:block">
          <h1 className="font-display text-xl font-bold">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today} | <span className="tabular-nums">{time}</span>
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 sm:inline-flex">
            <Crown className="h-3.5 w-3.5" />
            Premium
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-full bg-white/70 shadow-sm hover:bg-white"
                aria-label="Open notifications"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0">
                  Notifications
                </DropdownMenuLabel>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary"
                    onClick={() => setNotifications([])}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.title}
                    className="flex-col items-start gap-1 rounded-xl px-3 py-2"
                  >
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {notification.description}
                    </span>
                  </DropdownMenuItem>
                ))
              ) : (
                <Empty className="border-0 px-4 py-8">
                  <EmptyHeader>
                    <EmptyTitle className="text-base">No notifications</EmptyTitle>
                    <EmptyDescription>
                      New fitness reminders will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-12 max-w-[220px] gap-2 rounded-2xl bg-white/60 px-2 pr-3 shadow-sm hover:bg-white"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-[8rem] truncate text-sm font-medium">
                    {firstName}
                  </span>
                  <span className="block text-xs font-medium text-emerald-600">
                    Premium
                  </span>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuLabel>
                <span className="block truncate">{userName}</span>
                {userEmail && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {userEmail}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <UserRound />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>
              {onSignOut && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-t border-white/60 px-4 py-3 lg:hidden">
        <p className="font-display text-lg font-bold">
          {greeting}, {firstName}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {today} | <span className="tabular-nums">{time}</span>
        </p>
      </div>
    </header>
  );
}
