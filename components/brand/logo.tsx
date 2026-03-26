import Link from "next/link";
import Image from "next/image";

type BrandLogoProps = {
  href?: string;
  compact?: boolean;
};

export function BrandLogo({ href = "/", compact = false }: BrandLogoProps) {
  return (
    <Link href={href} className="inline-flex items-center gap-3">
      <span className="flex h-10 w-24 items-center justify-center overflow-hidden rounded-md bg-[#e6e6e8] px-1">
        <Image src="/brand/rxi-light-cropped.png" alt="Ryan Exchange Logo" width={980} height={300} className="h-full w-full object-contain" />
      </span>
      <span className={`${compact ? "text-base" : "text-lg sm:text-xl"} font-semibold leading-none tracking-tight`}>
        Ryan Exchange: Trust First. Trade Next.
      </span>
    </Link>
  );
}
