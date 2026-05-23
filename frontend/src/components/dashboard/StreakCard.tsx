import { Flame } from "lucide-react";

type StreakDay = {
  id: string;
  label: string;
  active: boolean;
};

type StreakCardProps = {
  currentStreak: number;
  bestStreak: number;
  days: StreakDay[];
};

export function StreakCard({
  currentStreak,
  bestStreak,
  days,
}: StreakCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#08353a_0%,#05282f_100%)] p-5 text-white shadow-[0_20px_45px_rgba(2,24,31,0.22)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Flame className="h-4 w-4 text-orange-300" />
            Current streak
          </div>
          <p className="mt-2 font-display text-3xl font-bold">
            {currentStreak} {currentStreak === 1 ? "Day" : "Days"}
          </p>
          <p className="mt-1 text-sm text-white/55">
            Best this week: {bestStreak} {bestStreak === 1 ? "Day" : "Days"}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {days.map((day) => (
            <div key={day.id} className="text-center">
              <p className="mb-2 text-xs text-white/70">{day.label}</p>
              <span
                className={
                  day.active
                    ? "block h-5 w-5 rounded-full border border-orange-200/70 bg-orange-300"
                    : "block h-5 w-5 rounded-full border border-white/18 bg-white/6"
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
