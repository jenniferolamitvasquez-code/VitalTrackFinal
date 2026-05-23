import {
  BarChart3,
  CircleHelp,
  Dumbbell,
  Footprints,
  HeartPulse,
  LayoutDashboard,
  MoonStar,
  Settings,
  Target,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";

export const primaryNavigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/exercises", label: "Workout", icon: Dumbbell },
  { href: "/calories", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/steps", label: "Steps", icon: Footprints },
  { href: "/history", label: "Progress", icon: BarChart3 },
] as const;

export const secondaryNavigationItems = [
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/sleep", label: "Sleep", icon: MoonStar },
  { href: "/heart-rate", label: "Heart Rate", icon: HeartPulse },
] as const;

export const supportNavigationItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Help & Support", icon: CircleHelp },
] as const;

