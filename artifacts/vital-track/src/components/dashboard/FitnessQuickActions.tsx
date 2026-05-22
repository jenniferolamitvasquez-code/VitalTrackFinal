import { motion } from "framer-motion";
import {
  Dumbbell,
  Footprints,
  Scale,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "wouter";

const actions = [
  {
    label: "Start Workout",
    href: "/exercises",
    icon: Dumbbell,
    color: "hsl(174,65%,38%)",
  },
  {
    label: "Log Nutrition",
    href: "/calories",
    icon: UtensilsCrossed,
    color: "hsl(25,95%,55%)",
  },
  {
    label: "Add Steps",
    href: "/steps",
    icon: Footprints,
    color: "hsl(215,80%,55%)",
  },
  {
    label: "Log Weight",
    href: "/history",
    icon: Scale,
    color: "hsl(265,72%,62%)",
  },
  {
    label: "Set Goal",
    href: "/goals",
    icon: Target,
    color: "hsl(140,65%,45%)",
  },
] as const;

export function FitnessQuickActions() {
  return (
    <section className="glass-card rounded-[1.5rem] p-5">
      <h2 className="text-sm font-semibold">Quick actions</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {actions.map(({ label, href, icon: Icon, color }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
            whileHover={{ y: -3 }}
          >
            <Link
              href={href}
              className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-white/80 bg-white/60 px-3 text-center text-xs font-medium shadow-sm transition hover:border-primary/25 hover:bg-white"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${color}18`, color }}
              >
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
