"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard, Card, StatusBadge, EmptyState } from "@/components/merchant/ui";
import { DollarSign, ShoppingCart, TrendingUp, Sparkles, Package, Flame, PackagePlus, Tag, AlertTriangle, Radar, Snowflake } from "lucide-react";
import { formatINR } from "@/lib/money";

type Stats = {
  revenueInPaise: number;
  avgOrderValueInPaise: number;
  totalOrders: number;
  paidOrderCount: number;
  pendingOrders: number;
  productCount: number;
  aiAssistedOrderCount: number;
  aiUpliftInPaise: number;
  upsellAcceptedCount: number;
  crossSellAcceptedCount: number;
};

type Order = {
  id: string;
  status: string;
  totalInPaise: number;
  channel: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

type NextMoveInsight = {
  productId: string;
  productName: string;
  action: "PROMOTE" | "DISCOUNT" | "BUNDLE" | "RESTOCK";
  headline: string;
  detail: string;
};

const ACTION_META: Record<NextMoveInsight["action"], { icon: typeof Flame; tone: string; bg: string }> = {
  RESTOCK: { icon: AlertTriangle, tone: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  BUNDLE: { icon: PackagePlus, tone: "var(--success)", bg: "color-mix(in srgb, var(--success) 12%, transparent)" },
  PROMOTE: { icon: Flame, tone: "#EA580C", bg: "rgba(234,88,12,0.08)" },
  DISCOUNT: { icon: Tag, tone: "var(--brand)", bg: "color-mix(in srgb, var(--brand) 10%, transparent)" },
};

function NextMovePanel() {
  const [insights, setInsights] = useState<NextMoveInsight[] | null>(null);

  useEffect(() => {
    fetch("/api/merchant/next-move")
      .then((r) => r.json())
      .then((d) => setInsights(d.insights ?? []))
      .catch(() => setInsights([]));
  }, []);

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg text-fg">
            <Sparkles size={16} className="text-brand-500" /> Next-Move
          </h2>
          <p className="text-xs text-fg/45">AI-suggested actions based on real sales and stock — recalculated every time you load this page.</p>
        </div>
      </div>
      {insights === null ? (
        <p className="text-sm text-fg/50">Analyzing your store…</p>
      ) : insights.length === 0 ? (
        <EmptyState title="No moves to suggest yet" body="Once you have a bit of order history, Next-Move will surface restocks, bundles, and products worth promoting or discounting." />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((ins) => {
            const meta = ACTION_META[ins.action];
            const Icon = meta.icon;
            return (
              <Card key={`${ins.productId}-${ins.action}`} className="flex items-start gap-3 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: meta.bg, color: meta.tone }}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-fg">{ins.headline}</div>
                  <p className="mt-0.5 text-xs text-fg/50">{ins.detail}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

type DemandSignal = {
  productId: string;
  productName: string;
  imageEmoji: string;
  imageUrl: string | null;
  recentUnits: number;
  priorUnits: number;
  growthLabel: string;
  stockCount: number;
};

function DemandDetectorPanel() {
  const [signals, setSignals] = useState<DemandSignal[] | null>(null);

  useEffect(() => {
    fetch("/api/merchant/demand-detector")
      .then((r) => r.json())
      .then((d) => setSignals(d.signals ?? []))
      .catch(() => setSignals([]));
  }, []);

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-1.5 font-display text-lg text-fg">
        <Radar size={16} className="text-emerald-500" /> Live Demand Detector
      </h2>
      <p className="text-xs text-fg/45">Products whose sales are accelerating week-over-week — the earliest sign of a trend, before it shows up in totals.</p>

      {signals === null ? (
        <p className="mt-3 text-sm text-fg/50">Scanning recent activity…</p>
      ) : signals.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No demand spikes right now" body="Once a product starts selling noticeably faster week-over-week, it'll show up here first." />
        </div>
      ) : (
        <div className="stagger mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <Card key={s.productId} className="flex items-start gap-3 p-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-fg">{s.productName}</div>
                <p className="mt-0.5 text-xs text-fg/50">{s.growthLabel}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type DeadStockItem = {
  productId: string;
  productName: string;
  stockCount: number;
  capitalTiedUpInPaise: number;
  daysSinceListed: number;
  suggestedAction: string;
};

function DeadStockPanel() {
  const [items, setItems] = useState<DeadStockItem[] | null>(null);

  useEffect(() => {
    fetch("/api/merchant/dead-stock")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="mt-8">
      <h2 className="flex items-center gap-1.5 font-display text-lg text-fg">
        <Snowflake size={16} className="text-sky-500" /> Dead Stock Rescue
      </h2>
      <p className="text-xs text-fg/45">Listings with real capital tied up that haven't sold in 30+ days, ranked by how much money is sitting on the shelf.</p>

      {items === null ? (
        <p className="mt-3 text-sm text-fg/50">Checking your catalog…</p>
      ) : items.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="Nothing stuck right now" body="Products that go 30+ days without a sale, and have stock value worth acting on, will show up here." />
        </div>
      ) : (
        <div className="stagger mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <Card key={it.productId} className="flex items-start gap-3 p-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
                <Snowflake size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-fg">{it.productName}</div>
                <div className="mt-0.5 text-xs text-fg/40">
                  {it.stockCount} in stock · listed {it.daysSinceListed} days ago · {formatINR(it.capitalTiedUpInPaise)} tied up
                </div>
                <p className="mt-1 text-xs text-fg/55">{it.suggestedAction}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);


  useEffect(() => {
    fetch("/api/merchant/stats").then((r) => r.json()).then(setStats);
    fetch("/api/merchant/orders").then((r) => r.json()).then((d) => setOrders(d.orders?.slice(0, 6) ?? []));
  }, []);

  return (
    <div>
      <PageHeader title="Overview" subtitle="How your store is performing, at a glance." />

      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Revenue" value={stats ? formatINR(stats.revenueInPaise) : "—"} icon={DollarSign} hint={`${stats?.paidOrderCount ?? 0} paid orders`} />
        <StatCard label="Avg order value" value={stats ? formatINR(stats.avgOrderValueInPaise) : "—"} icon={TrendingUp} />
        <StatCard label="AI-assisted orders" value={stats ? String(stats.aiAssistedOrderCount) : "—"} icon={Sparkles} hint={stats ? `+${formatINR(stats.aiUpliftInPaise)} from upsell/cross-sell` : undefined} />
        <StatCard label="Active products" value={stats ? String(stats.productCount) : "—"} icon={Package} />
      </div>

      <NextMovePanel />
      <DemandDetectorPanel />
      <DeadStockPanel />

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-fg">Recent orders</h2>
          <ShoppingCart size={16} className="text-fg/30" />
        </div>
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" body="Once customers check out through your AI shopping assistant, orders will show up here in real time." />
        ) : (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg/40">
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Channel</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="stagger">
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-line transition-colors last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs text-fg/60">{o.id.slice(0, 10)}…</td>
                    <td className="px-5 py-3 text-fg/70">{o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}</td>
                    <td className="px-5 py-3 text-fg/50">{o.channel === "AGENT_API" ? "AI buyer" : "Chat"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-fg">{formatINR(o.totalInPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

