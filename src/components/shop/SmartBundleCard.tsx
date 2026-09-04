"use client";

import { formatINR } from "@/lib/money";
import { Sparkles, Plus, Check } from "lucide-react";
import { ProductThumb } from "./ProductCard";
import type { CardProduct } from "./ProductCard";

export function SmartBundleCard({
  items,
  totalInPaise,
  onAddBundle,
  added,
}: {
  items: CardProduct[];
  totalInPaise: number;
  onAddBundle: () => void;
  added: boolean;
}) {
  return (
    <div
      className="w-full max-w-sm rounded-2xl border p-4 shadow-card"
      style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 5%, var(--surface))" }}
    >
      <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}>
        <Sparkles size={12} /> Smart Bundle — better together
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item, idx) => (
          <div key={item.id}>
            <div className="flex items-center gap-3">
              <ProductThumb product={item} className="text-xl" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={{ color: "var(--fg)" }}>{item.name}</div>
                <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{formatINR(item.priceInPaise)}</div>
              </div>
            </div>
            {idx < items.length - 1 && (
              <div className="ml-6 my-1 text-xs" style={{ color: "var(--fg-muted)" }}>+</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Bundle total</span>
        <span className="font-display text-lg" style={{ color: "var(--fg)" }}>{formatINR(totalInPaise)}</span>
      </div>

      <button
        onClick={onAddBundle}
        disabled={added}
        className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
        style={
          added
            ? { background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }
            : { background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }
        }
      >
        {added ? (
          <>
            <Check size={14} /> Bundle added to cart
          </>
        ) : (
          <>
            <Plus size={14} /> Add both to cart
          </>
        )}
      </button>
    </div>
  );
}
