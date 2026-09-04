import { prisma } from "../db";
import { parseIntentRuleBased, type CustomerIntent } from "./intent";
import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
export const isLLMEnabled = Boolean(openai);

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  priceInPaise: number;
  imageEmoji: string;
  imageUrl: string | null;
  stockCount: number;
};

async function getActiveCatalog(merchantId: string): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({
    where: { merchantId, isActive: true },
    include: { inventory: true },
    orderBy: { priceInPaise: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    features: safeParseFeatures(p.features),
    priceInPaise: p.priceInPaise,
    imageEmoji: p.imageEmoji,
    imageUrl: p.imageUrl,
    stockCount: p.inventory?.stockCount ?? 0,
  }));
}

function safeParseFeatures(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getKnownCategories(merchantId: string): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { merchantId, isActive: true },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category);
}

export type RecommendedProduct = CatalogProduct & { reason: string; urgent: boolean };

export type RecommendationResult = {
  reply: string;
  intent: CustomerIntent;
  recommended: RecommendedProduct | null;
  upsell: RecommendedProduct | null;
  crossSell: RecommendedProduct | null;
  bundle: { items: RecommendedProduct[]; totalInPaise: number } | null;
  alternatives: CatalogProduct[];
  usedLLM: boolean;
};

// ---- Rule-based candidate selection (always runs — this is what actually
// decides *which real products* can be shown; the LLM, when available, is
// only used to parse fuzzy language and phrase the explanation). ----

function scoreProduct(p: CatalogProduct, intent: CustomerIntent): number {
  let score = 0;
  if (intent.category && p.category === intent.category) score += 5;
  const haystack = `${p.name} ${p.description} ${p.features.join(" ")}`.toLowerCase();
  for (const pref of intent.preferences) {
    if (haystack.includes(pref.toLowerCase())) score += 1;
  }
  if (intent.maxBudgetInPaise != null) {
    if (p.priceInPaise <= intent.maxBudgetInPaise) {
      // prefer higher spec (closer to budget) among in-budget items
      score += (p.priceInPaise / intent.maxBudgetInPaise) * 2;
    } else {
      score -= 10; // over budget — heavily penalized for the primary pick
    }
  }
  if (p.stockCount <= 0) score -= 100;
  return score;
}

function ruleBasedRecommend(catalog: CatalogProduct[], intent: CustomerIntent) {
  let pool = catalog.filter((p) => p.stockCount > 0);
  if (intent.category) pool = pool.filter((p) => p.category === intent.category);
  if (pool.length === 0) pool = catalog.filter((p) => p.stockCount > 0);

  const inBudget = intent.maxBudgetInPaise != null ? pool.filter((p) => p.priceInPaise <= intent.maxBudgetInPaise!) : pool;
  const primaryPool = inBudget.length > 0 ? inBudget : pool;

  const ranked = [...primaryPool].sort((a, b) => scoreProduct(b, intent) - scoreProduct(a, intent));
  const primary = ranked[0] ?? null;

  let upsell: CatalogProduct | null = null;
  if (primary) {
    const upsellCandidates = pool
      .filter((p) => p.id !== primary.id && p.category === primary.category && p.priceInPaise > primary.priceInPaise)
      .filter((p) => (intent.maxBudgetInPaise != null ? p.priceInPaise <= intent.maxBudgetInPaise! * 1.15 : true))
      .sort((a, b) => a.priceInPaise - b.priceInPaise);
    upsell = upsellCandidates[0] ?? null;
  }

  const alternatives = ranked.slice(1, 4).filter((p) => p.id !== upsell?.id);

  return { primary, upsell, alternatives };
}

async function getCrossSellCandidate(productId: string): Promise<CatalogProduct | null> {
  const relation = await prisma.productRelation.findFirst({
    where: { fromProductId: productId, relationType: "CROSS_SELL" },
    include: { toProduct: { include: { inventory: true } } },
  });
  if (!relation || !relation.toProduct.isActive) return null;
  const stock = relation.toProduct.inventory?.stockCount ?? 0;
  if (stock <= 0) return null;
  return {
    id: relation.toProduct.id,
    name: relation.toProduct.name,
    category: relation.toProduct.category,
    description: relation.toProduct.description,
    features: safeParseFeatures(relation.toProduct.features),
    priceInPaise: relation.toProduct.priceInPaise,
    imageEmoji: relation.toProduct.imageEmoji,
    imageUrl: relation.toProduct.imageUrl,
    stockCount: stock,
  };
}

function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

// Urgency Intelligence — a universal "running low" threshold used consistently
// across the chat reply text, product cards, and the bundle offer below.
const URGENT_STOCK_THRESHOLD = 5;
function isUrgent(p: { stockCount: number }) {
  return p.stockCount > 0 && p.stockCount <= URGENT_STOCK_THRESHOLD;
}
function urgencyPhrase(p: { stockCount: number }) {
  return isUrgent(p) ? ` Only ${p.stockCount} left in stock — it's likely to sell out soon.` : "";
}

