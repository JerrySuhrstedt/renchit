export type ListingCategoryDTO = "nap" | "structured-data" | "discoverability" | "reputation";

export type ListingCheckDTO = {
  key: string;
  category: ListingCategoryDTO;
  severity: "critical" | "warning" | "info";
  passed: boolean;
  title: string;
  description: string;
};

export type LocalListingDTO = {
  id: string;
  websiteUrl: string;
  businessName: string;
  address: string;
  phone: string;
  reviewCount: number | null;
  reviewRating: number | null;
  claimed: "yes" | "no" | "unsure" | null;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  score: number | null;
  checks: ListingCheckDTO[];
  createdAt: string;
};

export const LISTING_CATEGORY_META: Record<ListingCategoryDTO, { label: string }> = {
  nap: { label: "Name, Address & Phone" },
  "structured-data": { label: "Structured Data" },
  discoverability: { label: "Discoverability" },
  reputation: { label: "Reputation" },
};
