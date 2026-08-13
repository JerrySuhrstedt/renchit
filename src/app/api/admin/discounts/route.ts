import { NextResponse } from "next/server";
import { adminForApi } from "@/lib/admin";
import { paddle, paddleConfigured } from "@/lib/paddle";
import {
  MAX_BATCH,
  expiryFromDays,
  generateBatch,
  toPaddleAmount,
  validate,
  type DiscountKind,
  type NewDiscount,
} from "@/lib/discount-codes";

export async function GET() {
  const caller = await adminForApi("admin");
  if (!caller) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!paddleConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  const discounts = await paddle().discounts.list({ perPage: 100 }).next();

  return NextResponse.json({
    discounts: discounts.map((d) => ({
      id: d.id,
      code: d.code,
      description: d.description,
      status: d.status,
      type: d.type,
      amount: d.amount,
      currencyCode: d.currencyCode,
      usageLimit: d.usageLimit,
      timesUsed: d.timesUsed ?? 0,
      recur: d.recur,
      expiresAt: d.expiresAt,
      createdAt: d.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const caller = await adminForApi("admin");
  if (!caller) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!paddleConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  let body: Partial<NewDiscount>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input: NewDiscount = {
    kind: (body.kind === "flat" ? "flat" : "percentage") as DiscountKind,
    value: Number(body.value ?? 0),
    description: String(body.description ?? "").trim(),
    prefix: String(body.prefix ?? "").trim(),
    quantity: Math.min(Number(body.quantity ?? 1), MAX_BATCH),
    usageLimit: body.usageLimit === null || body.usageLimit === undefined ? null : Number(body.usageLimit),
    expiresInDays:
      body.expiresInDays === null || body.expiresInDays === undefined
        ? null
        : Number(body.expiresInDays),
    recur: Boolean(body.recur),
    maximumRecurringIntervals:
      body.maximumRecurringIntervals === null || body.maximumRecurringIntervals === undefined
        ? null
        : Number(body.maximumRecurringIntervals),
    restrictTo: Array.isArray(body.restrictTo) ? body.restrictTo.filter(Boolean) : [],
  };

  const errors = validate(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].message, errors }, { status: 400 });
  }

  const codes = generateBatch(input.quantity, input.prefix);
  const expiresAt = expiryFromDays(input.expiresInDays);

  const created: Array<{ id: string; code: string }> = [];
  const failed: Array<{ code: string; reason: string }> = [];

  // Created one at a time because Paddle has no bulk endpoint. Partial success
  // is reported rather than rolled back: codes already minted are real and
  // usable, and silently discarding them would be worse than saying so.
  for (const code of codes) {
    try {
      const discount = await paddle().discounts.create({
        amount: toPaddleAmount(input.kind, input.value),
        description: input.description,
        type: input.kind,
        code,
        enabledForCheckout: true,
        recur: input.recur,
        maximumRecurringIntervals: input.recur ? input.maximumRecurringIntervals : null,
        usageLimit: input.usageLimit,
        expiresAt,
        ...(input.kind === "flat" ? { currencyCode: "USD" as const } : {}),
        ...(input.restrictTo.length > 0 ? { restrictTo: input.restrictTo } : {}),
        customData: { createdBy: caller.email ?? caller.id, source: "renchit-admin" },
      });
      created.push({ id: discount.id, code: discount.code ?? code });
    } catch (err) {
      failed.push({
        code,
        reason: (err as { detail?: string; message?: string }).detail ??
          (err as Error).message ??
          "unknown",
      });
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: failed[0]?.reason ?? "Paddle refused to create the code.", failed },
      { status: 502 },
    );
  }

  return NextResponse.json({ created, failed }, { status: 201 });
}
