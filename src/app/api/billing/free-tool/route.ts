import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserIdForApi } from "@/lib/session";
import { getEntitlements } from "@/lib/entitlements";
import { FREE_TOOL_SWITCH_DAYS, isToolKey, toolName } from "@/lib/plans";

/**
 * Sets (or swaps) the single tool a free user keeps.
 *
 * The 30-day cooldown is the whole point of the limit. Without it a free user
 * could switch tools per request and quietly have all six.
 */
export async function POST(request: Request) {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  let body: { tool?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isToolKey(body.tool)) {
    return NextResponse.json({ error: "Pick one of the six tools" }, { status: 400 });
  }

  const ent = await getEntitlements(userId);

  // Paid and trialing users have everything, so there is nothing to choose.
  if (ent.allowedTools === "all") {
    return NextResponse.json(
      { error: "Your plan already includes every tool" },
      { status: 400 },
    );
  }

  // Picking the one you already have is a no-op, not an error, and must not
  // burn the cooldown.
  if (ent.freeTool === body.tool) {
    return NextResponse.json({ tool: body.tool, unchanged: true });
  }

  if (ent.freeToolSwitchableAt) {
    const days = Math.ceil((ent.freeToolSwitchableAt.getTime() - Date.now()) / 86_400_000);
    return NextResponse.json(
      {
        error: `You can switch tools once every ${FREE_TOOL_SWITCH_DAYS} days. You can change again in ${days} day${days === 1 ? "" : "s"}, or upgrade for all six now.`,
        reason: "cooldown",
        switchableAt: ent.freeToolSwitchableAt,
      },
      { status: 409 },
    );
  }

  await db.user.update({
    where: { id: userId },
    data: {
      freeTool: body.tool,
      // A first-time pick starts the clock too, so the first switch is also
      // 30 days out. Otherwise the very first swap would be free.
      freeToolChangedAt: new Date(),
    },
  });

  return NextResponse.json({ tool: body.tool, name: toolName(body.tool) });
}
