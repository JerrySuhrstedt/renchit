import Image from "next/image";
import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group flex items-center gap-2.5 ${className ?? ""}`}
    >
      <Image
        src="/brand/sumolab-mark-orange.svg"
        alt=""
        width={28}
        height={26}
        className="h-7 w-auto transition-transform duration-300 group-hover:rotate-[8deg]"
        priority
      />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[1.05rem] font-extrabold tracking-tight text-foreground">
          SumoLab
        </span>
        <span className="text-[1.05rem] font-extrabold tracking-tight text-brand-strong">
          Web Wrench
        </span>
      </span>
    </Link>
  );
}
