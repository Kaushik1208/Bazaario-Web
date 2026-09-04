# Bazaario — AI Merchant Commerce Platform

Built for the **Razorpay AI Growth & Agentic Commerce Buildathon**.

Bazaario turns a small merchant's catalog into something an AI can *read, sell,
and safely transact against* — for human shoppers through a conversational
assistant, and for external AI buyers through a dedicated Agent Commerce API.

> **Not** an Amazon/Flipkart-style marketplace, and **not** "a chatbot bolted
> onto a store." It's the commerce layer: catalog → AI recommendation →
> guarded checkout → Razorpay.

## Architecture

```
Customer → LLM (NLU + reasoning) → Backend validation → Business rules
         → Customer approval → Razorpay
```

The LLM (used only if `OPENAI_API_KEY` is set — see below) is allowed to
*parse* the customer's message and *phrase* an explanation. It is **never**
trusted for price, stock, product existence, or discount limits — every one
of those is re-derived from the database on the backend before anything is
shown to the customer or charged. See `src/lib/validation.ts` and
`src/lib/ai/engine.ts` for exactly where that boundary is enforced.

## Runs without any API keys

Everything is designed to demo end-to-end with **zero external accounts**:

- **No `OPENAI_API_KEY`** → the recommendation engine falls back to a
  deterministic, rule-based NLU + scoring engine (`src/lib/ai/intent.ts`,
  `src/lib/ai/engine.ts`). Budget parsing, category matching, upsell and
  cross-sell selection all still work.
- **No Razorpay keys** → `src/lib/razorpay.ts` falls back to a mock Razorpay
  client that simulates order creation and payment success/failure with the
  same shapes the real SDK returns, so the full payment flow (including the
  required failure scenario) is demoable.

Set the real keys in `.env` any time to switch both on for real.

## Getting started

A working `.env` is already included (SQLite, zero setup — no server to install
or run). If it's missing for any reason, copy it from `.env.example` first.

```bash
npm install

# 1. Set up the database (creates ./dev.db, no Postgres needed)
npx prisma generate
npx prisma db push
npx prisma db seed        # seeds ONE demo merchant (GearHub) + one demo customer

# 2. Run
npm run dev
```

Bazaario is a real multi-tenant platform: anyone can sign up at `/merchant/signup`
and get their own live storefront with its own catalog, phone number and shop
photos. Exactly one merchant in the seed data (`gearhub`) is flagged as the
demo store, purely so reviewers have something to shop from with zero setup —
it's kept separate from real signups everywhere in the UI (landing page,
merchant login, dashboard).

Open:
- `http://localhost:3000` — landing page: real "Live shops" grid, plus a single
  clearly-labeled demo-store callout
- `http://localhost:3000/shop/gearhub` — the seeded demo storefront (gaming gear)
- `http://localhost:3000/merchant/signup` — create your own real store
- `http://localhost:3000/merchant/login` — merchant dashboard
  - Demo store: `owner@gearhub.demo` / `demo1234` (also fillable from a
    collapsible "Just want to try it out?" section on the login page)

This project ships configured for **SQLite by default** — the `.env` above
already points at a local `dev.db` file, so the steps above work with no
database server to install or run. The schema deliberately avoids
Postgres-only types (enums, arrays) so switching providers is a one-line change.

## Deploying so anyone can use it — not just localhost

The app above only runs on your machine until it's deployed somewhere public.
The straightforward path for this stack (Next.js + Prisma) is **Vercel** for
the app plus a small **hosted Postgres** database, since SQLite's local file
doesn't survive on serverless hosting (the filesystem isn't persistent between
requests).

1. **Get a free Postgres database.** [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) both have a free tier — create a project
   and copy the connection string they give you (looks like
   `postgresql://user:pass@host/dbname?sslmode=require`).

2. **Switch the schema back to Postgres.** In `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Push your code to GitHub** (a plain `git init && git add . && git commit`
   and push to a new repo, if it isn't already).

4. **Import the repo on [vercel.com](https://vercel.com)** — "Add New
   Project" → pick the repo → it auto-detects Next.js.

5. **Set environment variables** in the Vercel project settings, matching
   `.env.example`:
   - `DATABASE_URL` — the Postgres connection string from step 1
   - `JWT_SECRET` — a long random string (generate one with
     `openssl rand -hex 32`)
   - Optionally `OPENAI_API_KEY` and the `RAZORPAY_*` keys if you want the
     real LLM/payment paths instead of the built-in mocks

6. **Deploy.** Vercel builds and gives you a public `https://your-app.vercel.app`
   URL immediately.

