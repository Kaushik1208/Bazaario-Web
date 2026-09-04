import { prisma } from "./db";

// The backend NEVER trusts the LLM or the client for price, stock, or rule
// decisions. Every money-affecting action re-derives truth from the database.

export class ValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type MerchantRuleMap = {
  maxDiscountPercent: number;
  maxTransactionAmountInPaise: number | null;
  maxUpsellsPerChat: number;
  allowCrossSell: boolean;
  allowUpsell: boolean;
};

const DEFAULT_RULES: MerchantRuleMap = {
  maxDiscountPercent: 10,
  maxTransactionAmountInPaise: null,
  maxUpsellsPerChat: 3,
  allowCrossSell: true,
  allowUpsell: true,
};

export async function getMerchantRules(merchantId: string): Promise<MerchantRuleMap> {
  const rules = await prisma.merchantRule.findMany({ where: { merchantId, isActive: true } });
  const map = { ...DEFAULT_RULES };
  for (const r of rules) {
    switch (r.ruleType) {
      case "MAX_DISCOUNT_PERCENT":
        map.maxDiscountPercent = Number(r.value);
        break;
      case "MAX_TRANSACTION_AMOUNT":
        map.maxTransactionAmountInPaise = Number(r.value);
        break;
      case "MAX_UPSELLS_PER_CHAT":
        map.maxUpsellsPerChat = Number(r.value);
        break;
      case "ALLOW_CROSS_SELL":
        map.allowCrossSell = r.value === "true";
        break;
      case "ALLOW_UPSELL":
        map.allowUpsell = r.value === "true";
        break;
    }
  }
  return map;
}

export type ValidatedLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
  addedVia: string;
};

export type ValidatedCart = {
  cartId: string;
  merchantId: string;
  sessionId: string;
  lines: ValidatedLine[];
  subtotalInPaise: number;
  discountInPaise: number;
  totalInPaise: number;
};

// Independently re-derives cart contents from the database: product must
// exist, be active, be in stock, and price is the CURRENT catalog price —
// never whatever the client or an LLM claims.
export async function validateCartForCheckout(cartId: string): Promise<ValidatedCart> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });

  if (!cart) throw new ValidationError("CART_NOT_FOUND", "Cart not found.");
  if (cart.items.length === 0) throw new ValidationError("CART_EMPTY", "Cart is empty.");
  if (cart.status === "CHECKED_OUT") {
    throw new ValidationError("CART_ALREADY_CHECKED_OUT", "This cart has already been checked out.");
  }

  const lines: ValidatedLine[] = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      throw new ValidationError("PRODUCT_UNAVAILABLE", `${product?.name ?? "A product"} is no longer available.`);
    }
    const stock = product.inventory?.stockCount ?? 0;
    if (stock < item.quantity) {
      throw new ValidationError(
        "INSUFFICIENT_STOCK",
        `${product.name} only has ${stock} unit(s) in stock (requested ${item.quantity}).`
      );
    }
    // Always price from the live catalog, ignoring any client-supplied price.
    const unitPriceInPaise = product.priceInPaise;
    lines.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPriceInPaise,
      lineTotalInPaise: unitPriceInPaise * item.quantity,
      addedVia: item.addedVia,
    });
  }

  const subtotalInPaise = lines.reduce((sum, l) => sum + l.lineTotalInPaise, 0);
  const rules = await getMerchantRules(cart.merchantId);

  // No discount engine input from the LLM is trusted; discounts (if any)
  // would be applied here server-side only, bounded by merchant rules.
  const discountInPaise = 0;
  const totalInPaise = subtotalInPaise - discountInPaise;

  if (rules.maxTransactionAmountInPaise !== null && totalInPaise > rules.maxTransactionAmountInPaise) {
    throw new ValidationError(
      "TRANSACTION_LIMIT_EXCEEDED",
      `This order (₹${(totalInPaise / 100).toFixed(2)}) exceeds the merchant's transaction limit of ₹${(
        rules.maxTransactionAmountInPaise / 100
      ).toFixed(2)}.`
    );
  }

  return {
    cartId: cart.id,
    merchantId: cart.merchantId,
    sessionId: cart.sessionId,
    lines,
    subtotalInPaise,
    discountInPaise,
    totalInPaise,
  };
}
