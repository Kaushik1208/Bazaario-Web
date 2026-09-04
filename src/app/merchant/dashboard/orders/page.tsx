"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, EmptyState, StatusBadge } from "@/components/merchant/ui";
import { formatINR } from "@/lib/money";

type Order = {
  id: string;
  status: string;
  channel: string;
  totalInPaise: number;
  createdAt: string;
  items: { productName: string; quantity: number; addedVia: string }[];
  payments: { status: string; failureReason: string | null }[];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Every checkout attempt, from both the chat assistant and the Agent Commerce API." />
      {loading ? (
        <p className="text-sm text-fg/50">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Orders created from your storefront chat or the Agent API will appear here." />
      ) : (
        <div className="stagger space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-fg/45">{o.id}</div>
                  <div className="mt-1 text-xs text-fg/40">
                    {new Date(o.createdAt).toLocaleString("en-IN")} · {o.channel === "AGENT_API" ? "AI buyer (Agent API)" : "Customer chat"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.status} />
                  <span className="font-display text-lg text-fg">{formatINR(o.totalInPaise)}</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-fg/65">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>
                      {i.productName} × {i.quantity}
                    </span>
                    {i.addedVia !== "CUSTOMER" && (
                      <span className="text-xs text-brand-600">{i.addedVia.replace("AI_", "AI ").replace("_", "-").toLowerCase()}</span>
                    )}
                  </li>
                ))}
              </ul>
              {o.status === "PAYMENT_FAILED" && o.payments[0]?.failureReason && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{o.payments[0].failureReason}</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
