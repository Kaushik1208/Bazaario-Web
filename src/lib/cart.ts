import { prisma } from "./db";
import { ValidationError } from "./validation";

export async function getOrCreateCart(merchantId: string, sessionId: string, channel: "CUSTOMER_CHAT" | "AGENT_API") {
  let cart = await prisma.cart.findFirst({
    where: { merchantId, sessionId, status: "ACTIVE" },
  });
  if (!cart) {
    cart = await prisma.cart.create({ data: { merchantId, sessionId, channel } });
  }
  return cart;
}

export async function addItemToCart(params: {
  merchantId: string;
  sessionId: string;
  productId: string;
  quantity: number;
  addedVia: string;
  channel: "CUSTOMER_CHAT" | "AGENT_API";
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    include: { inventory: true },
  });
  if (!product || product.merchantId !== params.merchantId || !product.isActive) {
    throw new ValidationError("PRODUCT_NOT_FOUND", "That product doesn't exist for this merchant.");
  }
  const stock = product.inventory?.stockCount ?? 0;
  if (stock < params.quantity) {
    throw new ValidationError("INSUFFICIENT_STOCK", `Only ${stock} unit(s) of ${product.name} are in stock.`);
  }

  const cart = await getOrCreateCart(params.merchantId, params.sessionId, params.channel);
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: params.productId } });

  if (existing) {
    const newQty = existing.quantity + params.quantity;
    if (stock < newQty) throw new ValidationError("INSUFFICIENT_STOCK", `Only ${stock} unit(s) of ${product.name} are in stock.`);
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty, unitPriceInPaise: product.priceInPaise },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: params.productId,
        quantity: params.quantity,
        addedVia: params.addedVia,
        unitPriceInPaise: product.priceInPaise,
      },
    });
  }

  return getCartWithTotals(cart.id);
}

export async function removeItemFromCart(cartId: string, productId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId, productId } });
  return getCartWithTotals(cartId);
}

export async function getCartWithTotals(cartId: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { product: { include: { inventory: true } } } } },
  });
  if (!cart) return null;
  const subtotalInPaise = cart.items.reduce((sum, i) => sum + i.unitPriceInPaise * i.quantity, 0);
  return { ...cart, subtotalInPaise };
}
