"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";

export function NewLocalListingForm() {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [reviewCount, setReviewCount] = useState("");
  const [reviewRating, setReviewRating] = useState("");
  const [claimed, setClaimed] = useState("unsure");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!websiteUrl.trim() || !businessName.trim() || !address.trim() || !phone.trim()) {
      setError("Fill in your website, business name, address, and phone number.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/local-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          businessName,
          address,
          phone,
          reviewCount,
          reviewRating,
          claimed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setLoading(false);
        return;
      }
      router.push(`/local/${data.listingId}`);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(36,28,21,0.04),0_12px_32px_-16px_rgba(36,28,21,0.18)] sm:p-6"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your website">
          <Input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="yourbusiness.com"
            disabled={loading}
            className="h-10"
          />
        </Field>
        <Field label="Business name (as it appears on Google)">
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Acme Plumbing"
            disabled={loading}
            className="h-10"
          />
        </Field>
        <Field label="Business address (as it appears on Google)">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Phoenix, AZ 85001"
            disabled={loading}
            className="h-10"
          />
        </Field>
        <Field label="Business phone (as it appears on Google)">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(480) 555-0132"
            disabled={loading}
            className="h-10"
          />
        </Field>
      </div>

      <div className="mt-1 grid gap-3 rounded-2xl bg-secondary/50 p-4 sm:grid-cols-3">
        <Field label="Google review count (optional)">
          <Input
            value={reviewCount}
            onChange={(e) => setReviewCount(e.target.value)}
            placeholder="24"
            type="number"
            min={0}
            disabled={loading}
            className="h-10"
          />
        </Field>
        <Field label="Google star rating (optional)">
          <Input
            value={reviewRating}
            onChange={(e) => setReviewRating(e.target.value)}
            placeholder="4.5"
            type="number"
            min={0}
            max={5}
            step={0.1}
            disabled={loading}
            className="h-10"
          />
        </Field>
        <Field label="Is your listing claimed?">
          <select
            value={claimed}
            onChange={(e) => setClaimed(e.target.value)}
            disabled={loading}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="unsure">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="mt-1 h-12 w-full rounded-2xl bg-brand-strong text-base font-semibold text-brand-foreground shadow-none hover:bg-brand-strong/90"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your listing
          </>
        ) : (
          <>
            Check my local listing
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
      {error ? (
        <p className="px-2 text-sm font-medium text-critical">{error}</p>
      ) : (
        <p className="flex items-start gap-1.5 px-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          We&apos;ll check your website for consistent business info and give
          you a plain-English checklist, done in a few seconds.
        </p>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
