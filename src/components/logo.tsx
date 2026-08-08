import Link from "next/link";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={`group flex items-baseline gap-0.5 leading-none ${className ?? ""}`}
    >
      <span className="text-xl font-extrabold tracking-tight text-foreground">
        web
      </span>
      <span className="text-xl font-extrabold tracking-tight text-brand-strong">
        wrench
      </span>
    </Link>
  );
}
