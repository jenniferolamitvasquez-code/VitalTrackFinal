import { Link } from "wouter";
import { Activity, Flame, Footprints, Dumbbell, BarChart3 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  { icon: Flame, label: "Nutrition", desc: "Log meals and track macros", color: "hsl(25,95%,55%)" },
  { icon: Footprints, label: "Steps", desc: "Monitor daily activity", color: "hsl(174,65%,38%)" },
  { icon: Dumbbell, label: "Workouts", desc: "Record every exercise", color: "hsl(215,80%,55%)" },
  { icon: BarChart3, label: "Progress", desc: "Weekly insights & charts", color: "hsl(140,65%,45%)" },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "linear-gradient(160deg, hsl(174,60%,22%) 0%, hsl(174,65%,32%) 50%, hsl(185,30%,93%) 100%)" }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">VitalTrack</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-white/80 text-sm font-medium hover:text-white transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/sign-up" className="bg-white text-[hsl(174,60%,22%)] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="max-w-lg">
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mb-4 leading-tight">
            Track your health,<br />transform your life
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Log calories, steps, and workouts in one place. See weekly insights and stay on top of your goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up" className="bg-white text-[hsl(174,60%,22%)] font-bold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-colors text-base">
              Create free account
            </Link>
            <Link href="/sign-in" className="border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-base">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-6 pb-16 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {features.map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}30` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <p className="text-white font-semibold text-sm">{label}</p>
              <p className="text-white/55 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
