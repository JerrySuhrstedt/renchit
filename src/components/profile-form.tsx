"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfileForm({
  initialName,
  initialCompany,
  initialLinkedinUrl,
}: {
  initialName: string;
  initialCompany: string;
  initialLinkedinUrl: string;
}) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState(initialCompany);
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, linkedinUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your changes. Try again.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Full name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          maxLength={100}
          className="h-10"
        />
      </Field>
      <Field label="Company">
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Co."
          maxLength={100}
          className="h-10"
        />
      </Field>
      <Field label="LinkedIn profile">
        <Input
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/janesmith"
          type="url"
          maxLength={300}
          className="h-10"
        />
      </Field>

      {error && <p className="text-sm font-medium text-critical">{error}</p>}

      <div className="mt-1 flex items-center gap-3">
        <Button
          type="submit"
          disabled={saving}
          className="h-10 rounded-full bg-brand-strong px-5 text-sm font-semibold text-brand-foreground shadow-none hover:bg-brand-strong/90"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
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
