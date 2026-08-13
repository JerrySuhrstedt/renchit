import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageSpeedPageClient } from "@/components/page-speed-page-client";
import type { PageSpeedCheckDTO } from "@/lib/page-speed-types";

export const dynamic = "force-dynamic";

export default async function PageSpeedResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const check = await db.pageSpeedCheck.findFirst({ where: { id, userId: user.id } });

  if (!check) notFound();

  const dto: PageSpeedCheckDTO = {
    id: check.id,
    url: check.url,
    status: check.status as PageSpeedCheckDTO["status"],
    errorMessage: check.errorMessage,
    mobile: check.mobileJson ? JSON.parse(check.mobileJson) : null,
    desktop: check.desktopJson ? JSON.parse(check.desktopJson) : null,
    createdAt: check.createdAt.toISOString(),
  };

  return (
    <>
      <PageSpeedPageClient initialCheck={dto} />
    </>
  );
}
