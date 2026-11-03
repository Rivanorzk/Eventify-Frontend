"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { LogOut } from "lucide-react";

import useAuth from "@/hooks/useAuth";
import { menus } from "@/constants/menu";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);

        try {
            await logout();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            router.replace("/login");
            router.refresh();
            setLoggingOut(false);
        }
    };  

    const role = user?.role?.toLowerCase();

    const menuItems =
        menus[role] ||
        menus[role?.toUpperCase()] ||
        [];

    /* ---------------------------------------------------------
       SUBTITLE sesuai role
    --------------------------------------------------------- */
    const roleSubtitle =
        role === "customer"
            ? "Customer"
            : role === "admin"
            ? "Admin Panel"
            : role === "superadmin"
            ? "Superadmin Panel"
            : "";

    const normalizePath = (path) => {
        if (!path) return "/";

        const normalized = path
            .replace(/\/+$/, "")
            .toLowerCase();

        return normalized || "/";
    };

    const currentPath = normalizePath(pathname);

    /*
     * Cari menu yang paling cocok dengan URL sekarang.
     * Menu dengan href paling panjang diprioritaskan.
     */
    const activeItem = [...menuItems]
        .sort(
            (a, b) =>
                normalizePath(b.href).length -
                normalizePath(a.href).length
        )
        .find((item) => {
            const href = normalizePath(item.href);

            if (href === "/") {
                return currentPath === "/";
            }

            return (
                currentPath === href ||
                currentPath.startsWith(
                    `${href}/`
                )
            );
        });

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-[250px] bg-[#5B0F18] text-[#F8F1E7] flex-col px-5 py-6">

            {/* LOGO + SUBTITLE */}
            <Link href="/" className="flex items-center gap-2">
                <Image
                    src="/Eventify.png"
                    alt="Logo Eventify"
                    width={48}
                    height={48}
                    className="h-16 w-16 object-contain -mr-3"
                    priority
                />
                <div className="flex flex-col leading-tight">
                    <span className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                        Eventify
                    </span>
                    {roleSubtitle && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D4A537]">
                            {roleSubtitle}
                        </span>
                    )}
                </div>
            </Link>

            {/* MENU */}
            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar mt-6">

                {menuItems.map((item) => {
                    const Icon =
                        Icons[item.icon] ||
                        Icons.Circle;

                    const isActive =
                        activeItem?.href ===
                        item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? "bg-[#7A1F2B] text-[#F8F1E7] font-semibold shadow-sm"
                                    : "text-[#D8A7A7] hover:bg-[#7A1F2B]/70 hover:text-[#F8F1E7]"
                            }`}
                        >
                            <Icon className="w-5 h-5 shrink-0" />

                            <span className="text-sm">
                                {item.title}
                            </span>
                        </Link>
                    );
                })}

            </nav>

            {/* LOGOUT */}
            <div className="mt-auto space-y-2">

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#D8A7A7] hover:bg-[#7A1F2B] hover:text-[#F8F1E7] transition"
                >
                    <LogOut className="w-4 h-4" />

                    <span className="text-sm font-medium">
                        {loggingOut ? "Logging out..." : "Logout"}
                    </span>
                </button>

            </div>

        </aside>
    );
}