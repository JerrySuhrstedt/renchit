"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => signOut({ redirectTo: "/sign-in" })}
      className="h-10 w-fit rounded-full px-4 text-sm font-semibold"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
