"use client";

import { formatINR } from "@/lib/money";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, RotateCcw } from "lucide-react";

type Phase = "confirm" | "processing" | "success" | "failed";

export function PaymentModal({
  totalInPaise,
  isMockPayments,
  onClose,
  onConfirm,
  onRetry,
  phase,
  failureReason,
}: {
  totalInPaise: number;
  isMockPayments: boolean;
  onClose: () => void;
  onConfirm: (simulateOutcome: "success" | "failure") => void;
  onRetry: () => void;
  phase: Phase;
  failureReason?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm animate-fade-up rounded-2xl p-6 shadow-xl" style={{ background: "var(--surface)" }}>
        {phase === "confirm" && (
          <>
            <div className="flex items-center gap-2" style={{ color: "var(--fg-muted)" }}>
              <ShieldCheck size={16} style={{ color: "var(--brand)" }} />
              <span className="text-xs font-medium uppercase tracking-wide">Razorpay {isMockPayments ? "Test Mode (simulated)" : "Test Mode"}</span>
            </div>
            <div className="mt-4 font-display text-3xl" style={{ color: "var(--fg)" }}>{formatINR(totalInPaise)}</div>
            <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
              Confirm this payment to complete your order. This is a test transaction — no real money moves.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => onConfirm("success")}
                className="focus-ring rounded-xl py-3 text-sm font-semibold transition-colors"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
              >
                Confirm &amp; pay {formatINR(totalInPaise)}
              </button>
              {isMockPayments && (
                <button
                  onClick={() => onConfirm("failure")}
                  className="focus-ring rounded-xl border py-2.5 text-xs font-medium transition-colors"
                  style={{ borderColor: "var(--line)", color: "var(--fg-muted)" }}
                >
                  Demo: simulate a declined payment instead
                </button>
              )}
              <button onClick={onClose} className="focus-ring py-1 text-xs transition-colors" style={{ color: "var(--fg-muted)" }}>
                Cancel
              </button>
            </div>
          </>
        )}

        {phase === "processing" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
            <p className="mt-4 text-sm" style={{ color: "var(--fg-muted)" }}>Talking to Razorpay…</p>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 size={40} style={{ color: "var(--success)" }} />
            <div className="mt-3 font-display text-xl" style={{ color: "var(--fg)" }}>Payment successful</div>
            <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>{formatINR(totalInPaise)} paid. Your order is confirmed.</p>
            <button
              onClick={onClose}
              className="focus-ring mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--bubble-user)", color: "var(--bubble-user-fg)" }}
            >
              Done
            </button>
          </div>
        )}

        {phase === "failed" && (
          <div className="flex flex-col items-center py-4 text-center">
            <XCircle size={40} style={{ color: "var(--danger)" }} />
            <div className="mt-3 font-display text-xl" style={{ color: "var(--fg)" }}>Payment failed</div>
            <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>{failureReason || "The payment could not be completed."}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>Your order is unpaid and no charge was made. Nothing was retried automatically.</p>
            <div className="mt-6 flex w-full gap-2">
              <button
                onClick={onRetry}
                className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
              >
                <RotateCcw size={14} /> Retry payment
              </button>
              <button onClick={onClose} className="focus-ring rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "var(--line)", color: "var(--fg-muted)" }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