7. **Create the tables and seed the demo store**, once, against that live
   database — easiest from your own machine, pointed at the same
   `DATABASE_URL`:
   ```bash
   DATABASE_URL="<your Neon/Supabase URL>" npx prisma db push
   DATABASE_URL="<your Neon/Supabase URL>" npm run db:seed
   ```

After that, the public URL and `localhost:3000` both work — same code, same
database, just two different addresses pointing at it.

## Demo script (matches the buildathon judging flow)

1. Log in to the merchant dashboard, open **Products** — see the seeded
   catalog, edit a price/stock, or add a new product.
2. Open **Rules** — set a max transaction amount or discount limit; these are
   enforced server-side on every checkout, not just displayed.
3. Open a storefront (`/shop/gearhub`) in another tab and type:
   *"I need gaming headphones under ₹3,000."*
4. The assistant recommends a real, in-stock product with a grounded reason,
   offers a relevant upsell within budget, and a cross-sell add-on — each as
   its own card with its own **Add to cart** button (nothing is forced).
5. Add the recommendation and the cross-sell, open the cart, **Proceed to
   payment**. The backend re-validates price/stock/rules independently before
   creating the Razorpay order.
6. Confirm payment → success. Check the merchant dashboard: **Orders** shows
   the sale, **Revenue** shows the AI uplift, **AI performance** shows the
   accepted upsell/cross-sell, **Audit logs** shows the full trail from
   `CUSTOMER_REQUEST` → `CATALOG_SEARCH` → `PRODUCT_RECOMMENDATION` →
   `PRICE_VALIDATED` → `RAZORPAY_ORDER_CREATED` → `PAYMENT_RESULT`.
7. Run the flow again and use **"Demo: simulate a declined payment instead"**
   on the payment sheet — the order stays unpaid, no duplicate charge is
   created, and the failure is logged (`PAYMENT_FAILED`). Use **Retry
   payment** to show an explicit, customer-authorized retry (never automatic).
8. Show the **Agent Commerce API** working for an external AI buyer, e.g.:

   ```bash
   curl "http://localhost:3000/api/agent/catalog?merchantSlug=gearhub"

   curl -X POST http://localhost:3000/api/agent/recommend \
     -H "Content-Type: application/json" \
     -d '{"merchantSlug":"gearhub","query":"mechanical keyboard","sessionId":"agent-demo-1"}'

   curl -X POST http://localhost:3000/api/agent/cart \
     -H "Content-Type: application/json" \
     -d '{"merchantSlug":"gearhub","sessionId":"agent-demo-1","action":"add","productId":"<id from above>"}'

   curl -X POST http://localhost:3000/api/agent/checkout \
     -H "Content-Type: application/json" \
     -d '{"merchantSlug":"gearhub","sessionId":"agent-demo-1","confirm":true}'
   ```

   Every one of these calls is logged to the same audit trail with
   `actor: "AGENT_API"`.

