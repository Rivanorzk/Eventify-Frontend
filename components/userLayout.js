"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

import Sidebar from "@/components/sidebar";
import MobileSidebar from "@/components/mobileSidebar";
import { SearchProvider } from "@/contexts/searchContext";

export default function UserLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SearchProvider>
      <div className="min-h-screen bg-[#F8F1E7]">
        {/* DESKTOP SIDEBAR (hidden di bawah lg) */}
        <Sidebar />

        {/* MOBILE SIDEBAR */}
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* MAIN AREA */}
        <div className="lg:ml-64">
          {/* TOP BAR MOBILE: tombol pembuka sidebar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-[#5B0F18] px-4 text-[#F8F1E7] shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-[#7A1F2B]"
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/Eventify.png"
                alt="Logo Eventify"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="font-display text-lg font-bold uppercase tracking-tight text-white">
                Eventify
              </span>
            </Link>
          </header>

          {/* CONTENT */}
          <main className="min-h-[calc(100vh-56px)] lg:min-h-screen">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}