import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { Sidebar } from "@/components/merchant/Sidebar";
import { PageTransition } from "@/components/merchant/PageTransition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMerchant();
  if (!ctx) redirect("/merchant/login");

  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1000px 500px at 8% -10%, rgba(61,93,247,0.08) 0%, transparent 55%), radial-gradient(900px 480px at 96% 0%, rgba(245,165,36,0.07) 0%, transparent 55%)",
        }}
      />
      <Sidebar merchantName={ctx.merchant.name} merchantSlug={ctx.merchant.slug} logoEmoji={ctx.merchant.logoEmoji} />
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
