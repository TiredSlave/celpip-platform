import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "../lib/brand";

type Props = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
};

const sizes = {
  sm: { box: "h-9 w-9", img: 36, title: "text-lg", tagline: false },
  md: { box: "h-11 w-11", img: 44, title: "text-xl", tagline: true },
  lg: { box: "h-14 w-14", img: 56, title: "text-2xl", tagline: true },
};

export function BrandLogo({ showText = true, size = "md", className = "", href = "/" }: Props) {
  const s = sizes[size];
  const content = (
    <>
      <div className={`${s.box} shrink-0 overflow-hidden rounded-xl shadow-md shadow-blue-900/20 ring-1 ring-black/5`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={s.img} height={s.img} className="h-full w-full object-contain p-0.5" />
      </div>
      {showText && (
        <div className="hidden sm:block leading-tight">
          <span className={`block font-bold text-gray-900 tracking-tight ${s.title}`}>{SITE_NAME}</span>
          {s.tagline && (
            <span className="block text-xs font-medium text-gray-600">{SITE_TAGLINE}</span>
          )}
        </div>
      )}
    </>
  );

  return (
    <Link href={href} className={`group flex items-center gap-3 shrink-0 ${className}`}>
      {content}
    </Link>
  );
}
