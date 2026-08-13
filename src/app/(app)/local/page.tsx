import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { NewLocalListingForm } from "@/components/new-local-listing-form";
import {
  LocalListingHistoryList,
  type LocalListingHistoryItem,
} from "@/components/local-listing-history-list";

export const dynamic = "force-dynamic";

async function getListings(userId: string): Promise<LocalListingHistoryItem[]> {
  const listings = await db.localListing.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return listings.map((l) => ({
    id: l.id,
    websiteUrl: l.websiteUrl,
    businessName: l.businessName,
    status: l.status,
    score: l.score,
    createdAt: l.createdAt.toISOString(),
  }));
}

export default async function LocalListingDashboardPage() {
  const user = await requireUser();
  const listings = await getListings(user.id);

  return (
    <>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-24 sm:px-8">
        <section className="flex flex-col items-center gap-6 pb-14 pt-16 text-center sm:pt-24">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Does your website match{" "}
            <span className="text-brand-strong">your Google listing?</span>
          </h1>
          <p className="max-w-lg text-balance text-lg text-muted-foreground">
            Mismatched business info is one of the biggest local ranking
            killers. Check yours in a few seconds.
          </p>
          <div className="mt-2 w-full max-w-2xl">
            <NewLocalListingForm />
          </div>
        </section>

        <section className="flex flex-col gap-4 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Past checks
            </h2>
            {listings.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {listings.length} check{listings.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <LocalListingHistoryList listings={listings} />
        </section>
      </main>
    </>
  );
}
