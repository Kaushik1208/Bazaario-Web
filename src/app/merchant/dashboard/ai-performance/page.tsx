"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatCard, Card, EmptyState } from "@/components/merchant/ui";
import { formatINR } from "@/lib/money";
import { Sparkles, ThumbsUp, PackagePlus, Bot } from "lucide-react";

type Stats = {
  aiAssistedOrderCount: number;
  upsellAcceptedCount: number;
  crossSellAcceptedCount: number;
  aiUpliftInPaise: number;
};

type LogEntry = { id: string; actor: string; action: string; detail: string; createdAt: string };

export default function AIPerformancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch("/api/merchant/stats").then((r) => r.json()).then(setStats);
    fetch("/api/merchant/audit-logs")
      .then((r) => r.json())
      .then((d) => setLogs((d.logs ?? []).filter((l: LogEntry) => l.actor === "MERCHANT_AI_AGENT" || l.actor === "AGENT_API").slice(0, 20)));
  }, []);

  return (
    <div>
      <PageHeader title="AI performance" subtitle="What the AI shopping assistant is recommending, and how customers respond." />

      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="AI-assisted orders" value={stats ? String(stats.aiAssistedOrderCount) : "—"} icon={Sparkles} />
        <StatCard label="Upsells accepted" value={stats ? String(stats.upsellAcceptedCount) : "—"} icon={ThumbsUp} />
        <StatCard label="Cross-sells accepted" value={stats ? String(stats.crossSellAcceptedCount) : "—"} icon={PackagePlus} />
        <StatCard label="Revenue uplift" value={stats ? formatINR(stats.aiUpliftInPaise) : "—"} icon={Bot} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg text-fg">Recent AI activity</h2>
        {logs.length === 0 ? (
          <EmptyState title="No AI activity yet" body="Recommendations, upsells and cross-sells suggested by the shopping assistant and Agent API will be logged here." />
        ) : (
          <Card>
            <ul className="stagger divide-y divide-line">
              {logs.map((l) => {
                let detail: any = {};
                try {
                  detail = JSON.parse(l.detail);
                } catch {}
                return (
                  <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                    <div>
                      <span className="font-medium text-fg">{formatAction(l.action)}</span>
                      <div className="mt-0.5 text-xs text-fg/45">
                        {detail.productName ? `${detail.productName} ` : ""}
                        {detail.reason ?? detail.query ?? ""}
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-xs text-fg/35">{new Date(l.createdAt).toLocaleTimeString("en-IN")}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatAction(action: string) {
  return action
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}
