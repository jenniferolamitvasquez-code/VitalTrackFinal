import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Download,
  Globe2,
  Lock,
  Palette,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Volume2,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  themeOptions,
  usePreferences,
} from "@/context/preferences-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SettingRowProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const sessions = [
  { id: "current", device: "Windows - Chrome", location: "Manila", current: true },
  { id: "mobile", device: "iPhone - Safari", location: "Quezon City", current: false },
  { id: "tablet", device: "iPad - Safari", location: "Cebu", current: false },
];

export default function Settings() {
  const preferences = usePreferences();
  const [activeSessions, setActiveSessions] = useState(sessions);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const { toast } = useToast();

  const deviceSummary = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "Unknown device";
    }

    const platform = navigator.platform || "Current device";
    const browser = navigator.userAgent.includes("Edg")
      ? "Edge"
      : navigator.userAgent.includes("Chrome")
        ? "Chrome"
        : navigator.userAgent.includes("Firefox")
          ? "Firefox"
          : navigator.userAgent.includes("Safari")
            ? "Safari"
            : "Browser";

    return `${platform} - ${browser}`;
  }, []);

  useEffect(() => {
    function updateOnlineStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  function exportPreferences() {
    const blob = new Blob([JSON.stringify(preferences, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vital-track-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      toast({
        title: "Notifications unsupported",
        description: "This browser does not expose notification permissions.",
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    preferences.updatePreference("pushNotifications", permission === "granted");
    toast({
      title:
        permission === "granted"
          ? "Push notifications enabled"
          : "Push notifications unavailable",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Control appearance, notifications, privacy, and system preferences."
      />

      <Tabs defaultValue="appearance" className="space-y-5">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-card p-1">
          <TabsTrigger value="appearance">
            <Palette />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock />
            Security
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <ShieldCheck />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="system">
            <Globe2 />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card className="border-card-border p-5 shadow-sm">
            <SettingRow
              title="Dark mode"
              description="Switch between light and dark interface themes."
            >
              <Switch
                checked={preferences.darkMode}
                onCheckedChange={(checked) =>
                  preferences.updatePreference("darkMode", checked)
                }
              />
            </SettingRow>

            <div className="border-b border-border py-4">
              <p className="text-sm font-medium">Theme color</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the accent color used across the dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                      preferences.themeColor === option.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/40",
                    )}
                    onClick={() =>
                      preferences.updatePreference("themeColor", option.id)
                    }
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: `hsl(${option.primary})` }}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <SettingRow
              title="Font size"
              description="Adjust interface density for your reading comfort."
            >
              <Select
                value={preferences.fontSize}
                onValueChange={(value: "compact" | "comfortable" | "large") =>
                  preferences.updatePreference("fontSize", value)
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Choose size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-card-border p-5 shadow-sm">
            <SettingRow
              title="Email notifications"
              description="Receive important updates in your inbox."
            >
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  preferences.updatePreference("emailNotifications", checked)
                }
              />
            </SettingRow>
            <SettingRow
              title="Push notifications"
              description={`Show real-time alerts in the browser. Permission: ${notificationPermission}.`}
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) =>
                    preferences.updatePreference("pushNotifications", checked)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={requestNotifications}
                >
                  Allow
                </Button>
              </div>
            </SettingRow>
            <SettingRow
              title="Sound alerts"
              description="Play a sound for urgent notifications."
            >
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={preferences.soundAlerts}
                  onCheckedChange={(checked) =>
                    preferences.updatePreference("soundAlerts", checked)
                  }
                />
              </div>
            </SettingRow>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
            <Card className="border-card-border p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Change password</h2>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="settings-current-password">
                    Current password
                  </Label>
                  <Input id="settings-current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-new-password">New password</Label>
                  <Input id="settings-new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-confirm-password">
                    Confirm password
                  </Label>
                  <Input id="settings-confirm-password" type="password" />
                </div>
                <Button className="rounded-xl">Update password</Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="border-card-border p-5 shadow-sm">
                <SettingRow
                  title="Two-factor authentication"
                  description="Add an extra layer of account protection."
                >
                  <Switch
                    checked={preferences.twoFactorEnabled}
                    onCheckedChange={(checked) =>
                      preferences.updatePreference("twoFactorEnabled", checked)
                    }
                  />
                </SettingRow>
              </Card>

              <Card className="border-card-border p-5 shadow-sm">
                <h2 className="text-sm font-semibold">Login sessions</h2>
                <div className="mt-4 space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{session.device}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.location}
                          {session.current ? " - Current session" : ""}
                        </p>
                      </div>
                      {!session.current && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActiveSessions((current) =>
                              current.filter((item) => item.id !== session.id),
                            )
                          }
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-card-border p-5 shadow-sm">
            <SettingRow
              title="Profile visibility"
              description="Choose whether your profile is public or private."
            >
              <Select
                value={preferences.profileVisibility}
                onValueChange={(value: "public" | "private") =>
                  preferences.updatePreference("profileVisibility", value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Activity visibility"
              description="Allow teammates to see your recent activity."
            >
              <Switch
                checked={preferences.activityVisible}
                onCheckedChange={(checked) =>
                  preferences.updatePreference("activityVisible", checked)
                }
              />
            </SettingRow>
            <SettingRow
              title="Data sharing"
              description="Permit anonymized product analytics."
            >
              <Switch
                checked={preferences.dataSharing}
                onCheckedChange={(checked) =>
                  preferences.updatePreference("dataSharing", checked)
                }
              />
            </SettingRow>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <Card className="border-card-border p-5 shadow-sm">
            <SettingRow
              title="Language"
              description="Choose the dashboard language."
            >
              <Select
                value={preferences.language}
                onValueChange={(value) =>
                  preferences.updatePreference("language", value)
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fil">Filipino</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Timezone"
              description="Used for reports, live challenges, and time-based activity."
            >
              <Select
                value={preferences.timezone}
                onValueChange={(value) =>
                  preferences.updatePreference("timezone", value)
                }
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                  <SelectItem value="Asia/Manila">Asia/Manila</SelectItem>
                  <SelectItem value="America/New_York">
                    America/New_York
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Auto-refresh live data"
              description="Keep dashboard and challenge metrics updated from the API."
            >
              <Switch
                checked={preferences.autoRefreshEnabled}
                onCheckedChange={(checked) =>
                  preferences.updatePreference("autoRefreshEnabled", checked)
                }
              />
            </SettingRow>
            <SettingRow
              title="Refresh interval"
              description="Choose how often live summaries sync while the app is open."
            >
              <Select
                value={String(preferences.autoRefreshSeconds)}
                onValueChange={(value) =>
                  preferences.updatePreference("autoRefreshSeconds", Number(value))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Distance unit"
              description="Use your preferred unit for challenges and distance summaries."
            >
              <Select
                value={preferences.distanceUnit}
                onValueChange={(value: "km" | "mi") =>
                  preferences.updatePreference("distanceUnit", value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilometers</SelectItem>
                  <SelectItem value="mi">Miles</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Week starts on"
              description="Align weekly reports and challenge planning with your routine."
            >
              <Select
                value={preferences.weekStartsOn}
                onValueChange={(value: "monday" | "sunday") =>
                  preferences.updatePreference("weekStartsOn", value)
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              title="Backup / export data"
              description="Download your current settings as JSON."
            >
              <Button variant="outline" onClick={exportPreferences}>
                <Download />
                Export data
              </Button>
            </SettingRow>
          </Card>

          <div className="space-y-6">
            <Card className="border-card-border p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Live system status</h2>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Connection",
                    value: isOnline ? "Online" : "Offline",
                    detail: isOnline ? "API sync can run" : "Data will refresh when online",
                    icon: Wifi,
                    ok: isOnline,
                  },
                  {
                    label: "Current device",
                    value: deviceSummary,
                    detail: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    icon: Smartphone,
                    ok: true,
                  },
                  {
                    label: "Live refresh",
                    value: preferences.autoRefreshEnabled ? "Enabled" : "Manual",
                    detail: preferences.autoRefreshEnabled
                      ? `Every ${preferences.autoRefreshSeconds} seconds`
                      : "Use sync buttons to refresh",
                    icon: RefreshCw,
                    ok: preferences.autoRefreshEnabled,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        item.ok
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="truncate text-sm font-semibold">{item.value}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
