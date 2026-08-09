import * as cheerio from "cheerio";

export type ListingCategory = "nap" | "structured-data" | "discoverability" | "reputation";

export type ListingCheck = {
  key: string;
  category: ListingCategory;
  severity: "critical" | "warning" | "info";
  passed: boolean;
  title: string;
  description: string;
};

export type ListingResult = {
  websiteUrl: string;
  businessName: string;
  address: string;
  phone: string;
  checks: ListingCheck[];
  score: number;
};

export type ListingInput = {
  websiteUrl: string;
  businessName: string;
  address: string;
  phone: string;
  reviewCount: number | null;
  reviewRating: number | null;
  claimed: "yes" | "no" | "unsure" | null;
};

const USER_AGENT = "RenchitBot/1.0";
const FETCH_TIMEOUT_MS = 12_000;
const BUSINESS_SUFFIXES = /\b(llc|inc|incorporated|corp|corporation|co|company|ltd)\b\.?/gi;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value: string): string {
  return normalizeText(value.replace(BUSINESS_SUFFIXES, ""));
}

function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  // Strip a leading US country code so "+1 480..." matches "480...".
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function addressKeyChunk(address: string): string {
  // Street number + first couple words of the street name is enough to prove
  // the address is really on the page, without needing an exact full match.
  const normalized = normalizeText(address);
  return normalized.split(" ").slice(0, 4).join(" ");
}

function check(partial: ListingCheck): ListingCheck {
  return partial;
}

