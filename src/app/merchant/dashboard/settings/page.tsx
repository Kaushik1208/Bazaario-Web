"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, PhotoUpload } from "@/components/merchant/ui";
import { THEMES, useTheme } from "@/components/theme/ThemeProvider";
import {
  Loader2,
  Check,
  Store,
  User,
  Lock,
  Bell,
  Palette,
  Save,
} from "lucide-react";

type Section = "profile" | "appearance" | "security" | "notifications";

const NOTIF_KEY = "bazaario-merchant-notifs";
const DEFAULT_NOTIFS = { orderPaid: true, lowStock: true, weeklySummary: false };

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("profile");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business profile, appearance, security and notifications." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {(
            [
              { id: "profile", label: "Business profile", icon: Store },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "security", label: "Security", icon: Lock },
              { id: "notifications", label: "Notifications", icon: Bell },
            ] as { id: Section; label: string; icon: typeof Store }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`focus-ring flex flex-shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                section === id ? "font-medium text-brand-700" : "text-fg/60 hover:bg-line hover:text-fg"
              }`}
              style={section === id ? { background: "var(--surface-2)" } : undefined}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "profile" && <ProfileSection />}
          {section === "appearance" && <AppearanceSection />}
          {section === "security" && <SecuritySection />}
          {section === "notifications" && <NotificationsSection />}
        </div>
      </div>
    </div>
  );
}

function SavedPill({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="animate-fade-in inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <Check size={13} /> Saved
    </span>
  );
}

function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [logoEmoji, setLogoEmoji] = useState("🛍️");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoImageUrl, setLogoImageUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.user?.email ?? "");
        setName(d.user?.name ?? "");
        setStoreName(d.merchant?.name ?? "");
        setDescription(d.merchant?.description ?? "");
        setLogoEmoji(d.merchant?.logoEmoji ?? "🛍️");
        setPhone(d.merchant?.phone ?? "");
        setAddress(d.merchant?.address ?? "");
        setLogoImageUrl(d.merchant?.logoImageUrl ?? "");
        setCoverImageUrl(d.merchant?.coverImageUrl ?? "");
        setIsDemo(Boolean(d.merchant?.isDemo));
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/merchant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "profile", name, storeName, description, logoEmoji, phone, address, logoImageUrl, coverImageUrl }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (loading) return <p className="text-sm text-fg/50">Loading…</p>;

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <User size={16} /> Business profile
      </h2>
      <p className="mt-1 text-sm text-fg/50">
        This is how your store looks to real customers — a phone number, location and real photos make it feel like a genuine shop, not a demo.
      </p>
      {isDemo && (
        <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}>
          This is the showcase demo store — its details are visible to anyone reviewing Bazaario.
        </p>
      )}

      <form onSubmit={save} className="mt-6 space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Shop cover photo</label>
          <PhotoUpload label="" value={coverImageUrl} onChange={setCoverImageUrl} aspect="wide" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Your name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Email</label>
            <input className="input opacity-60" value={email} disabled />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[96px_1fr]">
          <PhotoUpload label="Shop photo" value={logoImageUrl} onChange={setLogoImageUrl} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[80px_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg/60">Emoji</label>
              <input
                className="input text-center text-lg"
                value={logoEmoji}
                maxLength={4}
                onChange={(e) => setLogoEmoji(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-fg/60">Store name</label>
              <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Phone number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-fg/60">Shop location</label>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop no., street, city" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Store description</label>
          <textarea
            className="input min-h-[84px] resize-y"
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short line shoppers and the AI assistant can use to describe your store."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save changes
          </button>
          <SavedPill show={saved} />
        </div>
      </form>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Palette size={16} /> Appearance
      </h2>
      <p className="mt-1 text-sm text-fg/50">
        Pick a theme for your dashboard and storefront chat. It's saved to this browser and applies instantly.
      </p>

      <div className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`focus-ring card-hover relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                active ? "border-brand-500/40" : "border-line"
              }`}
              style={{ background: active ? "var(--surface-2)" : "var(--surface)" }}
            >
              <div
                className="h-9 w-full rounded-lg ring-1 ring-black/10"
                style={{ background: `linear-gradient(135deg, ${t.swatch}, ${t.bg})` }}
              />
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-fg">{t.label}</span>
                {active && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white">
                    <Check size={10} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/merchant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "password", currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setSaved(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Lock size={16} /> Security
      </h2>
      <p className="mt-1 text-sm text-fg/50">Change the password used to sign in to your merchant dashboard.</p>

      <form onSubmit={save} className="mt-6 max-w-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Current password</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">New password</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-fg/60">Confirm new password</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Update password
          </button>
          <SavedPill show={saved} />
        </div>
      </form>
    </Card>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NOTIF_KEY);
      if (stored) setPrefs({ ...DEFAULT_NOTIFS, ...JSON.parse(stored) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  function toggle(key: keyof typeof DEFAULT_NOTIFS) {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      window.localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  }

  const rows: { key: keyof typeof DEFAULT_NOTIFS; label: string; help: string }[] = [
    { key: "orderPaid", label: "Order paid", help: "Notify me the moment a customer completes checkout." },
    { key: "lowStock", label: "Low stock", help: "Notify me when a product drops below its low-stock threshold." },
    { key: "weeklySummary", label: "Weekly summary", help: "A digest of revenue and AI-assisted sales every Monday." },
  ];

  if (!loaded) return null;

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-fg">
        <Bell size={16} /> Notifications
      </h2>
      <p className="mt-1 text-sm text-fg/50">Saved to this browser. Choose what you want to hear about.</p>

      <div className="mt-6 space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 rounded-xl px-2 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <div>
              <div className="text-sm font-medium text-fg">{r.label}</div>
              <div className="mt-0.5 text-xs text-fg/50">{r.help}</div>
            </div>
            <button
              onClick={() => toggle(r.key)}
              className="focus-ring relative h-6 w-11 flex-shrink-0 rounded-full transition-colors"
              style={{ background: prefs[r.key] ? "var(--brand)" : "var(--line)" }}
              aria-pressed={prefs[r.key]}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: prefs[r.key] ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
