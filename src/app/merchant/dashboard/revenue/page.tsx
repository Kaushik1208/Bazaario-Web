"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard, Card, EmptyState } from "@/components/merchant/ui";
import { formatINR } from "@/lib/money";
import { DollarSign, TrendingUp, Percent, ShoppingBag } from "lucide-react";

type Stats = {
  revenueInPaise: number;
  avgOrderValueInPaise: number;
  paidOrderCount: number;
  totalOrders: number;
  aiUpliftInPaise: number;
};

export default function RevenuePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/merchant/stats").then((r) => r.json()).then(setStats);
  }, []);

  const conversionRate = stats && stats.totalOrders > 0 ? Math.round((stats.paidOrderCount / stats.totalOrders) * 100) : null;
  const upliftShare =
    stats && stats.revenueInPaise > 0 ? Math.round((stats.aiUpliftInPaise / stats.revenueInPaise) * 100) : null;

  return (
    <div>
      <PageHeader title="Revenue" subtitle="Where your sales are coming from and how much AI-assisted selling contributes." />
      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total revenue" value={stats ? formatINR(stats.revenueInPaise) : "—"} icon={DollarSign} />
        <StatCard label="Avg. order value" value={stats ? formatINR(stats.avgOrderValueInPaise) : "—"} icon={TrendingUp} />
        <StatCard label="Checkout conversion" value={conversionRate !== null ? `${conversionRate}%` : "—"} icon={Percent} hint={stats ? `${stats.paidOrderCount}/${stats.totalOrders} orders paid` : undefined} />
        <StatCard label="Orders paid" value={stats ? String(stats.paidOrderCount) : "—"} icon={ShoppingBag} />
      </div>

      <Card className="mt-6 p-6">
        <h3 className="font-display text-base text-fg">AI revenue uplift</h3>
        <p className="mt-1 text-sm text-fg/55">Revenue that came specifically from AI-suggested upsells and cross-sells the customer explicitly accepted.</p>
        {stats && stats.aiUpliftInPaise > 0 ? (
          <div className="mt-4">
            <div className="h-3 w-full overflow-hidden rounded-full bg-line">
              <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700 ease-spring"
              style={{ width: `${Math.min(upliftShare ?? 0, 100)}%` }}
            />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-fg/60">{formatINR(stats.aiUpliftInPaise)} from AI suggestions</span>
              <span className="font-medium text-brand-600">{upliftShare}% of revenue</span>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No AI-assisted sales yet" body="Once a customer accepts an upsell or cross-sell suggestion and completes payment, it'll show up here." />
          </div>
        )}
      </Card>
    </div>
  );
}
