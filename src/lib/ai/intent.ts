export type CustomerIntent = {
  category: string | null;
  maxBudgetInPaise: number | null;
  preferences: string[];
};

// Deterministic, dependency-free NLU fallback. Runs always as a safety net,
// and as the sole engine when no OPENAI_API_KEY is configured.
export function parseIntentRuleBased(message: string, knownCategories: string[]): CustomerIntent {
  const lower = message.toLowerCase();

  // Budget: "under 3000", "under ₹3,000", "below rs 3000", "budget of 2500"
  let maxBudgetInPaise: number | null = null;
  const budgetMatch = lower.match(
    /(?:under|below|less than|within|upto|up to|budget(?: of)?|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i
  );
  if (budgetMatch) {
    const n = Number(budgetMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(n)) maxBudgetInPaise = n * 100;
  } else {
    const bareRupee = lower.match(/₹\s*([\d,]+)/);
    if (bareRupee) {
      const n = Number(bareRupee[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) maxBudgetInPaise = n * 100;
    }
  }

  // Category: substring match against known catalog categories (longest first).
  const sortedCats = [...knownCategories].sort((a, b) => b.length - a.length);
  let category: string | null = null;
  for (const cat of sortedCats) {
    if (lower.includes(cat.toLowerCase())) {
      category = cat;
      break;
    }
  }
  // Also try singular forms / common synonyms for a few categories.
  if (!category) {
    const synonymMap: Record<string, string[]> = {
      Headphones: ["headphone", "earphone", "earbud"],
      Mouse: ["mice"],
      Keyboard: ["keyboards"],
      Footwear: ["shoe", "shoes", "sneaker"],
    };
    for (const cat of knownCategories) {
      const syns = synonymMap[cat] ?? [];
      if (syns.some((s) => lower.includes(s))) {
        category = cat;
        break;
      }
    }
  }

  const preferences: string[] = [];
  const prefWords = [
    // gadgets / electronics
    "wireless", "bluetooth", "rgb", "mechanical", "lightweight", "waterproof",
    "noise cancelling", "noise-cancelling", "long battery", "fast charging",
    // apparel / footwear
    "running", "cotton", "leather", "handmade", "breathable", "waterproof",
    // food / grocery
    "organic", "fresh", "vegan", "vegetarian", "gluten-free", "sugar-free", "spicy", "mild",
    // home / general
    "durable", "eco-friendly", "compact", "large", "small", "portable",
    // universal
    "gaming", "premium", "budget", "affordable", "best seller", "new",
  ];
  for (const w of prefWords) {
    if (lower.includes(w)) preferences.push(w);
  }

  return { category, maxBudgetInPaise, preferences };
}
