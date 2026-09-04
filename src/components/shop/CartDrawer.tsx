"use client";

import { formatINR } from "@/lib/money";
import { X, Trash2, Loader2 } from "lucide-react";

export type CartItemView = {
  id: string;
  productId: string;
  productName: string;
  imageEmoji: string;
  quantity: number;
  unitPriceInPaise: number;
  addedVia: string;
};

export function CartDrawer({
  open,
  onClose,
  items,
  subtotalInPaise,
  onRemove,
  onCheckout,
  checkingOut,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItemView[];
  subtotalInPaise: number;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  checkingOut: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-sm animate-fade-up flex-col shadow-xl"
        style={{ background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--line)" }}>
          <h3 className="font-display text-lg" style={{ color: "var(--fg)" }}>Your cart</h3>
          <button onClick={onClose} className="focus-ring transition-colors" style={{ color: "var(--fg-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm" style={{ color: "var(--fg-muted)" }}>
              Your cart is empty. Ask the assistant for a recommendation to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="text-xl">{i.imageEmoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" style={{ color: "var(--fg)" }}>{i.productName}</div>
                    <div className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      Qty {i.quantity} · {formatINR(i.unitPriceInPaise)}
                      {i.addedVia !== "CUSTOMER" && <span className="ml-1" style={{ color: "var(--brand)" }}>· AI suggested</span>}
                    </div>
                  </div>
                  <button onClick={() => onRemove(i.productId)} className="focus-ring transition-colors hover:text-red-500" style={{ color: "var(--fg-muted)" }}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-5 py-4" style={{ borderColor: "var(--line)" }}>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span style={{ color: "var(--fg-muted)" }}>Subtotal</span>
            <span className="font-display text-lg" style={{ color: "var(--fg)" }}>{formatINR(subtotalInPaise)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={items.length === 0 || checkingOut}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
          >
            {checkingOut && <Loader2 size={15} className="animate-spin" />}
            Proceed to payment
          </button>
        </div>
      </div>
    </div>
  );
}
