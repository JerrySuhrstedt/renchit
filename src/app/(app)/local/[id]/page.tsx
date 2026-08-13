import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { LocalListingResultsView } from "@/components/local-listing-results-view";
import type { LocalListingDTO } from "@/lib/local-listing-types";

export const dynamic = "force-dynamic";

export default async function LocalListingResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const listing = await db.localListing.findFirst({ where: { id, userId: user.id } });

  if (!listing) notFound();

  if (listing.status === "failed") {
    return (
      <>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-critical-tint">
            <TriangleAlert className="h-6 w-6 text-critical" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            We couldn&apos;t check this listing
          </h1>
          <p className="text-sm text-muted-foreground">
            {listing.errorMessage ?? "Something went wrong fetching your website."}
          </p>
          <Link
            href="/local"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to local listing checker
          </Link>
        </div>
      </>
    );
  }

  const dto: LocalListingDTO = {
    id: listing.id,
    websiteUrl: listing.websiteUrl,
    businessName: listing.businessName,
    address: listing.address,
    phone: listing.phone,
    reviewCount: listing.reviewCount,
    reviewRating: listing.reviewRating,
    claimed: listing.claimed as LocalListingDTO["claimed"],
    status: listing.status as LocalListingDTO["status"],
    errorMessage: listing.errorMessage,
    score: listing.score,
    checks: listing.checksJson ? JSON.parse(listing.checksJson) : [],
    createdAt: listing.createdAt.toISOString(),
  };

  return (
    <>
      <LocalListingResultsView listing={dto} />
    </>
  );
}
