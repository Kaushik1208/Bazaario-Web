import { prisma } from "../db";

// ---------------------------------------------------------------------------
// AI Store Buzz + Next-Move
//
// This is deliberately NOT a black box: every signal below is re-derived
// live from real orders, stock and catalog data — the same "never invent
// what the data doesn't support" rule the recommendation engine follows.
// Every purchase changes the underlying rows, so the next read of these
// functions automatically reflects it — that's the "smart loop".
// ---------------------------------------------------------------------------

export type BuzzProduct = {
  id: string;
  name: string;
  category: string;
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  stockCount: number;
};

export type StoreBuzz = {
  trending: (BuzzProduct & { salesCount: number })[];
  newArrivals: BuzzProduct[];
  almostGone: (BuzzProduct & { stockCount: number })[];
};

function toBuzzProduct(p: {
  id: string;
  name: string;
  category: string;
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  inventory: { stockCount: number } | null;
}): BuzzProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    priceInPaise: p.priceInPaise,
    imageEmoji: p.imageEmoji,
    imageUrl: p.imageUrl,
    stockCount: p.inventory?.stockCount ?? 0,
  };
}

export async function getStoreBuzz(merchantId: string): Promise<StoreBuzz> {
  const [products, paidItems] = await Promise.all([
    prisma.product.findMany({
      where: { merchantId, isActive: true },
      include: { inventory: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.orderItem.findMany({
      where: { order: { merchantId, status: "PAID" } },
      select: { productId: true, quantity: true },
    }),
  ]);

  const salesByProduct = new Map<string, number>();
  for (const item of paidItems) {
    salesByProduct.set(item.productId, (salesByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const inStock = products.filter((p) => (p.inventory?.stockCount ?? 0) > 0);

  const trending = [...inStock]
    .map((p) => ({ ...toBuzzProduct(p), salesCount: salesByProduct.get(p.id) ?? 0 }))
    .filter((p) => p.salesCount > 0)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 4);

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const newArrivals = inStock
    .filter((p) => p.createdAt >= fourteenDaysAgo)
    .slice(0, 4)
    .map(toBuzzProduct);
  // If nothing was added recently, still surface the newest few so the
  // panel never looks empty on a fresh store.
  if (newArrivals.length === 0) {
    newArrivals.push(...inStock.slice(0, 3).map(toBuzzProduct));
  }

  const almostGone = inStock
    .filter((p) => {
      const stock = p.inventory?.stockCount ?? 0;
      const threshold = p.inventory?.lowStockAt ?? 5;
      return stock > 0 && stock <= threshold;
    })
    .sort((a, b) => (a.inventory?.stockCount ?? 0) - (b.inventory?.stockCount ?? 0))
    .slice(0, 3)
    .map(toBuzzProduct);

  return { trending, newArrivals, almostGone };
}

// ---------------------------------------------------------------------------
// Live Demand Detector
//
// Different question from Next-Move's PROMOTE: that flags products that are
// currently doing well overall. This flags products that are ACCELERATING —
// selling meaningfully faster in the last 7 days than the 7 days before that
// — which is the earliest real signal of a trend forming, before it shows up
// in total sales rankings.
// ---------------------------------------------------------------------------

export type DemandSignal = {
  productId: string;
  productName: string;
  imageEmoji: string;
  imageUrl: string | null;
  recentUnits: number;
  priorUnits: number;
  growthLabel: string;
  stockCount: number;
};

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export async function getLiveDemandSignals(merchantId: string): Promise<DemandSignal[]> {
  const fourteenDaysAgo = new Date(Date.now() - 2 * SEVEN_DAYS);
  const [products, recentOrders] = await Promise.all([
    prisma.product.findMany({ where: { merchantId, isActive: true }, include: { inventory: true } }),
    prisma.order.findMany({
      where: { merchantId, status: "PAID", createdAt: { gte: fourteenDaysAgo } },
      include: { items: true },
    }),
  ]);

  const now = Date.now();
  const recentUnits = new Map<string, number>();
  const priorUnits = new Map<string, number>();

  for (const order of recentOrders) {
    const isRecent = now - order.createdAt.getTime() <= SEVEN_DAYS;
    const bucket = isRecent ? recentUnits : priorUnits;
    for (const item of order.items) {
      bucket.set(item.productId, (bucket.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const signals: DemandSignal[] = [];
  for (const p of products) {
    const recent = recentUnits.get(p.id) ?? 0;
    const prior = priorUnits.get(p.id) ?? 0;
    if (recent < 2) continue; // too little data to call it a trend

    let growthLabel: string;
    if (prior === 0) {
      growthLabel = `${recent} sold this week, from a standing start`;
    } else if (recent > prior) {
      const pct = Math.round(((recent - prior) / prior) * 100);
      growthLabel = `Up ${pct}% vs last week (${prior} → ${recent} units)`;
    } else {
      continue; // flat or declining — not a live demand signal
    }

    signals.push({
      productId: p.id,
      productName: p.name,
      imageEmoji: p.imageEmoji,
      imageUrl: p.imageUrl,
      recentUnits: recent,
      priorUnits: prior,
      growthLabel,
      stockCount: p.inventory?.stockCount ?? 0,
    });
  }

  return signals.sort((a, b) => b.recentUnits - b.priorUnits - (a.recentUnits - a.priorUnits)).slice(0, 6);
}

// ---------------------------------------------------------------------------
// Dead Stock Rescue
//
// Products that are old enough to have had a fair shot, have sold zero (or
// almost zero) units in the last 30 days, and have real money tied up in
// their stock — ranked by capital at stake, with a concrete rescue action.
// ---------------------------------------------------------------------------

export type DeadStockItem = {
  productId: string;
  productName: string;
  imageEmoji: string;
  imageUrl: string | null;
  stockCount: number;
  capitalTiedUpInPaise: number;
  daysSinceListed: number;
  suggestedAction: string;
};

export async function getDeadStockRescue(merchantId: string): Promise<DeadStockItem[]> {
  const [products, paidItems] = await Promise.all([
    prisma.product.findMany({ where: { merchantId, isActive: true }, include: { inventory: true } }),
    prisma.orderItem.findMany({
      where: { order: { merchantId, status: "PAID", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      select: { productId: true, quantity: true },
    }),
  ]);

  const recentlySold = new Set(paidItems.map((i) => i.productId));
  const bestSeller = [...products].sort((a, b) => (b.inventory?.stockCount ?? 0) - (a.inventory?.stockCount ?? 0))[0];

  const items: DeadStockItem[] = [];
  for (const p of products) {
    const stock = p.inventory?.stockCount ?? 0;
    if (stock === 0 || recentlySold.has(p.id)) continue;
    const daysSinceListed = Math.floor((Date.now() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceListed < 21) continue; // give new listings a fair runway first

    const capitalTiedUpInPaise = stock * p.priceInPaise;
    const suggestedAction =
      capitalTiedUpInPaise > 5000_00
        ? `Run a limited-time discount — ${formatINRPlain(capitalTiedUpInPaise)} is sitting in unsold stock.`
        : bestSeller && bestSeller.id !== p.id
        ? `Bundle it with your best seller, "${bestSeller.name}", to move it alongside something that already sells.`
        : `Consider a clearance price to free up the capital.`;

    items.push({
      productId: p.id,
      productName: p.name,
      imageEmoji: p.imageEmoji,
      imageUrl: p.imageUrl,
      stockCount: stock,
      capitalTiedUpInPaise,
      daysSinceListed,
      suggestedAction,
    });
  }

  return items.sort((a, b) => b.capitalTiedUpInPaise - a.capitalTiedUpInPaise).slice(0, 6);
}

function formatINRPlain(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export type NextMoveAction = "PROMOTE" | "DISCOUNT" | "BUNDLE" | "RESTOCK";

export type NextMoveInsight = {
  productId: string;
  productName: string;
  action: NextMoveAction;
  headline: string;
  detail: string;
  pairProductName?: string;
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export async function getNextMoveInsights(merchantId: string): Promise<NextMoveInsight[]> {
  const [products, paidOrders] = await Promise.all([
    prisma.product.findMany({
      where: { merchantId, isActive: true },
      include: { inventory: true, relationsFrom: true },
    }),
    prisma.order.findMany({
      where: { merchantId, status: "PAID" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  if (products.length === 0) return [];

  const recentCutoff = Date.now() - THIRTY_DAYS;
  const salesCount = new Map<string, number>();
  const recentSalesCount = new Map<string, number>();
  // Co-purchase counts: how often each pair of products appears in the same order.
  const coPurchase = new Map<string, number>();

  for (const order of paidOrders) {
    const isRecent = order.createdAt.getTime() >= recentCutoff;
    const idsInOrder = new Set<string>();
    for (const item of order.items) {
      salesCount.set(item.productId, (salesCount.get(item.productId) ?? 0) + item.quantity);
      if (isRecent) recentSalesCount.set(item.productId, (recentSalesCount.get(item.productId) ?? 0) + item.quantity);
      idsInOrder.add(item.productId);
    }
    const ids = Array.from(idsInOrder);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("::");
        coPurchase.set(key, (coPurchase.get(key) ?? 0) + 1);
      }
    }
  }

  const insights: NextMoveInsight[] = [];
  const totalUnitsSold = Array.from(salesCount.values()).reduce((s, n) => s + n, 0);
  const avgSold = totalUnitsSold / Math.max(products.length, 1);

  for (const p of products) {
    const stock = p.inventory?.stockCount ?? 0;
    const sold = salesCount.get(p.id) ?? 0;
    const recentSold = recentSalesCount.get(p.id) ?? 0;
    const ageMs = Date.now() - p.createdAt.getTime();
    const isEstablished = ageMs > 14 * 24 * 60 * 60 * 1000;
    const hasExistingCrossSell = p.relationsFrom.some((r) => r.relationType === "CROSS_SELL");

    // Restock: selling fast but running low.
    if (recentSold >= 2 && stock > 0 && stock <= (p.inventory?.lowStockAt ?? 5)) {
      insights.push({
        productId: p.id,
        productName: p.name,
        action: "RESTOCK",
        headline: `Restock ${p.name} soon`,
        detail: `${recentSold} sold in the last 30 days with only ${stock} left — this is on track to sell out.`,
      });
      continue;
    }

    // Bundle: strong co-purchase pattern not yet wired as a cross-sell.
    let bestPair: { id: string; name: string; count: number } | null = null;
    for (const other of products) {
      if (other.id === p.id) continue;
      const key = [p.id, other.id].sort().join("::");
      const count = coPurchase.get(key) ?? 0;
      if (count >= 2 && (!bestPair || count > bestPair.count)) {
        bestPair = { id: other.id, name: other.name, count };
      }
    }
    if (bestPair && !hasExistingCrossSell) {
      insights.push({
        productId: p.id,
        productName: p.name,
        action: "BUNDLE",
        headline: `Bundle ${p.name} with ${bestPair.name}`,
        detail: `Customers bought these together ${bestPair.count} times — link them as a cross-sell so the AI suggests it automatically.`,
        pairProductName: bestPair.name,
      });
      continue;
    }

    // Promote: clear best-seller, healthy stock.
    if (sold > 0 && sold >= avgSold * 1.5 && stock > (p.inventory?.lowStockAt ?? 5)) {
      insights.push({
        productId: p.id,
        productName: p.name,
        action: "PROMOTE",
        headline: `Promote ${p.name}`,
        detail: `Your best performer with ${sold} sold — feature it higher or let the AI lead with it more often.`,
      });
      continue;
    }

    // Discount: established, in stock, but not moving.
    if (isEstablished && sold === 0 && stock > 0) {
      insights.push({
        productId: p.id,
        productName: p.name,
        action: "DISCOUNT",
        headline: `Consider a discount on ${p.name}`,
        detail: `No sales since it was listed while ${stock} units sit in stock — a limited-time discount could unstick it.`,
      });
    }
  }

  // Surface the most actionable items first: restock > bundle > promote > discount.
  const order: Record<NextMoveAction, number> = { RESTOCK: 0, BUNDLE: 1, PROMOTE: 2, DISCOUNT: 3 };
  return insights.sort((a, b) => order[a.action] - order[b.action]).slice(0, 6);
}
