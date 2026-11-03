import Image from "next/image";
import Link from "next/link";

export default function AuthLogo({ dark = false, size = "md" }) {
  const logoSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };
  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/Eventify.png"
        alt="Logo Eventify"
        width={48}
        height={48}
        className={`${logoSizes[size]} object-contain -mr-3`}
        priority
      />
      <span
        className={`font-bold uppercase tracking-tight ${textSizes[size]} ${
          dark ? "text-[#F8F1E7]" : "text-[#5B0F18]"
        }`}
        style={{ fontFamily: "var(--font-display, inherit)" }}
      >
        Eventify
      </span>
    </Link>
  );
}