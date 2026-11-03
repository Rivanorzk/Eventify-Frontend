"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton({
  href,
  label = "Kembali",
  variant = "link",
  showIcon = true,
  icon: Icon = ChevronLeft,
  className = "",
  onClick,
  ...rest
}) {
  const router = useRouter();

  const handleClick = (e) => {
    onClick?.(e);
    if (!href) router.back();
  };

  const variants = {
    link:
      "text-sm font-medium text-[#7A1F2B] hover:text-[#3B0008] hover:underline",
    button:
      "rounded-full border border-[#DBC0C0] bg-white px-4 py-2 text-sm font-semibold text-[#3B0008] shadow-sm hover:bg-[#F6F3F2]",
    pill:
      "rounded-full bg-[#5B0F18] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3B0008]",
  };

  const classes = [
    "inline-flex items-center gap-2 print:hidden transition-colors",
    variants[variant] || variants.link,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {showIcon && <Icon size={16} aria-hidden="true" />}
      {label && <span>{label}</span>}
    </>
  );

  // Jika ada href → render <Link> (SEO + middle-click friendly)
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={classes}
        aria-label={!label ? "Kembali" : undefined}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  // Jika tidak ada href → tombol history.back()
  return (
    <button
      type="button"
      onClick={handleClick}
      className={classes}
      aria-label={!label ? "Kembali" : undefined}
      {...rest}
    >
      {content}
    </button>
  );
}