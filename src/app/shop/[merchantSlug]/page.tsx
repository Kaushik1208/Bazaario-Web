import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ShopClient } from "@/components/shop/ShopClient";

export default async function ShopPage({ params }: { params: { merchantSlug: string } }) {
  const merchant = await prisma.merchant.findUnique({ where: { slug: params.merchantSlug } });
  if (!merchant) notFound();

  return <ShopClient merchantSlug={merchant.slug} merchantName={merchant.name} logoEmoji={merchant.logoEmoji} />;
}
