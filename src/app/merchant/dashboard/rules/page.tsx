"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/merchant/ui";
import { Loader2, ShieldCheck } from "lucide-react";

type Rule = { id: string; ruleType: string; value: string; isActive: boolean };

const RULE_DEFS: { type: string; label: string; help: string; kind: "number" | "boolean" }[] = [
  { type: "MAX_DISCOUNT_PERCENT", label: "Maximum discount (%)", help: "Upper bound the AI is allowed to reason about when proposing any discount.", kind: "number" },
  { type: "MAX_TRANSACTION_AMOUNT", label: "Maximum transaction amount (₹)", help: "Checkout is blocked server-side if a cart's total exceeds this.", kind: "number" },
  { type: "MAX_UPSELLS_PER_CHAT", label: "Max upsell suggestions per chat", help: "Caps how many upsell nudges the assistant can make in one conversation.", kind: "number" },
  { type: "ALLOW_UPSELL", label: "Allow upselling", help: "Turn AI upsell suggestions on or off store-wide.", kind: "boolean" },
  { type: "ALLOW_CROSS_SELL", label: "Allow cross-selling", help: "Turn AI cross-sell suggestions on or off store-wide.", kind: "boolean" },
];

const DEFAULTS: Record<string, string> = {
  MAX_DISCOUNT_PERCENT: "10",
  MAX_TRANSACTION_AMOUNT: "",
  MAX_UPSELLS_PER_CHAT: "3",
  ALLOW_UPSELL: "true",
  ALLOW_CROSS_SELL: "true",
};

export default function RulesPage() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/merchant/rules")
      .then((r) => r.json())
      .then((d) => {
        const rules: Rule[] = d.rules ?? [];
        const next = { ...DEFAULTS };
        for (const type of Object.keys(DEFAULTS)) {
          const active = rules.find((r) => r.ruleType === type && r.isActive);
          if (active) next[type] = active.value;
        }
        setValues(next);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(type: string, value: string) {
    setSavingType(type);
    await fetch("/api/merchant/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleType: type, value, isActive: true }),
    });
    setValues((v) => ({ ...v, [type]: value }));
    setSavingType(null);
  }

  return (
    <div>
      <PageHeader
        title="Rules"
        subtitle="Guardrails the backend enforces on every AI recommendation and checkout — the LLM cannot override these."
      />
      {loading ? (
        <p className="text-sm text-fg/50">Loading…</p>
      ) : (
        <div className="stagger space-y-3">
          {RULE_DEFS.map((def) => (
            <Card key={def.type} className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="flex items-center gap-2 font-medium text-fg">
                  <ShieldCheck size={15} className="text-brand-500" /> {def.label}
                </div>
                <p className="mt-0.5 text-sm text-fg/50">{def.help}</p>
              </div>
              <div className="flex items-center gap-2">
                {savingType === def.type && <Loader2 size={14} className="animate-spin text-fg/40" />}
                {def.kind === "boolean" ? (
                  <select
                    value={values[def.type]}
                    onChange={(e) => save(def.type, e.target.value)}
                    className="input w-auto py-2"
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={values[def.type]}
                    placeholder={def.type === "MAX_TRANSACTION_AMOUNT" ? "No limit" : ""}
                    onChange={(e) => setValues((v) => ({ ...v, [def.type]: e.target.value }))}
                    onBlur={(e) => e.target.value && save(def.type, e.target.value)}
                    className="input w-32 py-2 text-right"
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