function templateReason(p: CatalogProduct, intent: CustomerIntent, kind: "primary" | "upsell"): string {
  const budgetPhrase = intent.maxBudgetInPaise != null ? ` and fits your budget of ${rupees(intent.maxBudgetInPaise)}` : "";
  const feature = p.features[0] ? ` — it stands out for ${p.features[0].toLowerCase()}` : "";
  if (kind === "primary") {
    return `The ${p.name} is ${rupees(p.priceInPaise)}${budgetPhrase}${feature}.`;
  }
  return `There's also the ${p.name} at ${rupees(p.priceInPaise)} with ${p.features[0]?.toLowerCase() ?? "extra features"} — a solid step up if you'd like more.`;
}

// Optional: ask the LLM to parse fuzzy intent + phrase a natural reply,
// strictly grounded in a catalog snapshot we hand it. Every product id it
// returns is re-validated against the live database before use — the LLM
// never gets to invent a product, price, or stock level.
async function llmAssist(message: string, catalog: CatalogProduct[], ruleIntent: CustomerIntent) {
  if (!openai) return null;
  try {
    const catalogSnapshot = catalog.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price_rupees: p.priceInPaise / 100,
      features: p.features,
      in_stock: p.stockCount > 0,
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a shopping assistant for a small merchant. You will be given the customer's message and the FULL real catalog as JSON. " +
            "You must only ever refer to products by the exact 'id' values given — never invent an id, name, price, or stock status. " +
            "Return strict JSON: {\"category\": string|null, \"max_budget_rupees\": number|null, \"preferences\": string[], " +
            "\"recommended_id\": string|null, \"reason\": string, \"reply\": string}. " +
            "\"reply\" should be one short, friendly sentence introducing the recommendation. Do not mention prices you weren't given.",
        },
        { role: "user", content: `Catalog: ${JSON.stringify(catalogSnapshot)}\n\nCustomer message: ${message}` },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as {
      category?: string | null;
      max_budget_rupees?: number | null;
      preferences?: string[];
      recommended_id?: string | null;
      reason?: string;
      reply?: string;
    };
  } catch {
    return null; // any LLM failure silently falls back to rule-based path
  }
}

export async function runRecommendation(merchantId: string, message: string): Promise<RecommendationResult> {
  const catalog = await getActiveCatalog(merchantId);
  const categories = Array.from(new Set(catalog.map((p) => p.category)));
  const ruleIntent = parseIntentRuleBased(message, categories);

  const llm = await llmAssist(message, catalog, ruleIntent);

  const mergedIntent: CustomerIntent = {
    category: (llm?.category && categories.includes(llm.category)) ? llm.category : ruleIntent.category,
    maxBudgetInPaise:
      typeof llm?.max_budget_rupees === "number" ? Math.round(llm.max_budget_rupees * 100) : ruleIntent.maxBudgetInPaise,
    preferences: llm?.preferences?.length ? llm.preferences : ruleIntent.preferences,
  };

  const { primary, upsell, alternatives } = ruleBasedRecommend(catalog, mergedIntent);

  // Only trust the LLM's chosen product if it is a real, in-stock product —
  // otherwise fall back to the rule-based pick.
  let recommended = primary;
  if (llm?.recommended_id) {
    const llmPick = catalog.find((p) => p.id === llm.recommended_id && p.stockCount > 0);
    if (llmPick) recommended = llmPick;
  }

  if (!recommended) {
    return {
      reply: "I couldn't find a matching product in stock right now — could you tell me a bit more about what you're looking for, or a different budget?",
      intent: mergedIntent,
      recommended: null,
      upsell: null,
      crossSell: null,
      bundle: null,
      alternatives: [],
      usedLLM: Boolean(llm),
    };
  }

  const crossSell = await getCrossSellCandidate(recommended.id);

  const reason =
    (llm?.recommended_id === recommended.id && llm?.reason ? llm.reason : templateReason(recommended, mergedIntent, "primary")) +
    urgencyPhrase(recommended);
  const upsellFinal = upsell && recommended.id !== upsell.id ? upsell : null;

  const reply =
    llm?.reply && llm.recommended_id === recommended.id
      ? llm.reply
      : `Based on what you're looking for, I'd recommend the ${recommended.name}.`;

  const recommendedFinal = { ...recommended, reason, urgent: isUrgent(recommended) };
  const upsellFinalOut = upsellFinal
    ? { ...upsellFinal, reason: templateReason(upsellFinal, mergedIntent, "upsell") + urgencyPhrase(upsellFinal), urgent: isUrgent(upsellFinal) }
    : null;
  const crossSellFinal = crossSell
    ? { ...crossSell, reason: `Pairs well with the ${recommended.name}.` + urgencyPhrase(crossSell), urgent: isUrgent(crossSell) }
    : null;

  // Smart Bundle — when a strong pairing exists, offer it as a single
  // two-item bundle rather than only ever surfacing one product at a time.
  // No invented discount: the combined price is a real sum of real prices.
  const bundle =
    crossSellFinal && recommended.id !== crossSellFinal.id
      ? {
          items: [recommendedFinal, crossSellFinal],
          totalInPaise: recommendedFinal.priceInPaise + crossSellFinal.priceInPaise,
        }
      : null;

  return {
    reply,
    intent: mergedIntent,
    recommended: recommendedFinal,
    upsell: upsellFinalOut,
    crossSell: crossSellFinal,
    bundle,
    alternatives,
    usedLLM: Boolean(llm),
  };
}
