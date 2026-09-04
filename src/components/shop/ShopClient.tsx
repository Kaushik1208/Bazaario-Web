"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { getOrCreateSessionId } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { ProductCard, type CardProduct } from "./ProductCard";
import { SmartBundleCard } from "./SmartBundleCard";
import { StoreBuzz } from "./StoreBuzz";
import { CartDrawer, type CartItemView } from "./CartDrawer";
import { PaymentModal } from "./PaymentModal";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import Link from "next/link";
import { ShoppingCart, Send, Bot, User, Sparkles, UserCircle, Search } from "lucide-react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type ChatIntent = { category: string | null; maxBudgetInPaise: number | null; preferences: string[] };
type ChatBundle = { items: CardProduct[]; totalInPaise: number } | null;

type ChatMessage = {
  id: string;
  role: "assistant" | "customer";
  text: string;
  intent?: ChatIntent | null;
  recommended?: CardProduct | null;
  upsell?: CardProduct | null;
  crossSell?: CardProduct | null;
  bundle?: ChatBundle;
  time: string;
};

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ShopClient({ merchantSlug, merchantName, logoEmoji }: { merchantSlug: string; merchantName: string; logoEmoji: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [hasCatalog, setHasCatalog] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputPlaceholder, setInputPlaceholder] = useState("Tell me what you're looking for and your budget");

  const [isCustomer, setIsCustomer] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemView[]>([]);
  const [subtotalInPaise, setSubtotalInPaise] = useState(0);

  const [checkingOut, setCheckingOut] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [payment, setPayment] = useState<{
    open: boolean;
    orderId: string | null;
    razorpayOrderId: string | null;
    razorpayKeyId: string | null;
    totalInPaise: number;
    isMockPayments: boolean;
    phase: "confirm" | "processing" | "success" | "failed";
    failureReason?: string | null;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sid = getOrCreateSessionId(merchantSlug);
    setSessionId(sid);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        text: `Hi! I'm the shopping assistant for ${merchantName}. Tell me what you're looking for and your budget, or tap a suggestion below.`,
        time: nowLabel(),
      },
    ]);
    refreshCart(sid);

    fetch(`/api/shop/categories?merchantSlug=${merchantSlug}`)
      .then((r) => r.json())
      .then((d: { hasProducts: boolean; categories: { category: string; name: string; priceInPaise: number }[] }) => {
        setHasCatalog(Boolean(d.hasProducts));
        const built = d.categories.slice(0, 4).map((c) => `Show me ${c.category.toLowerCase()} under ${formatINR(Math.round(c.priceInPaise * 1.2))}`);
        setSuggestions(built.length > 0 ? built : ["What's trending here?", "Something for a gift", "Best value option"]);
        if (d.categories[0]) {
          setInputPlaceholder(`e.g. I need ${d.categories[0].category.toLowerCase()} under ${formatINR(Math.round(d.categories[0].priceInPaise * 1.2))}`);
        }
        if (!d.hasProducts) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              text: `${merchantName} hasn't listed any products yet — nothing for me to recommend right now. Check back soon, or if this is your store, add products from your merchant dashboard.`,
              time: nowLabel(),
            },
          ]);
        }
      })
      .catch(() => {});

    fetch("/api/customer/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setIsCustomer(Boolean(d.customer));
        if (d.customer) {
          fetch("/api/customer/saved-items")
            .then((r) => r.json())
            .then((sd) => {
              const map: Record<string, boolean> = {};
              for (const item of sd.items ?? []) map[item.productId] = true;
              setSavedIds(map);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantSlug]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function refreshCart(sid: string) {
    const res = await fetch(`/api/cart?merchantSlug=${merchantSlug}&sessionId=${sid}`);
    const data = await res.json();
    const items = (data.cart?.items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      imageEmoji: i.product.imageEmoji,
      quantity: i.quantity,
      unitPriceInPaise: i.unitPriceInPaise,
      addedVia: i.addedVia,
    }));
    setCartItems(items);
    setSubtotalInPaise(data.cart?.subtotalInPaise ?? 0);
  }

  async function sendMessage(e: React.FormEvent, override?: string) {
    e.preventDefault();
    const text = (override ?? input).trim();
    if (!text || !sessionId || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "customer", text, time: nowLabel() }]);
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantSlug, sessionId, message: text }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: data.reply ?? "Sorry, something went wrong.",
          intent: data.intent,
          recommended: data.recommended,
          upsell: data.upsell,
          crossSell: data.crossSell,
          bundle: data.bundle,
          time: nowLabel(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `err_${Date.now()}`, role: "assistant", text: "I couldn't reach the store right now — please try again.", time: nowLabel() },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function quickAsk(text: string) {
    sendMessage({ preventDefault: () => {} } as React.FormEvent, text);
  }

  async function addToCart(product: CardProduct, addedVia: "AI_RECOMMENDATION" | "AI_UPSELL" | "AI_CROSS_SELL") {
    if (!sessionId) return;
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantSlug, sessionId, productId: product.id, quantity: 1, addedVia }),
    });
    if (res.ok) {
      setAddedIds((a) => ({ ...a, [product.id]: true }));
      refreshCart(sessionId);
    }
  }

  async function addBundleToCart(items: CardProduct[]) {
    if (!sessionId) return;
    await Promise.all(
      items.map((item) =>
        fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantSlug, sessionId, productId: item.id, quantity: 1, addedVia: "AI_CROSS_SELL" }),
        })
      )
    );
    setAddedIds((a) => {
      const next = { ...a };
      for (const item of items) next[item.id] = true;
      return next;
    });
    refreshCart(sessionId);
  }

  async function toggleSave(productId: string) {
    if (!isCustomer) {
      window.location.href = `/login?next=${encodeURIComponent(`/shop/${merchantSlug}`)}`;
      return;
    }
    const alreadySaved = Boolean(savedIds[productId]);
    setSavedIds((s) => ({ ...s, [productId]: !alreadySaved }));
    if (alreadySaved) {
      await fetch("/api/customer/saved-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    } else {
      await fetch("/api/customer/saved-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    }
  }

  async function removeFromCart(productId: string) {
    if (!sessionId) return;
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantSlug, sessionId, productId }),
    });
    refreshCart(sessionId);
  }

  async function startCheckout() {
    if (!sessionId) return;
    setCheckingOut(true);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantSlug, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not start checkout.");
        return;
      }
      setCartOpen(false);
      setPayment({
        open: true,
        orderId: data.orderId,
        razorpayOrderId: data.razorpayOrderId,
        razorpayKeyId: data.razorpayKeyId || null,
        totalInPaise: data.totalInPaise,
        isMockPayments: data.isMockPayments,
        phase: "confirm",
      });
    } finally {
      setCheckingOut(false);
    }
  }

  // Verifies whatever the payment step produced — either the mock's
  // simulated outcome, or the real razorpay_payment_id/signature returned
  // by Checkout.js — against the backend, which is the only source of truth.
  async function verifyPayment(body: Record<string, unknown>) {
    const res = await fetch("/api/payment/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && data.status === "PAID") {
      setPayment((p) => (p ? { ...p, phase: "success" } : p));
      if (sessionId) refreshCart(sessionId);
    } else {
      setPayment((p) => (p ? { ...p, phase: "failed", failureReason: data.reason || data.error } : p));
    }
  }

  // "confirm"/"failure" only ever apply in mock mode (no real Razorpay keys
  // configured) so the demo failure scenario can still be shown deterministically.
  async function confirmPayment(simulateOutcome: "success" | "failure") {
    if (!payment?.orderId) return;

    if (payment.isMockPayments) {
      setPayment((p) => (p ? { ...p, phase: "processing" } : p));
      await verifyPayment({ orderId: payment.orderId, simulateOutcome });
      return;
    }

    // Real Razorpay Test Mode: launch the actual Checkout.js widget.
    if (!razorpayReady || !window.Razorpay || !payment.razorpayOrderId || !payment.razorpayKeyId) {
      setPayment((p) => (p ? { ...p, phase: "failed", failureReason: "Razorpay checkout could not be loaded." } : p));
      return;
    }

    const rzp = new window.Razorpay({
      key: payment.razorpayKeyId,
      amount: payment.totalInPaise,
      currency: "INR",
      order_id: payment.razorpayOrderId,
      name: merchantName,
      description: "Order payment (Razorpay Test Mode)",
      theme: { color: "#111827" },
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
        setPayment((p) => (p ? { ...p, phase: "processing" } : p));
        verifyPayment({
          orderId: payment.orderId,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
      modal: {
        // Customer closed the widget without paying — back to the confirm
        // screen rather than treating it as a failed/charged payment.
        ondismiss: () => setPayment((p) => (p ? { ...p, phase: "confirm" } : p)),
      },
    });
    rzp.open();
  }

  async function retryPayment() {
    if (!payment?.orderId) return;
    setPayment((p) => (p ? { ...p, phase: "processing" } : p));
    const res = await fetch("/api/payment/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: payment.orderId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPayment((p) => (p ? { ...p, phase: "failed", failureReason: data.error } : p));
      return;
    }
    setPayment((p) =>
      p
        ? {
            ...p,
            phase: "confirm",
            totalInPaise: data.totalInPaise,
            isMockPayments: data.isMockPayments,
            razorpayOrderId: data.razorpayOrderId,
            razorpayKeyId: data.razorpayKeyId || null,
          }
        : p
    );
  }

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--bg)", backgroundImage: "var(--bg-grad)" }}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
      />

      <header
        className="flex items-center justify-between border-b px-5 py-3.5 backdrop-blur-sm"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg shadow-card"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
          >
            {logoEmoji}
          </div>
          <div>
            <div className="font-display text-sm leading-tight" style={{ color: "var(--fg)" }}>
              {merchantName}
            </div>
            <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--fg-muted)" }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--success)" }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
              </span>
              AI assistant online
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Link
            href="/account"
            className="focus-ring flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--fg-muted)" }}
            aria-label="Account"
          >
            <UserCircle size={16} />
          </Link>
          <button
            onClick={() => setCartOpen(true)}
            className="focus-ring relative flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors"
            style={{ borderColor: "var(--line)", color: "var(--fg-muted)" }}
          >
            <ShoppingCart size={16} />
            Cart
            {cartCount > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <StoreBuzz merchantSlug={merchantSlug} onAsk={(text) => quickAsk(text)} />

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-4 py-5 sm:px-8">
        {messages.map((m) => (
          <div key={m.id} className={`flex animate-fade-up gap-3 ${m.role === "customer" ? "flex-row-reverse" : ""}`}>
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-card"
              style={
                m.role === "customer"
                  ? { background: "var(--surface-2)", color: "var(--fg)" }
                  : { background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }
              }
            >
              {m.role === "customer" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-2xl space-y-3 ${m.role === "customer" ? "items-end text-right" : ""}`}>
              <div className={`flex items-baseline gap-2 ${m.role === "customer" ? "flex-row-reverse" : ""}`}>
                <div
                  className="inline-block rounded-2xl px-4 py-2.5 text-sm shadow-card"
                  style={
                    m.role === "customer"
                      ? { background: "var(--bubble-user)", color: "var(--bubble-user-fg)" }
                      : { background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--line)" }
                  }
                >
                  {m.text}
                </div>
                <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                  {m.time}
                </span>
              </div>
              {m.role === "assistant" && m.intent && (m.intent.category || m.intent.maxBudgetInPaise || m.intent.preferences.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>
                    <Search size={10} /> Understood
                  </span>
                  {m.intent.category && (
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--surface-2)", color: "var(--fg)" }}>
                      {m.intent.category}
                    </span>
                  )}
                  {m.intent.maxBudgetInPaise != null && (
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--surface-2)", color: "var(--fg)" }}>
                      Under {formatINR(m.intent.maxBudgetInPaise)}
                    </span>
                  )}
                  {m.intent.preferences.slice(0, 3).map((pref) => (
                    <span key={pref} className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "var(--surface-2)", color: "var(--fg)" }}>
                      {pref}
                    </span>
                  ))}
                </div>
              )}
              {m.recommended && (
                <ProductCard
                  product={m.recommended}
                  kind="recommended"
                  added={Boolean(addedIds[m.recommended.id])}
                  onAdd={() => addToCart(m.recommended!, "AI_RECOMMENDATION")}
                  onToggleSave={() => toggleSave(m.recommended!.id)}
                  saved={Boolean(savedIds[m.recommended.id])}
                />
              )}
              {m.upsell && (
                <ProductCard
                  product={m.upsell}
                  kind="upsell"
                  added={Boolean(addedIds[m.upsell.id])}
                  onAdd={() => addToCart(m.upsell!, "AI_UPSELL")}
                  onToggleSave={() => toggleSave(m.upsell!.id)}
                  saved={Boolean(savedIds[m.upsell.id])}
                />
              )}
              {m.bundle ? (
                <SmartBundleCard
                  items={m.bundle.items}
                  totalInPaise={m.bundle.totalInPaise}
                  added={m.bundle.items.every((it) => addedIds[it.id])}
                  onAddBundle={() => addBundleToCart(m.bundle!.items)}
                />
              ) : (
                m.crossSell && (
                  <ProductCard
                    product={m.crossSell}
                    kind="crossSell"
                    added={Boolean(addedIds[m.crossSell.id])}
                    onAdd={() => addToCart(m.crossSell!, "AI_CROSS_SELL")}
                    onToggleSave={() => toggleSave(m.crossSell!.id)}
                    saved={Boolean(savedIds[m.crossSell.id])}
                  />
                )
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex animate-fade-up items-center gap-3">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-card"
              style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
            >
              <Bot size={14} />
            </div>
            <div
              className="dot-bounce flex items-center gap-1 rounded-2xl px-4 py-3 shadow-card"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--fg-muted)" }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--fg-muted)" }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--fg-muted)" }} />
            </div>
          </div>
        )}

        {messages.length === 1 && !sending && hasCatalog && suggestions.length > 0 && (
          <div className="ml-11 flex flex-wrap gap-2 animate-fade-up">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={(e) => sendMessage(e, s)}
                className="focus-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors hover:opacity-80"
                style={{ borderColor: "var(--line)", color: "var(--fg-muted)", background: "var(--surface)" }}
              >
                <Sparkles size={11} style={{ color: "var(--brand)" }} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="border-t px-4 py-3 sm:px-8"
        style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!hasCatalog}
            placeholder={hasCatalog ? inputPlaceholder : "This store hasn't listed products yet"}
            className="focus-ring flex-1 rounded-full border px-4 py-2.5 text-sm transition-shadow disabled:opacity-50"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--fg)" }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || !hasCatalog}
            className="focus-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))", color: "var(--brand-fg)" }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        subtotalInPaise={subtotalInPaise}
        onRemove={removeFromCart}
        onCheckout={startCheckout}
        checkingOut={checkingOut}
      />

      {payment?.open && (
        <PaymentModal
          totalInPaise={payment.totalInPaise}
          isMockPayments={payment.isMockPayments}
          phase={payment.phase}
          failureReason={payment.failureReason}
          onClose={() => setPayment(null)}
          onConfirm={confirmPayment}
          onRetry={retryPayment}
        />
      )}
    </div>
  );
}
