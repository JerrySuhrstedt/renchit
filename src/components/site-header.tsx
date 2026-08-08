import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <span className="hidden text-sm font-medium text-muted-foreground sm:block">
          Site Audit
        </span>
      </div>
    </header>
  );
}
