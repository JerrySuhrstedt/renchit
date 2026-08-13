import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminForApi, isRole, ownerCount } from "@/lib/admin";

/**
 * Change a user's role, or grant/revoke complimentary access.
 *
 * Role changes are owner-only. Comping is available to any admin, since it is
 * reversible and does not affect who can administer the system.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await adminForApi("admin");
  // 404 rather than 403 throughout: no reason to confirm these routes exist
  // to anyone who is not an admin.
  if (!caller) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;

  let body: { role?: string; comp?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, subscription: true },
  });
  if (!target) return NextResponse.json({ error: "No such user" }, { status: 404 });

  // ---- Role change -------------------------------------------------------
  if (body.role !== undefined) {
    if (caller.role !== "owner") {
      return NextResponse.json(
        { error: "Only an owner can change roles." },
        { status: 403 },
      );
    }
    if (!isRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Never allow the last owner to be demoted, whether by someone else or by
    // themselves. Without this the admin area can be locked out permanently
    // with a single misclick.
    const demotingAnOwner = target.role === "owner" && body.role !== "owner";
    if (demotingAnOwner && (await ownerCount()) <= 1) {
      return NextResponse.json(
        { error: "You are the last owner. Promote someone else first." },
        { status: 409 },
      );
    }

    await db.user.update({ where: { id }, data: { role: body.role } });
    return NextResponse.json({ ok: true, role: body.role });
  }

  // ---- Complimentary access ---------------------------------------------
  if (body.comp !== undefined) {
    if (body.comp) {
      // Stored as lifetime with interval "comp" so it reuses the entitlement
      // path while staying out of the 100 paid Founding Member seats.
      await db.subscription.upsert({
        where: { userId: id },
        create: {
          userId: id,
          plan: "lifetime",
          status: "active",
          interval: "comp",
          currentPeriodEnd: null,
        },
        update: {
          plan: "lifetime",
          status: "active",
          interval: "comp",
          currentPeriodEnd: null,
        },
      });
      return NextResponse.json({ ok: true, comp: true });
    }

    if (!target.subscription) {
      return NextResponse.json({ ok: true, comp: false });
    }
    if (target.subscription.interval !== "comp") {
      return NextResponse.json(
        { error: "That is a paying customer, not a comp. Cancel in Paddle instead." },
        { status: 409 },
      );
    }
    await db.subscription.delete({ where: { userId: id } });
    return NextResponse.json({ ok: true, comp: false });
  }

  return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
}
