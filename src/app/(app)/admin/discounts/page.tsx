import { requireAdmin } from "@/lib/admin";
import { paddle, paddleConfigured } from "@/lib/paddle";
import { PLANS, PRICING_ORDER, priceIdFor } from "@/lib/plans";
import { DiscountManager } from "@/components/admin-discounts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Discount codes | renchit" };

export default async function AdminDiscountsPage() {
  await requireAdmin();

  if (!paddleConfigured()) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Discount codes</h1>
        <p className="mt-4 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          Billing is not configured, so there is nowhere to create codes yet.
        </p>
      </main>
    );
  }

  const existing = await paddle()
    .discounts.list({ perPage: 100 })
    .next()
    .catch(() => []);

  // Offered as "which plans does this apply to". Paddle restricts by price id,
  // so a plan means both its monthly and annual price.
  const planOptions = PRICING_ORDER.filter((k) => k !== "free")
    .concat("lifetime")
    .map((key) => ({
      key,
      name: PLANS[key].name,
      priceIds: [
        priceIdFor(key, "month"),
        priceIdFor(key, "year"),
        priceIdFor(key, "once"),
      ].filter((id): id is string => Boolean(id)),
    }))
    .filter((p) => p.priceIds.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Discount codes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Codes are created in Paddle and work at checkout straight away.
      </p>

      <DiscountManager
        planOptions={planOptions}
        initial={existing.map((d) => ({
          id: d.id,
          code: d.code,
          description: d.description,
          status: d.status,
          type: d.type,
          amount: d.amount,
          usageLimit: d.usageLimit,
          timesUsed: d.timesUsed ?? 0,
          recur: d.recur,
          expiresAt: d.expiresAt,
        }))}
      />
    </main>
  );
}