## API surface

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/signup` |
| Customer auth | `POST /api/customer/auth/signup`, `POST /api/customer/auth/login`, `POST /api/customer/auth/logout`, `GET /api/customer/auth/me` |
| Merchant | `GET/POST /api/merchant/products`, `PATCH/DELETE /api/merchant/products/:id`, `GET /api/merchant/orders`, `GET/POST /api/merchant/rules`, `GET /api/merchant/stats`, `GET /api/merchant/audit-logs`, `GET/PATCH /api/merchant/settings`, `GET /api/merchant/next-move`, `GET /api/merchant/demand-detector`, `GET /api/merchant/dead-stock` |
| Customer account | `GET/PATCH /api/customer/settings`, `GET/POST/DELETE /api/customer/saved-items`, `GET /api/customer/orders` |
| AI | `POST /api/ai/chat` |
| Store Buzz | `GET /api/shop/buzz`, `GET /api/shop/categories` |
| Commerce | `GET/POST/DELETE /api/cart`, `GET /api/orders` |
| Payment | `POST /api/payment/create-order`, `POST /api/payment/verify`, `POST /api/payment/retry`, `POST /api/payment/webhook` |
| Agent Commerce | `GET /api/agent/catalog`, `POST /api/agent/search`, `POST /api/agent/recommend`, `POST /api/agent/cart`, `POST /api/agent/checkout` |

## AI Store Buzz + Next-Move (+ Live Demand Detector, Dead Stock Rescue, Smart Bundle)

An innovation layer on top of the core recommendation engine, computed live
from real orders and stock (`src/lib/ai/buzz.ts`, `src/lib/ai/engine.ts`) —
nothing is fabricated, consistent with the rest of the app's "never invent
what the data doesn't support" rule:

- **Store Buzz** (customer-facing, shown above the chat on every storefront):
  trending products (by real sales in paid orders), new arrivals, and
  "almost gone" items at or below their low-stock threshold.
- **Intent-Based Shopping** (customer-facing, in the chat): the AI shows what
  it actually understood from your message — detected category, budget, and
  preferences — as a small chip row above its recommendation, so the
  "understanding" isn't a black box.
- **Urgency Intelligence** (customer-facing): any recommended, upsell, or
  cross-sell product with 5 or fewer units left gets a real urgency badge and
  a sentence in the AI's own reply — genuinely tied to live stock, not staged.
- **Smart Bundle** (customer-facing): when a strong product pairing exists,
  the AI offers both together as a single bundle with one combined price and
  one "add both" action, instead of only ever suggesting one product at a time.
- **Next-Move** (merchant-facing, dashboard Overview): restock a fast seller
  running low, bundle two products with a strong co-purchase pattern, promote
  a clear best-seller, or consider a discount on something that's been listed
  a while with zero sales.
- **Live Demand Detector** (merchant-facing): compares each product's last-7-days
  sales velocity against the 7 days before that, to catch demand *accelerating*
  — the earliest signal of a trend, before it would show up in total sales.
- **Dead Stock Rescue** (merchant-facing): flags listings 21+ days old with no
  sales in the last 30 days, ranked by real capital tied up (stock × price),
  each with a concrete suggested action.
- **Smart loop**: all of the above re-derive their answer from `Order`/
  `OrderItem`/`Inventory` on every read, so the next purchase automatically
  changes what they show — no caching, no separate event pipeline to keep in sync.

## Project structure

```
prisma/schema.prisma        Merchant, User, Product, Inventory, ProductRelation,
                             MerchantRule, Cart, CartItem, Order, OrderItem,
                             Payment, AuditLog, AIInteraction
prisma/seed.ts               1 demo merchant (isDemo: true), 13 products, relations, rules

src/lib/
  db.ts                      Prisma client singleton
  auth.ts                    JWT session cookies for merchant login
  validation.ts               Backend guardrail layer — re-derives price/stock/
                              rules independently of any client or LLM input
  cart.ts                    Cart read/write helpers shared by chat + agent API
  razorpay.ts                Razorpay wrapper with a mock fallback
  audit.ts                   Structured audit log writer
  ai/intent.ts                Rule-based NLU fallback (budget/category/prefs)
  ai/engine.ts                Recommendation + upsell/cross-sell engine
                              (rule-based core, optional OpenAI-assisted layer,
                              every LLM-suggested product re-validated live)

src/app/
  page.tsx                    Landing page
  merchant/login               Merchant login
  merchant/dashboard/*         Overview, Products, Orders, Revenue,
                              AI performance, Rules, Audit logs
  shop/[merchantSlug]           Customer AI shopping interface
  api/*                        All routes listed above

src/components/
  merchant/*                  Dashboard shell + shared UI primitives
  shop/*                      Chat UI, product recommendation cards,
                              cart drawer, payment modal
```

## Notes on what's mocked vs. real

- **Auth** is a hand-rolled JWT-in-httpOnly-cookie flow rather than
  Auth.js/Clerk, to keep the project dependency-light and easy to run without
  extra provider setup. It's a straightforward swap if you'd rather wire in
  Auth.js.
- **Database**: schema is written for PostgreSQL as requested, and avoids
  Postgres-only types so the same schema also runs on SQLite for a
  zero-infrastructure local demo (see above).
- **Payments/AI** gracefully degrade to deterministic mocks when API keys
  aren't configured, as described above — this is intentional so the judged
  demo never depends on live third-party credentials being present, while
  still being real, swap-in-your-keys-and-go integrations.
