import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export const themeOptions = [
  {
    id: "teal",
    label: "Teal",
    primary: "174 65% 38%",
    accent: "174 55% 90%",
    accentForeground: "174 65% 28%",
  },
  {
    id: "indigo",
    label: "Indigo",
    primary: "231 76% 59%",
    accent: "231 86% 94%",
    accentForeground: "231 65% 42%",
  },
  {
    id: "emerald",
    label: "Emerald",
    primary: "151 63% 39%",
    accent: "151 58% 91%",
    accentForeground: "151 62% 28%",
  },
  {
    id: "rose",
    label: "Rose",
    primary: "346 77% 56%",
    accent: "346 88% 94%",
    accentForeground: "346 70% 38%",
  },
] as const;

type ThemeId = (typeof themeOptions)[number]["id"];
type FontSize = "compact" | "comfortable" | "large";
type Visibility = "public" | "private";
type DistanceUnit = "km" | "mi";
type WeekStart = "monday" | "sunday";

type Preferences = {
  darkMode: boolean;
  themeColor: ThemeId;
  fontSize: FontSize;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundAlerts: boolean;
  twoFactorEnabled: boolean;
  profileVisibility: Visibility;
  activityVisible: boolean;
  dataSharing: boolean;
  language: string;
  timezone: string;
  autoRefreshEnabled: boolean;
  autoRefreshSeconds: number;
  distanceUnit: DistanceUnit;
  weekStartsOn: WeekStart;
};

type PreferencesContextValue = Preferences & {
  updatePreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
};

const STORAGE_KEY = "vital-track-preferences";

const defaultPreferences: Preferences = {
  darkMode: false,
  themeColor: "teal",
  fontSize: "comfortable",
  emailNotifications: true,
  pushNotifications: true,
  soundAlerts: false,
  twoFactorEnabled: false,
  profileVisibility: "private",
  activityVisible: true,
  dataSharing: false,
  language: "en",
  timezone: "Asia/Shanghai",
  autoRefreshEnabled: true,
  autoRefreshSeconds: 15,
  distanceUnit: "km",
  weekStartsOn: "monday",
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): Preferences {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return defaultPreferences;
  }

  try {
    return {
      ...defaultPreferences,
      ...(JSON.parse(storedValue) as Partial<Preferences>),
    };
  } catch {
    return defaultPreferences;
  }
}

function getFontScale(fontSize: FontSize) {
  switch (fontSize) {
    case "compact":
      return "14px";
    case "large":
      return "17px";
    case "comfortable":
    default:
      return "16px";
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    loadPreferences(),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

    const root = document.documentElement;
    const theme =
      themeOptions.find((option) => option.id === preferences.themeColor) ??
      themeOptions[0];

    root.classList.toggle("dark", preferences.darkMode);
    root.style.fontSize = getFontScale(preferences.fontSize);
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty("--ring", theme.primary);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-foreground", theme.accentForeground);
  }, [preferences]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...preferences,
      updatePreference: (key, value) => {
        setPreferences((current) => ({
          ...current,
          [key]: value,
        }));
      },
    }),
    [preferences],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);

  if (!value) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }

  return value;
}
