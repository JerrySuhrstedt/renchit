import { NextResponse } from "next/server";
import { adminForApi } from "@/lib/admin";
import { paddle, paddleConfigured } from "@/lib/paddle";

/**
 * Archive a discount code, which is Paddle's equivalent of deleting it.
 *
 * There is no hard delete, and that is correct: a code that has already been
 * redeemed is part of the billing record for those transactions, so removing
 * it would leave orphaned history. Archiving stops it working from now on.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await adminForApi("admin");
  if (!caller) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!paddleConfigured()) {
    return NextResponse.json({ error: "Billing is not set up yet" }, { status: 503 });
  }

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.status !== "archived" && body.status !== "active") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const updated = await paddle().discounts.update(id, { status: body.status });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    const detail = (err as { detail?: string }).detail ?? (err as Error).message;
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
