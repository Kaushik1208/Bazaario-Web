"use client";

import { formatINR } from "@/lib/money";
import { Plus, Check, TrendingUp, PackagePlus, Sparkles, Heart, Flame } from "lucide-react";

export type CardProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  priceInPaise: number;
  imageEmoji: string;
  imageUrl?: string | null;
  reason: string;
  stockCount: number;
  urgent?: boolean;
};

const KIND_META = {
  recommended: { icon: Sparkles, label: "Best match", tone: "brand" },
  upsell: { icon: TrendingUp, label: "Consider upgrading", tone: "amber" },
  crossSell: { icon: PackagePlus, label: "Goes well with it", tone: "emerald" },
} as const;

const TONE_STYLES: Record<string, { color: string; background: string }> = {
  brand: { color: "var(--brand)", background: "color-mix(in srgb, var(--brand) 14%, transparent)" },
  amber: { color: "#D97706", background: "rgba(245, 158, 11, 0.14)" },
  emerald: { color: "var(--success)", background: "color-mix(in srgb, var(--success) 16%, transparent)" },
};

export function ProductThumb({ product, className = "text-3xl" }: { product: { imageEmoji: string; imageUrl?: string | null; name: string }; className?: string }) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-14 w-14 flex-shrink-0 rounded-xl object-cover shadow-card"
        style={{ border: "1px solid var(--line)" }}
      />
    );
  }
  return (
    <div
      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
    >
      {product.imageEmoji}
    </div>
  );
}

export function ProductCard({
  product,
  kind,
  onAdd,
  added,
  disabled,
  onToggleSave,
  saved,
}: {
  product: CardProduct;
  kind: keyof typeof KIND_META;
  onAdd: () => void;
  added: boolean;
  disabled?: boolean;
  onToggleSave?: () => void;
  saved?: boolean;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const tone = TONE_STYLES[meta.tone];
  return (
    <div
      className="w-full max-w-sm rounded-2xl border p-4 shadow-card transition-transform hover:-translate-y-0.5"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={tone}>
            <Icon size={12} /> {meta.label}
          </div>
          {product.urgent && (
            <div className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500">
              <Flame size={11} /> {product.stockCount} left
            </div>
          )}
        </div>
        {onToggleSave && (
          <button
            onClick={onToggleSave}
            aria-label={saved ? "Remove from saved items" : "Save for later"}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            style={{ color: saved ? "#EF4444" : "var(--fg-muted)" }}
          >
            <Heart size={15} fill={saved ? "#EF4444" : "none"} />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <ProductThumb product={product} />
        <div className="min-w-0 flex-1">
          <div className="font-medium" style={{ color: "var(--fg)" }}>{product.name}</div>
          <div className="text-xs" style={{ color: "var(--fg-muted)" }}>{product.category}</div>
        </div>
        <div className="font-display text-lg" style={{ color: "var(--fg)" }}>{formatINR(product.priceInPaise)}</div>
      </div>
      <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>{product.reason}</p>
      {product.features.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {product.features.slice(0, 3).map((f) => (
            <li
              key={f}
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}
            >
              {f}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={onAdd}
        disabled={added || disabled || product.stockCount <= 0}
        className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
        style={
          added
            ? { background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }
            : product.stockCount <= 0
            ? { background: "var(--surface-2)", color: "var(--fg-muted)", cursor: "not-allowed" }
            : { background: "var(--bubble-user)", color: "var(--bubble-user-fg)" }
        }
      >
        {added ? (
          <>
            <Check size={14} /> Added to cart
          </>
        ) : product.stockCount <= 0 ? (
          "Out of stock"
        ) : (
          <>
            <Plus size={14} /> Add to cart
          </>
        )}
      </button>
    </div>
  );
}
