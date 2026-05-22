import { useEffect, useMemo, useState } from "react";
import { Activity, Cake, Mail, MapPin, Pencil, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RecentActivityList } from "@/components/dashboard/RecentActivityList";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  LOCAL_AUTH_TOKEN_KEY,
  LOCAL_AUTH_USER_KEY,
  type LocalUser,
} from "@/lib/local-auth";
import { apiUrl } from "@/lib/api-url";
import { uploadAsset } from "@/lib/uploads";
import { defaultProfile, recentActivities } from "@/utils/profile";

type ProfileForm = typeof defaultProfile;

const PROFILE_STORAGE_PREFIX = "vital-track-profile:";
const LOCAL_AUTH_ACCOUNTS_KEY = "vital-track-local-accounts";

function profileFromUser(user: LocalUser | null): ProfileForm {
  return {
    ...defaultProfile,
    fullName: user?.name ?? "",
    email: user?.email ?? "",
    role: "Premium",
  };
}

function readStoredUser(): LocalUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalUser>;
    if (
      typeof parsed.id === "string" &&
      typeof parsed.name === "string" &&
      typeof parsed.email === "string"
    ) {
      return parsed as LocalUser;
    }
  } catch {
    return null;
  }

  return null;
}

function storageKeyFor(user: LocalUser | null) {
  return `${PROFILE_STORAGE_PREFIX}${user?.id ?? user?.email ?? "anonymous"}`;
}

function loadProfile(user: LocalUser | null): ProfileForm {
  const baseProfile = profileFromUser(user);

  if (typeof window === "undefined") {
    return baseProfile;
  }

  try {
    const raw = window.localStorage.getItem(storageKeyFor(user));
    if (!raw) {
      return baseProfile;
    }

    const stored = JSON.parse(raw) as Partial<ProfileForm>;
    const legacyDemoProfile =
      stored.fullName === "Alex Morgan" ||
      stored.email === "alex.morgan@example.com";

    if (legacyDemoProfile) {
      return baseProfile;
    }

    return {
      ...baseProfile,
      ...stored,
    };
  } catch {
    return baseProfile;
  }
}

function saveProfile(user: LocalUser | null, profile: ProfileForm) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeyFor(user), JSON.stringify(profile));
}

function saveAuthUser(user: LocalUser | null, profile: ProfileForm) {
  if (!user || typeof window === "undefined") {
    return user;
  }

  const nextUser = {
    ...user,
    name: profile.fullName.trim() || user.name,
    email: profile.email.trim() || user.email,
  };

  window.localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(nextUser));

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_ACCOUNTS_KEY);
    const accounts = raw ? JSON.parse(raw) as Array<LocalUser & { password?: string }> : [];
    const updatedAccounts = accounts.map((account) =>
      account.id === user.id || account.email === user.email
        ? { ...account, name: nextUser.name, email: nextUser.email }
        : account,
    );
    window.localStorage.setItem(LOCAL_AUTH_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
  } catch {
    // Profile still saves even if legacy account data cannot be parsed.
  }

  window.dispatchEvent(new Event("vital-track-user-updated"));
  return nextUser;
}

function displayValue(value: string) {
  return value.trim() || "Not set";
}

