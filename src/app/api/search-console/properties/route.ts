import { NextResponse } from "next/server";
import { requireUserIdForApi } from "@/lib/session";
import { getSearchConsoleAccessToken } from "@/lib/google-token";
import { listProperties } from "@/lib/search-console";

export async function GET() {
  const userId = await requireUserIdForApi();
  if (userId instanceof NextResponse) return userId;

  const token = await getSearchConsoleAccessToken(userId);
  if (!token.ok) {
    return NextResponse.json({ error: token.reason, properties: [] }, { status: 403 });
  }

  try {
    const properties = await listProperties(token.accessToken);
    return NextResponse.json({ properties });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", properties: [] },
      { status: 502 },
    );
  }
}
