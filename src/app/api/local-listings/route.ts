import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { checkListing } from "@/lib/local-listing";

type PostBody = {
  websiteUrl?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  reviewCount?: string | number;
  reviewRating?: string | number;
  claimed?: string;
};

export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const websiteUrl = body.websiteUrl?.trim();
  const businessName = body.businessName?.trim();
  const address = body.address?.trim();
  const phone = body.phone?.trim();

  if (!websiteUrl) {
    return NextResponse.json({ error: "Your website URL is required" }, { status: 400 });
  }
  if (!businessName) {
    return NextResponse.json({ error: "Your business name is required" }, { status: 400 });
  }
  if (!address) {
    return NextResponse.json({ error: "Your business address is required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Your business phone number is required" }, { status: 400 });
  }

  const reviewCount =
    body.reviewCount !== undefined && body.reviewCount !== "" ? Number(body.reviewCount) : null;
  const reviewRating =
    body.reviewRating !== undefined && body.reviewRating !== "" ? Number(body.reviewRating) : null;
  const claimed =
    body.claimed === "yes" || body.claimed === "no" || body.claimed === "unsure" ? body.claimed : null;

  let siteId: string | undefined;
  try {
    const origin = new URL(/^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`).origin;
    const site = await db.site.upsert({
      where: { userId_rootUrl: { userId, rootUrl: origin } },
      update: {},
      create: { rootUrl: origin, userId },
    });
    siteId = site.id;
  } catch {
    // invalid URL — checkListing below will surface the real error
  }

  const listing = await db.localListing.create({
    data: {
      websiteUrl,
      businessName,
      address,
      phone,
      reviewCount: reviewCount !== null && !Number.isNaN(reviewCount) ? reviewCount : null,
      reviewRating: reviewRating !== null && !Number.isNaN(reviewRating) ? reviewRating : null,
      claimed,
      status: "running",
      userId,
      siteId,
    },
  });

  try {
    const result = await checkListing({
      websiteUrl,
      businessName,
      address,
      phone,
      reviewCount: reviewCount !== null && !Number.isNaN(reviewCount) ? reviewCount : null,
      reviewRating: reviewRating !== null && !Number.isNaN(reviewRating) ? reviewRating : null,
      claimed,
    });
    await db.localListing.update({
      where: { id: listing.id },
      data: {
        status: "completed",
        score: result.score,
        checksJson: JSON.stringify(result.checks),
      },
    });
  } catch (err) {
    await db.localListing.update({
      where: { id: listing.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }

  return NextResponse.json({ listingId: listing.id }, { status: 201 });
}
