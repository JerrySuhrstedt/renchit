import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireUser();

  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      image: true,
      company: true,
      linkedinUrl: true,
      createdAt: true,
    },
  });

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-24 pt-8 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is what we know about you — update it any time.
        </p>

        <div className="mt-8 flex flex-col gap-6 rounded-3xl border border-border bg-card px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-24 w-24 shrink-0 rounded-full border border-border object-cover sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand-tint text-3xl font-semibold text-brand-strong sm:h-28 sm:w-28">
                {(user.name ?? user.email ?? "U")[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-foreground">
                {user.name ?? "Unnamed"}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Signed in with Google · member since{" "}
                {user.createdAt.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <ProfileForm
              initialName={user.name ?? ""}
              initialCompany={user.company ?? ""}
              initialLinkedinUrl={user.linkedinUrl ?? ""}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-border bg-card px-6 py-6 sm:px-8">
          <div>
            <h2 className="text-sm font-bold text-foreground">Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.email} is the Google account you sign in with.
            </p>
          </div>
          <SignOutButton />
        </div>
      </main>
    </>
  );
}