export default function Profile() {
  const [authUser, setAuthUser] = useState<LocalUser | null>(() =>
    readStoredUser(),
  );
  const [profile, setProfile] = useState<ProfileForm>(() =>
    loadProfile(readStoredUser()),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);
    if (!token || token.startsWith("local:")) {
      return;
    }

    void fetch(apiUrl("/api/auth/me"), {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load current user.");
        }

        return response.json() as Promise<{ user: LocalUser }>;
      })
      .then(({ user }) => {
        localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(user));
        setAuthUser(user);
        setProfile(loadProfile(user));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarUrl) {
        URL.revokeObjectURL(avatarUrl);
      }
    };
  }, [avatarUrl]);

  const initials = useMemo(
    () => {
      const source = profile.fullName || profile.email || "U";

      return source
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    },
    [profile.email, profile.fullName],
  );

  const completion = useMemo(() => {
    const fields = [
      profile.fullName,
      profile.email,
      profile.phone,
      profile.address,
      profile.birthday,
      profile.bio,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  function updateProfile<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleAvatarChange(file: File | null) {
    if (avatarUrl) {
      URL.revokeObjectURL(avatarUrl);
    }

    if (!file) {
      setAvatarUrl(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setIsUploadingAvatar(true);

    try {
      const asset = await uploadAsset(file, "avatars");
      URL.revokeObjectURL(previewUrl);
      setAvatarUrl(asset.secureUrl);
      toast({
        title: "Profile photo uploaded",
        description: "The image is now stored in Cloudinary.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unable to upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal details and security preferences."
        actions={
          <Button
            className="rounded-xl"
            onClick={() => {
              if (isEditing) {
                saveProfile(authUser, profile);
                const nextUser = saveAuthUser(authUser, profile);
                if (nextUser) {
                  setAuthUser(nextUser);
                }
                toast({ title: "Profile saved" });
              }
              setIsEditing((value) => !value);
            }}
          >
            <Pencil />
            {isEditing ? "Save profile" : "Edit profile"}
          </Button>
        }
      />

      <Card className="overflow-hidden border-card-border shadow-sm">
        <div className="h-36 bg-[linear-gradient(135deg,hsl(231,76%,59%),hsl(174,65%,38%))]" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <ProfileAvatarUploader
                previewUrl={avatarUrl}
                initials={initials}
                onChange={(file) => void handleAvatarChange(file)}
              />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-display font-bold">
                    {displayValue(profile.fullName)}
                  </h2>
                  <Badge>{profile.role}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayValue(profile.email)}
                </p>
                {isUploadingAvatar && (
                  <p className="mt-1 text-xs font-medium text-primary">
                    Uploading profile photo...
                  </p>
                )}
              </div>
            </div>
            <div className="min-w-[220px]">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Profile completion</span>
                <span className="font-medium">{completion}%</span>
              </div>
              <Progress value={completion} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <Card className="border-card-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Personal information</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={profile.fullName}
                  disabled={!isEditing}
                  placeholder="Enter your name"
                  onChange={(event) =>
                    updateProfile("fullName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  disabled={!isEditing}
                  placeholder="Enter your email"
                  onChange={(event) =>
                    updateProfile("email", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Phone number</Label>
                <Input
                  id="profile-phone"
                  value={profile.phone}
                  disabled={!isEditing}
                  placeholder="Enter phone number"
                  onChange={(event) =>
                    updateProfile("phone", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-birthday">Birthday</Label>
                <Input
                  id="profile-birthday"
                  type="date"
                  value={profile.birthday}
                  disabled={!isEditing}
                  onChange={(event) =>
                    updateProfile("birthday", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-address">Address</Label>
                <Input
                  id="profile-address"
                  value={profile.address}
                  disabled={!isEditing}
                  placeholder="Enter address"
                  onChange={(event) =>
                    updateProfile("address", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-bio">Bio / About me</Label>
                <Textarea
                  id="profile-bio"
                  value={profile.bio}
                  disabled={!isEditing}
                  placeholder="Tell something about yourself"
                  className="min-h-28"
                  onChange={(event) => updateProfile("bio", event.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card className="border-card-border p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Change password</h3>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input id="confirm-password" type="password" />
              </div>
            </div>
            <Button variant="outline" className="mt-4 rounded-xl">
              Update password
            </Button>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-card-border p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Contact summary</h3>
            <div className="mt-4 space-y-4 text-sm">
              {[
                { icon: Mail, label: displayValue(profile.email) },
                { icon: Phone, label: displayValue(profile.phone) },
                { icon: MapPin, label: displayValue(profile.address) },
                {
                  icon: Cake,
                  label: profile.birthday
                    ? new Date(`${profile.birthday}T12:00:00`).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "Not set",
                },
              ].map(({ icon: Icon, label }, index) => (
                <div key={`${label}-${index}`} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Card>

          <RecentActivityList
            items={recentActivities.map((item) => ({
              title: item.title,
              subtitle: item.description,
              value: "Done",
              timestamp: item.time,
              color: "hsl(174,65%,38%)",
              icon: Activity,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
