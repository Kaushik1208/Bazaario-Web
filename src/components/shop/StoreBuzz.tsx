"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/money";
import { Flame, Sparkles, Clock3 } from "lucide-react";
import { ProductThumb } from "./ProductCard";

type BuzzProduct = {
  id: string;
  name: string;
  category: string;
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  stockCount: number;
};

type Buzz = {
  trending: (BuzzProduct & { salesCount: number })[];
  newArrivals: BuzzProduct[];
  almostGone: BuzzProduct[];
};

export function StoreBuzz({ merchantSlug, onAsk }: { merchantSlug: string; onAsk: (text: string) => void }) {
  const [buzz, setBuzz] = useState<Buzz | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shop/buzz?merchantSlug=${merchantSlug}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setBuzz(d.buzz ?? null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [merchantSlug]);

  if (!buzz) return null;

  const sections: { key: string; icon: typeof Flame; label: string; items: BuzzProduct[]; tint: string }[] = [
    { key: "trending", icon: Flame, label: "Trending now", items: buzz.trending, tint: "#F97316" },
    { key: "new", icon: Sparkles, label: "New arrivals", items: buzz.newArrivals, tint: "var(--brand)" },
    { key: "almost", icon: Clock3, label: "Almost gone", items: buzz.almostGone, tint: "#EF4444" },
  ].filter((s) => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="animate-fade-up border-b px-4 py-3 sm:px-8" style={{ borderColor: "var(--line)" }}>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-1">
        {sections.map((section) => (
          <div key={section.key} className="flex-shrink-0">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: section.tint }}>
              <section.icon size={12} /> {section.label}
            </div>
            <div className="flex gap-2">
              {section.items.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onAsk(`Tell me more about the ${p.name}`)}
                  className="focus-ring flex w-32 flex-shrink-0 flex-col items-start gap-1.5 rounded-xl border p-2 text-left transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                >
                  <ProductThumb product={p} className="text-xl" />
                  <div className="w-full truncate text-xs font-medium" style={{ color: "var(--fg)" }}>{p.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--fg-muted)" }}>{formatINR(p.priceInPaise)}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
