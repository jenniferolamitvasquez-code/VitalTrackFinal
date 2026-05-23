import { motion } from "framer-motion";
import { Quote } from "lucide-react";

export function MotivationCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.35 }}
      className="glass-card relative min-h-[250px] overflow-hidden rounded-[1.75rem] p-6"
    >
      <div className="relative z-10 max-w-xs">
        <Quote className="h-5 w-5 text-slate-400" />
        <p className="mt-5 font-display text-xl font-semibold leading-8 text-slate-950">
          Discipline is choosing between what you want now and what you want
          most.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          - Abraham Lincoln
        </p>
      </div>

      <div className="absolute inset-y-0 right-0 w-[46%]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(45,212,191,0.08)_40%,rgba(13,148,136,0.18)_100%)]" />
        <svg
          viewBox="0 0 320 260"
          role="img"
          aria-label="Runner illustration"
          className="absolute bottom-0 right-0 h-full w-full"
        >
          <path
            d="M14 228C66 198 106 204 145 219C189 236 239 227 312 178V260H14Z"
            fill="rgba(15,118,110,0.12)"
          />
          <path
            d="M40 244C93 214 140 211 181 226C226 242 269 225 316 195"
            stroke="rgba(13,148,136,0.22)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M170 66C186 48 212 45 227 56C240 66 241 86 228 98C217 108 198 107 186 95C173 83 166 75 170 66Z"
            fill="#0f766e"
          />
          <path
            d="M194 103L169 142L135 144L132 130L161 121L178 97Z"
            fill="#0f766e"
          />
          <path
            d="M188 100L222 120L253 108L259 121L220 140L186 121Z"
            fill="#14b8a6"
          />
          <path
            d="M171 140L150 183L113 205L105 192L135 168L149 134Z"
            fill="#0f766e"
          />
          <path
            d="M187 126L221 162L262 178L257 193L211 176L177 145Z"
            fill="#0f766e"
          />
          <path
            d="M123 206L99 222"
            stroke="#0f766e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M261 180L291 191"
            stroke="#0f766e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M118 128C141 120 156 106 172 86"
            stroke="#5eead4"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </div>
    </motion.section>
  );
}

