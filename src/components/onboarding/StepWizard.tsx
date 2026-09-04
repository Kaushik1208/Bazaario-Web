"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2 } from "lucide-react";

export type WizardStep = {
  id: string;
  title: string;
  subtitle?: string;
  render: (helpers: { autoFocus: boolean }) => React.ReactNode;
  // Return true (or a Promise resolving true) when the step's inputs are
  // valid enough to move forward. Keeps "Next" from feeling like a dead end.
  canContinue: () => boolean;
};

export function StepWizard({
  steps,
  onComplete,
  submitting,
  submitLabel = "Finish",
  error,
}: {
  steps: WizardStep[];
  onComplete: () => void;
  submitting?: boolean;
  submitLabel?: string;
  error?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  function next() {
    if (!step.canContinue()) return;
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function back() {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div>
      {/* Progress dots — Blinkit/Zomato-style step indicator */}
      <div className="mb-6 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ background: i <= index ? "var(--brand)" : "var(--line)" }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {index > 0 && (
          <button
            type="button"
            onClick={back}
            className="focus-ring -ml-1.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--fg-muted)" }}
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="font-display text-xl tracking-tight" style={{ color: "var(--fg)" }}>
            {step.title}
          </h1>
          {step.subtitle && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--fg-muted)" }}>
              {step.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="relative mt-6 min-h-[168px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                next();
              }
            }}
          >
            {step.render({ autoFocus: true })}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mt-3 animate-fade-in text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={next}
        disabled={!step.canContinue() || submitting}
        className="focus-ring shine relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-glow-lg disabled:opacity-50"
      >
        {submitting && <Loader2 size={15} className="animate-spin" />}
        {isLast ? submitLabel : "Next"}
      </button>

      <div className="mt-3 text-center text-xs" style={{ color: "var(--fg-muted)" }}>
        Step {index + 1} of {steps.length}
      </div>
    </div>
  );
}
