"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, EmptyState, PhotoUpload } from "@/components/merchant/ui";
import { formatINR } from "@/lib/money";
import { Plus, X, Loader2, Pencil, Link2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string;
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  isActive: boolean;
  inventory: { stockCount: number } | null;
  relationsFrom: { relationType: string; toProduct: { id: string; name: string } }[];
};

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  featuresText: "",
  priceInRupees: "",
  stockCount: "",
  imageEmoji: "📦",
  imageUrl: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationsFor, setRelationsFor] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/merchant/products");
    const data = await res.json();
    setProducts(data.products ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      featuresText: (JSON.parse(p.features || "[]") as string[]).join(", "),
      priceInRupees: String(p.priceInPaise / 100),
      stockCount: String(p.inventory?.stockCount ?? 0),
      imageEmoji: p.imageEmoji,
      imageUrl: p.imageUrl ?? "",
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      features: form.featuresText.split(",").map((f) => f.trim()).filter(Boolean),
      priceInRupees: Number(form.priceInRupees),
      stockCount: Number(form.stockCount),
      imageEmoji: form.imageEmoji || "📦",
      imageUrl: form.imageUrl,
    };
    const res = await fetch(editingId ? `/api/merchant/products/${editingId}` : "/api/merchant/products", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not save product.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
    load();
  }

  async function deactivate(id: string) {
    if (!confirm("Remove this product from your active catalog?")) return;
    await fetch(`/api/merchant/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Everything the AI shopping assistant and Agent Commerce API can see and sell."
        action={
          <button
            onClick={startNew}
            className="focus-ring shine relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg"
          >
            <Plus size={15} /> Add product
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6 animate-scale-in p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base text-fg">{editingId ? "Edit product" : "New product"}</h3>
            <button onClick={() => setShowForm(false)} className="focus-ring text-fg/40 hover:text-fg">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="Category">
              <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="e.g. Headphones" />
            </Field>
            <Field label="Price (₹)">
              <input required type="number" min="0" step="1" value={form.priceInRupees} onChange={(e) => setForm({ ...form, priceInRupees: e.target.value })} className="input" />
            </Field>
            <Field label="Stock count">
              <input required type="number" min="0" step="1" value={form.stockCount} onChange={(e) => setForm({ ...form, stockCount: e.target.value })} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <PhotoUpload label="Product photo (real photo makes it feel like a real shop)" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} aspect="wide" />
            </div>
            <Field label="Emoji icon (fallback if no photo)">
              <input value={form.imageEmoji} onChange={(e) => setForm({ ...form, imageEmoji: e.target.value })} className="input" maxLength={4} />
            </Field>
            <Field label="Features (comma separated)">
              <input value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} className="input" placeholder="40hr battery, RGB lighting" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
              </Field>
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="focus-ring inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingId ? "Save changes" : "Create product"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="focus-ring rounded-xl border border-line px-4 py-2.5 text-sm text-fg/60 hover:text-fg">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-fg/50">Loading…</p>
      ) : products.length === 0 ? (
        <EmptyState title="No products yet" body="Add your first product so the AI shopping assistant has something to recommend." />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="text-2xl">{p.imageEmoji}</div>
                )}
                <div className="flex gap-1">
                  {!p.isActive && <Badge tone="gray">Inactive</Badge>}
                  {p.inventory && p.inventory.stockCount <= 0 && <Badge tone="red">Out of stock</Badge>}
                  {p.inventory && p.inventory.stockCount > 0 && p.inventory.stockCount <= 5 && <Badge tone="amber">Low stock</Badge>}
                </div>
              </div>
              <div className="mt-3 font-medium text-fg">{p.name}</div>
              <div className="text-xs text-fg/40">{p.category}</div>
              <p className="mt-2 line-clamp-2 text-sm text-fg/55">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display text-lg text-fg">{formatINR(p.priceInPaise)}</span>
                <span className="text-xs text-fg/45">{p.inventory?.stockCount ?? 0} in stock</span>
              </div>
              {p.relationsFrom.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.relationsFrom.map((r) => (
                    <span key={r.toProduct.id} className="rounded-full bg-line px-2 py-0.5 text-[11px] text-fg/50">
                      {r.relationType === "CROSS_SELL" ? "+ " : "↑ "}
                      {r.toProduct.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2 border-t border-line pt-3">
                <button onClick={() => startEdit(p)} className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-fg/60 hover:text-fg">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => setRelationsFor(p)} className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-fg/60 hover:text-fg">
                  <Link2 size={12} /> Related products
                </button>
                <button onClick={() => deactivate(p.id)} className="focus-ring ml-auto text-xs font-medium text-red-500/80 hover:text-red-600">
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {relationsFor && (
        <RelationsModal
          product={relationsFor}
          allProducts={products}
          onClose={() => setRelationsFor(null)}
          onSaved={() => {
            setRelationsFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-fg/60">{label}</span>
      {children}
    </label>
  );
}

function RelationsModal({
  product,
  allProducts,
  onClose,
  onSaved,
}: {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialCross = product.relationsFrom.filter((r) => r.relationType === "CROSS_SELL").map((r) => r.toProduct.id);
  const initialUpsell = product.relationsFrom.filter((r) => r.relationType === "UPSELL").map((r) => r.toProduct.id);
  const [crossSell, setCrossSell] = useState<string[]>(initialCross);
  const [upsell, setUpsell] = useState<string[]>(initialUpsell);
  const [saving, setSaving] = useState(false);

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/merchant/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crossSellProductIds: crossSell, upsellProductIds: upsell }),
    });
    setSaving(false);
    onSaved();
  }

  const others = allProducts.filter((p) => p.id !== product.id);

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-line p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md animate-scale-in rounded-2xl bg-surface p-6 shadow-glow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 font-display text-lg text-fg">Related products</div>
        <p className="mb-4 text-sm text-fg/55">
          Controls what the AI is allowed to suggest alongside <strong>{product.name}</strong>.
        </p>

        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg/40">Cross-sell (complementary add-ons)</div>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto scrollbar-thin">
            {others.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-fg/70">
                <input type="checkbox" checked={crossSell.includes(p.id)} onChange={() => toggle(crossSell, setCrossSell, p.id)} />
                {p.imageEmoji} {p.name}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg/40">Upsell (better alternative)</div>
          <div className="flex max-h-32 flex-col gap-1 overflow-y-auto scrollbar-thin">
            {others.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-fg/70">
                <input type="checkbox" checked={upsell.includes(p.id)} onChange={() => toggle(upsell, setUpsell, p.id)} />
                {p.imageEmoji} {p.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="focus-ring rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Save
          </button>
          <button onClick={onClose} className="focus-ring rounded-xl border border-line px-4 py-2 text-sm text-fg/60">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
