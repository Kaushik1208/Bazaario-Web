import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentSession, getCurrentCustomerSession } from "@/lib/auth";
import { ArrowRight, ShieldCheck, Sparkles, Workflow, Store, User } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { UserMenu } from "@/components/nav/UserMenu";

export default async function LandingPage() {
  // Degrade gracefully if the database is briefly unreachable rather than
  // taking the whole landing page down with it.
  const [demoMerchant, liveMerchants, merchantSession, customerSession] = await Promise.all([
    prisma.merchant.findFirst({ where: { isDemo: true } }).catch(() => null),
    prisma.merchant
      .findMany({ where: { isDemo: false }, orderBy: { createdAt: "desc" }, take: 6 })
      .catch(() => [] as Awaited<ReturnType<typeof prisma.merchant.findMany>>),
    getCurrentSession().catch(() => null),
    getCurrentCustomerSession().catch(() => null),
  ]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-canvas">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(1100px 560px at 88% -8%, rgba(61,93,247,0.14) 0%, transparent 58%), radial-gradient(900px 480px at 4% 10%, rgba(245,165,36,0.12) 0%, transparent 55%)",
          }}
        />
        <div className="grid-overlay absolute inset-0" />
        <div className="glow-orb h-72 w-72 animate-float bg-brand-500/20" style={{ top: "4%", right: "8%" }} />
        <div className="glow-orb h-56 w-56 animate-float-slow bg-accent-500/20" style={{ top: "22%", left: "2%" }} />
      </div>

      <header className="sticky top-0 z-30 glass border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ink to-ink/80 text-paper font-display text-sm shadow-soft">B</div>
            <span className="font-display text-lg tracking-tight text-fg">Bazaario</span>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#live-shops" className="hidden text-fg/60 transition-colors hover:text-fg sm:inline">Live shops</a>
            <a href="#how" className="hidden text-fg/60 transition-colors hover:text-fg sm:inline">How it works</a>
            <ThemeSwitcher />
            <UserMenu merchantName={merchantSession?.name ?? null} customerName={customerSession?.name ?? null} />
          </nav>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-20">
        <div className="max-w-3xl animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/15 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 shadow-soft">
            <Sparkles size={13} className="animate-pulse" /> Built for the Razorpay AI Growth &amp; Agentic Commerce Buildathon
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl">
            Make your shop
            <br />
            <span className="gradient-text">readable, sellable,</span>
            <br />
            transactable — by AI.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-fg/65">
            Bazaario isn't a chatbot bolted onto a storefront. It's the commerce layer that lets small
            merchants list a catalog once and have it discovered, compared, recommended and safely
            purchased by both human shoppers and autonomous AI buyers.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/merchant/signup"
              className="focus-ring shine group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg"
            >
              Start selling on Bazaario <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            {demoMerchant && (
              <Link
                href={`/shop/${demoMerchant.slug}`}
                className="focus-ring group inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-5 py-3 text-sm font-semibold text-fg backdrop-blur transition-all hover:-translate-y-0.5 hover:border-line"
              >
                <Store size={16} /> Try the demo store
              </Link>
            )}
          </div>
        </div>

        <div className="stagger mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Workflow size={18} />}
            title="Gated agentic architecture"
            body="Customer → LLM → Backend validation → Business rules → Customer approval → Razorpay. The model proposes; the backend always decides."
          />
          <FeatureCard
            icon={<ShieldCheck size={18} />}
            title="Bounded, explainable AI"
            body="Every recommendation, upsell and cross-sell is grounded in your live catalog and logged to a full audit trail — never invented."
          />
          <FeatureCard
            icon={<Sparkles size={18} />}
            title="Agent Commerce API"
            body="A clean, structured API layer lets external AI buyers discover, compare and purchase from your catalog directly."
          />
        </div>
      </section>

      <section id="live-shops" className="relative border-t border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl tracking-tight text-fg">Live shops on Bazaario</h2>
          <p className="mt-2 text-fg/60">Real stores, run by real merchants who signed up — each with its own catalog, phone number and location.</p>
          <div className="stagger mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveMerchants.map((m) => (
              <Link
                key={m.id}
                href={`/shop/${m.slug}`}
                className="card-hover shine group relative overflow-hidden rounded-2xl border border-line bg-canvas p-6 shadow-card"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/5 transition-transform duration-500 group-hover:scale-150" />
                {m.logoImageUrl ? (
                  <img src={m.logoImageUrl} alt={m.name} className="relative h-12 w-12 rounded-xl object-cover shadow-card" />
                ) : (
                  <div className="relative text-3xl transition-transform duration-300 group-hover:scale-110">{m.logoEmoji}</div>
                )}
                <div className="relative mt-3 font-display text-lg text-fg">{m.name}</div>
                {m.address && <p className="relative mt-0.5 text-xs text-fg/45 line-clamp-1">{m.address}</p>}
                <p className="relative mt-1 text-sm text-fg/55 line-clamp-2">{m.description}</p>
                <div className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Chat with AI shopping assistant <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
            {liveMerchants.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-line bg-canvas p-8 text-center">
                <p className="text-sm text-fg/50">No merchants have signed up yet — be the first.</p>
                <Link href="/merchant/signup" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                  Open your store <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {demoMerchant && (
            <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line bg-canvas p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
                  Try it instantly
                </span>
                <div className="mt-2 font-display text-base text-fg">{demoMerchant.name} — a fully stocked sample store</div>
                <p className="mt-1 max-w-md text-sm text-fg/55">
                  A pre-populated storefront with real order history, so you can try recommendations, upsells and checkout instantly without setting anything up.
                </p>
              </div>
              <Link
                href={`/shop/${demoMerchant.slug}`}
                className="focus-ring shine relative inline-flex flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
              >
                Open demo store <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="how" className="relative mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl tracking-tight text-fg">How a sale actually happens</h2>
        <ol className="stagger mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Customer asks", "\u201cSomething under \u20b93,000\u201d — in plain language, whatever the store sells."],
            ["AI recommends", "The assistant searches the real catalog and explains its pick."],
            ["Upsell / cross-sell", "A relevant, budget-aware alternative and add-on are offered — never forced."],
            ["Gated checkout", "Backend re-validates price & stock, customer confirms, Razorpay runs the charge."],
          ].map(([title, body], i) => (
            <li key={title} className="card-hover relative overflow-hidden rounded-2xl border border-line bg-surface p-5">
              <div className="font-display text-xs text-brand-500">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-2 font-medium text-fg">{title}</div>
              <p className="mt-1 text-sm text-fg/55">{body}</p>
              {i < 3 && (
                <ArrowRight size={14} className="absolute right-4 top-5 hidden text-fg/15 lg:block" />
              )}
            </li>
          ))}
        </ol>
      </section>

      <footer className="relative border-t border-line py-8 text-center text-xs text-fg/40">
        Built with Next.js, Prisma &amp; Razorpay Test Mode — Agent Commerce API documented at{" "}
        <code className="rounded bg-line px-1.5 py-0.5">/api/agent/*</code>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-hover shine group relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-500/5 transition-transform duration-500 group-hover:scale-150" />
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <div className="relative mt-4 font-medium text-fg">{title}</div>
      <p className="relative mt-1.5 text-sm text-fg/55">{body}</p>
    </div>
  );
}
