"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, EmptyState } from "@/components/merchant/ui";

type LogEntry = { id: string; actor: string; action: string; detail: string; sessionId: string | null; orderId: string | null; createdAt: string };

const ACTOR_TONE: Record<string, "green" | "amber" | "red" | "gray" | "blue"> = {
  CUSTOMER: "blue",
  MERCHANT_AI_AGENT: "amber",
  MERCHANT: "gray",
  SYSTEM: "green",
  AGENT_API: "red",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/merchant/audit-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const actors = ["ALL", ...Array.from(new Set(logs.map((l) => l.actor)))];
  const visible = filter === "ALL" ? logs : logs.filter((l) => l.actor === filter);

  return (
    <div>
      <PageHeader
        title="Audit logs"
        subtitle="The complete, tamper-evident trail of every AI decision and financial action across your store."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {actors.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`focus-ring rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              filter === a
                ? "bg-gradient-to-r from-ink to-ink/85 text-white shadow-soft"
                : "border border-line bg-surface text-fg/55 hover:-translate-y-0.5 hover:text-fg"
            }`}
          >
            {a === "ALL" ? "All" : a.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-fg/50">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No audit entries" body="Every catalog search, recommendation, upsell suggestion, price validation and payment result will appear here." />
      ) : (
        <Card>
          <ul className="stagger divide-y divide-line">
            {visible.map((l) => {
              let detail: Record<string, unknown> = {};
              try {
                detail = JSON.parse(l.detail);
              } catch {}
              return (
                <li key={l.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={ACTOR_TONE[l.actor] ?? "gray"}>{l.actor.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-fg">{l.action.replace(/_/g, " ").toLowerCase()}</span>
                    </div>
                    <span className="whitespace-nowrap text-xs text-fg/35">{new Date(l.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <pre className="mt-1.5 overflow-x-auto rounded-lg bg-ink/[0.03] px-3 py-2 text-xs text-fg/55">{JSON.stringify(detail, null, 0)}</pre>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