export async function checkListing(input: ListingInput): Promise<ListingResult> {
  const websiteUrl = new URL(
    /^https?:\/\//i.test(input.websiteUrl) ? input.websiteUrl : `https://${input.websiteUrl}`,
  ).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let html: string;
  try {
    const res = await fetch(websiteUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      throw new Error(`Page responded with ${res.status}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const pageText = normalizeText($("body").text());
  const rawHtml = html.toLowerCase();

  const normalizedName = normalizeName(input.businessName);
  const nameFound = normalizedName.length > 0 && pageText.includes(normalizedName);

  const addressChunk = addressKeyChunk(input.address);
  const addressFound = addressChunk.length > 0 && pageText.includes(addressChunk);

  const phoneDigits = normalizePhoneDigits(input.phone);
  const pageDigitsBlob = html.replace(/\D/g, "");
  const phoneFound = phoneDigits.length >= 7 && pageDigitsBlob.includes(phoneDigits);

  const hasClickToCall =
    phoneDigits.length >= 7 && new RegExp(`tel:\\+?1?${phoneDigits}`).test(rawHtml);

  const hasLocalBusinessSchema = /"@type"\s*:\s*"[^"]*(local business|restaurant|store|professionalservice|attorney|dentist|homeandconstructionbusiness|autorepair|beautysalon|healthclub)/i.test(
    rawHtml,
  ) || /itemtype=["']https?:\/\/schema\.org\/(localbusiness|restaurant|store)/i.test(rawHtml);

  const hasContactLink = $("a").toArray().some((el) => {
    const $el = $(el);
    const text = $el.text().toLowerCase();
    const href = ($el.attr("href") ?? "").toLowerCase();
    return text.includes("contact") || href.includes("contact");
  });

  const hasEmbeddedMap = $("iframe").toArray().some((el) => {
    const src = ($(el).attr("src") ?? "").toLowerCase();
    return src.includes("google.com/maps") || src.includes("maps.google");
  });

  const footerText = normalizeText($("footer").text());
  const napInFooter = footerText.length > 0 && (footerText.includes(normalizedName) || footerText.includes(addressChunk) || (phoneDigits.length >= 7 && footerText.replace(/\D/g, "").includes(phoneDigits)));

  const checks: ListingCheck[] = [
    check({
      key: "name-on-site",
      category: "nap",
      severity: "critical",
      passed: nameFound,
      title: "Business name matches your website",
      description: nameFound
        ? "The business name you gave us shows up on your website."
        : `We couldn't find "${input.businessName}" anywhere on your homepage. If your site uses a different name, style, or abbreviation than your Google listing, that mismatch can hurt local rankings.`,
    }),
    check({
      key: "address-on-site",
      category: "nap",
      severity: "critical",
      passed: addressFound,
      title: "Address matches your website",
      description: addressFound
        ? "The address you gave us shows up on your website."
        : `We couldn't find an address matching "${input.address}" on your homepage. Inconsistent addresses across the web are one of the biggest local ranking factors — make sure it's listed exactly the same everywhere.`,
    }),
    check({
      key: "phone-on-site",
      category: "nap",
      severity: "critical",
      passed: phoneFound,
      title: "Phone number matches your website",
      description: phoneFound
        ? "The phone number you gave us shows up on your website."
        : `We couldn't find the number "${input.phone}" on your homepage. A mismatched phone number confuses both customers and Google about which listing is really yours.`,
    }),
    check({
      key: "click-to-call",
      category: "nap",
      severity: "info",
      passed: hasClickToCall,
      title: "Phone number is tap-to-call on mobile",
      description: hasClickToCall
        ? "Your phone number is a clickable tel: link, so mobile visitors can tap to call."
        : "Your phone number doesn't look like a clickable tel: link. Most of your local traffic is on mobile — make the number tappable.",
    }),
    check({
      key: "local-business-schema",
      category: "structured-data",
      severity: "warning",
      passed: hasLocalBusinessSchema,
      title: "Site has LocalBusiness structured data",
      description: hasLocalBusinessSchema
        ? "Your site includes LocalBusiness schema markup, which helps Google understand your business details directly from your site."
        : "We didn't find LocalBusiness schema markup on your homepage. This structured data helps confirm your name, address, and phone number to Google beyond what's just visible on the page.",
    }),
    check({
      key: "contact-link",
      category: "discoverability",
      severity: "info",
      passed: hasContactLink,
      title: "Site has a clear contact link",
      description: hasContactLink
        ? "Your site links to a contact page, making it easy for visitors to find your details."
        : "We didn't find an obvious \"Contact\" link on your homepage. A dedicated contact page is an easy place to reinforce your NAP info.",
    }),
    check({
      key: "embedded-map",
      category: "discoverability",
      severity: "info",
      passed: hasEmbeddedMap,
      title: "Site has an embedded Google Map",
      description: hasEmbeddedMap
        ? "Your homepage embeds a Google Map, which reinforces your location for visitors and search engines."
        : "We didn't find an embedded Google Map. Adding one on your contact or homepage is a small, easy trust signal for local visitors.",
    }),
    check({
      key: "nap-in-footer",
      category: "discoverability",
      severity: "info",
      passed: napInFooter,
      title: "Business info appears in your footer",
      description: napInFooter
        ? "Your name, address, or phone number appears in the footer, so it's visible on every page."
        : "Your footer doesn't seem to include your business name, address, or phone number. Since footers appear on every page, that's the easiest place to keep your NAP consistent site-wide.",
    }),
  ];

  if (input.reviewCount !== null) {
    checks.push(
      check({
        key: "review-count",
        category: "reputation",
        severity: input.reviewCount === 0 ? "critical" : "warning",
        passed: input.reviewCount >= 10,
        title: "Enough Google reviews to build trust",
        description:
          input.reviewCount >= 10
            ? `${input.reviewCount} reviews is a solid base — customers researching you will see real social proof.`
            : `You have ${input.reviewCount} review${input.reviewCount === 1 ? "" : "s"} on Google. Listings with 10+ reviews are far more likely to be trusted and clicked. Ask recent happy customers for a review.`,
      }),
    );
  }

  if (input.reviewRating !== null) {
    checks.push(
      check({
        key: "review-rating",
        category: "reputation",
        severity: input.reviewRating < 3.5 ? "critical" : "warning",
        passed: input.reviewRating >= 4.0,
        title: "Google rating is strong",
        description:
          input.reviewRating >= 4.0
            ? `A ${input.reviewRating.toFixed(1)}-star average is a strong signal to both Google and potential customers.`
            : `Your average rating is ${input.reviewRating.toFixed(1)} stars. Ratings under 4.0 can quietly cost you clicks in the local pack — focus on service quality and asking happy customers to leave reviews.`,
      }),
    );
  }

  if (input.claimed !== null && input.claimed !== "unsure") {
    checks.push(
      check({
        key: "listing-claimed",
        category: "reputation",
        severity: "critical",
        passed: input.claimed === "yes",
        title: "Google Business Profile is claimed",
        description:
          input.claimed === "yes"
            ? "Your Google Business Profile is claimed, so you control what customers see."
            : "Your Google Business Profile isn't claimed yet. An unclaimed listing means you can't fix wrong info, respond to reviews, or add photos — claim it at business.google.com.",
      }),
    );
  }

  const weights: Record<ListingCheck["severity"], number> = { critical: 3, warning: 2, info: 1 };
  const maxPoints = checks.reduce((sum, c) => sum + weights[c.severity], 0);
  const earnedPoints = checks.reduce((sum, c) => sum + (c.passed ? weights[c.severity] : 0), 0);
  const score = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

  return {
    websiteUrl,
    businessName: input.businessName,
    address: input.address,
    phone: input.phone,
    checks,
    score,
  };
}
