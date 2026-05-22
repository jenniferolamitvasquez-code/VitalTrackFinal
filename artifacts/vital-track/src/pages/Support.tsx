import { useEffect, useState } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LOCAL_AUTH_USER_KEY, type LocalUser } from "@/lib/local-auth";

const FAQS = [
  {
    id: 1,
    question: "How many calories should I eat per day?",
    answer:
      "It depends on your age, weight, height, gender, and activity level. Vital Tracker helps estimate your daily calorie needs based on your goals like weight loss, maintenance, or muscle gain.",
  },
  {
    id: 2,
    question: "What is the best exercise for beginners?",
    answer:
      "Walking, light jogging, cycling, stretching, and bodyweight exercises are great for beginners. Start slowly and stay consistent.",
  },
  {
    id: 3,
    question: "How often should I exercise?",
    answer:
      "At least 3-5 times a week is recommended. Even 30 minutes of daily movement can improve your health.",
  },
  {
    id: 4,
    question: "Can I lose weight without going to the gym?",
    answer:
      "Yes. Home workouts, walking, jogging, dancing, and proper diet can help you lose weight effectively.",
  },
  {
    id: 5,
    question: "What foods should I avoid for weight loss?",
    answer:
      "Try to limit sugary drinks, junk food, excessive fast food, and overly processed snacks. Focus more on balanced meals and water intake.",
  },
  {
    id: 6,
    question: "Is drinking more water important during exercise?",
    answer:
      "Yes. Water helps regulate body temperature, improves performance, and prevents dehydration.",
  },
  {
    id: 7,
    question: "How many steps should I walk daily?",
    answer:
      "A common goal is 8,000-10,000 steps daily, but even smaller increases in activity are beneficial.",
  },
  {
    id: 8,
    question: "Why am I not losing weight even if I exercise?",
    answer:
      "Weight loss also depends on diet, sleep, stress, consistency, and calorie intake. Results take time and patience.",
  },
  {
    id: 9,
    question: "Is it okay to rest after exercise?",
    answer:
      "Yes. Rest days help muscles recover and prevent injuries. Recovery is part of fitness progress.",
  },
  {
    id: 10,
    question: "What is the best time to exercise?",
    answer:
      "The best time is whenever you can stay consistent. Morning workouts boost energy, while evening workouts may improve strength performance.",
  },
  {
    id: 11,
    question: "Can I exercise every day?",
    answer:
      "Yes, but avoid overtraining. Alternate intense workouts with lighter activities like walking or stretching.",
  },
  {
    id: 12,
    question: "What should I eat before a workout?",
    answer:
      "Eat light foods with carbohydrates and protein like bananas, oatmeal, bread, or eggs about 30-60 minutes before exercising.",
  },
  {
    id: 13,
    question: "What should I eat after a workout?",
    answer:
      "Protein-rich foods and healthy carbohydrates help muscles recover. Examples are chicken, eggs, rice, fish, fruits, and vegetables.",
  },
  {
    id: 14,
    question: "How much sleep do I need for fitness?",
    answer:
      "Most adults need around 7-9 hours of sleep. Good sleep improves recovery, energy, and metabolism.",
  },
  {
    id: 15,
    question: "Can walking help burn calories?",
    answer:
      "Yes. Walking is one of the safest and easiest ways to burn calories and improve heart health.",
  },
  {
    id: 16,
    question: "Why is consistency important in fitness?",
    answer:
      "Small healthy habits done consistently give better long-term results than extreme short-term routines.",
  },
  {
    id: 17,
    question: "Is stretching necessary before exercise?",
    answer:
      "Yes. Stretching and warm-ups prepare your muscles and reduce the risk of injuries.",
  },
  {
    id: 18,
    question: "How can I stay motivated to exercise?",
    answer:
      "Set realistic goals, track your progress, celebrate small achievements, and choose activities you enjoy.",
  },
  {
    id: 19,
    question: "Can stress affect my fitness progress?",
    answer:
      "Yes. Stress can affect sleep, eating habits, and energy levels. Relaxation and proper rest are important for overall health.",
  },
  {
    id: 20,
    question: "How does Vital Tracker help users?",
    answer:
      "Vital Tracker helps users monitor calories, activity, steps, exercise progress, and healthy habits to support a healthier lifestyle.",
  },
];

function readFirstName() {
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USER_KEY);
    const user = raw ? JSON.parse(raw) as Partial<LocalUser> : null;
    const name = user?.name?.trim() || user?.email?.split("@")[0] || "";

    if (name.toLowerCase().includes("jennifer")) {
      return "Jennifer";
    }

    return name.split(/\s+/)[0] || "there";
  } catch {
    return "there";
  }
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="text-sm font-semibold leading-relaxed text-foreground">{question}</span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl bg-[hsl(174,65%,95%)] px-4 py-3 text-sm leading-relaxed text-foreground">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Support() {
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [firstName, setFirstName] = useState(readFirstName);

  useEffect(() => {
    function syncName() {
      setFirstName(readFirstName());
    }

    window.addEventListener("vital-track-user-updated", syncName);
    window.addEventListener("storage", syncName);

    return () => {
      window.removeEventListener("vital-track-user-updated", syncName);
      window.removeEventListener("storage", syncName);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#063b42_0%,#0f766e_100%)] p-6 text-white shadow-[0_20px_45px_rgba(2,24,31,0.2)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
            <CircleHelp className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Hi, {firstName}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Tap a question and Vital Tracker answers right away.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {FAQS.map((faq) => (
          <FAQItem
            key={faq.id}
            question={faq.question}
            answer={faq.answer}
            isOpen={expandedId === faq.id}
            onToggle={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Total FAQs</p>
          <p className="mt-1 text-2xl font-semibold">{FAQS.length}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Answer style</p>
          <p className="mt-1 text-2xl font-semibold">Instant</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs text-muted-foreground">Focus</p>
          <p className="mt-1 text-2xl font-semibold">Health</p>
        </div>
      </div>
    </div>
  );
}
