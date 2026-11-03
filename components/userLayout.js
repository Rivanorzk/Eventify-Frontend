"use client";

import { useState } from "react";

import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import MobileSidebar from "@/components/mobileSidebar";
import { SearchProvider } from "@/contexts/searchContext";

export default function UserLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SearchProvider>
      <div className="min-h-screen bg-[#F8F1E7]">
        {/* DESKTOP SIDEBAR */}
        <Sidebar />

        {/* MOBILE SIDEBAR */}
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* MAIN AREA */}
        <div className="lg:ml-64">

          {/* CONTENT */}
          <main className="min-h-[calc(100vh-82px)]">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}