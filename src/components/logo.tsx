import Image from "next/image";
import Link from "next/link";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={`block leading-none ${className ?? ""}`}>
      <Image
        src="/brand/renchit-logo.svg"
        alt="renchit"
        width={549}
        height={118}
        className="h-6 w-auto sm:h-7"
        priority
      />
    </Link>
  );
}
