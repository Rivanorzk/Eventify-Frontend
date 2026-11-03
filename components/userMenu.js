// components/UserMenu.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  User, 
  LogOut, 
  Settings, 
  Ticket, 
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Bell,
  Heart,
  CreditCard
} from "lucide-react";
import { logout } from "@/services/authService";
import useAuth from "@/hooks/useAuth";

export default function UserMenu({ 
  name, 
  subtitle,
  isLoggedIn = false,
  avatar = null // ✅ tambahkan prop avatar
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Halaman profile bersifat universal untuk semua role (app/profile/page.js),
  // jadi jangan diarahkan ke /admin/profile atau /customer/profile yang
  // tidak ada halamannya.
  const getProfileUrl = () => {
    if (!user) return "/login";

    return "/profile";
  };

  const getDashboardUrl = () => {
    if (!user) return "/login";
    
    switch (user.role?.toLowerCase()) {
      case "admin":
        return "/admin/dashboard";
      case "superadmin":
        return "/superadmin/dashboard";
      default:
        return "/customer/dashboard";
    }
  };

  const getTicketsUrl = () => {
    if (!user) return "/login";
    
    switch (user.role?.toLowerCase()) {
      case "admin":
        return "/admin/tickets";
      case "superadmin":
        return "/superadmin/dashboard";
      default:
        return "/customer/tickets";
    }
  };

  const getNotificationsUrl = () => {
    if (!user) return "/login";
    
    switch (user.role?.toLowerCase()) {
      case "admin":
        return "/admin/notification";
      case "superadmin":
        return "/superadmin/notification";
      default:
        return "/customer/notification";
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ========================================
  // GUEST / BELUM LOGIN
  // ========================================
  if (!isLoggedIn || !user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 py-2.5 bg-[#5B0F18] text-[#F8F1E7] rounded-xl text-sm font-semibold hover:bg-[#7A1F2B] transition"
      >
        <User className="w-4 h-4" />
        <span>Sign In</span>
      </Link>
    );
  }

  // ========================================
  // USER LOGIN
  // ========================================
  const getInitials = () => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = name || user?.username || "User";
  const displaySubtitle = subtitle || user?.email || "Event enthusiast";

  // ✅ Avatar URL dari prop
  const avatarUrl = avatar || user?.profile_image || null;

  return (
    <div className="relative">
      {/* ========== TRIGGER BUTTON ========== */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#F8F1E7] transition group"
        aria-label="User menu"
      >
        {/* ✅ Avatar dengan fallback */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-[#E5D6D0]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#5B0F18] flex items-center justify-center text-[#F8F1E7] font-semibold text-sm">
            {getInitials()}
          </div>
        )}

        {/* Nama dan subtitle */}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-[#1E1E1E] line-clamp-1">
            {displayName}
          </p>
          <p className="text-xs text-[#737373] line-clamp-1 max-w-[120px]">
            {displaySubtitle}
          </p>
        </div>

        {/* Chevron indicator */}
        <ChevronDown 
          className={`w-4 h-4 text-[#737373] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ========== DROPDOWN MENU ========== */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#E5D6D0] shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* ✅ Header - User Info dengan Avatar */}
            <div className="px-4 py-3 border-b border-[#E5D6D0] bg-[#F8F1E7]/50">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#E5D6D0]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#5B0F18] flex items-center justify-center text-[#F8F1E7] font-semibold text-sm">
                    {getInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1E1E1E] truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-[#737373] truncate">
                    {displaySubtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* Dashboard */}
              <MenuItem 
                icon={LayoutDashboard} 
                href={getDashboardUrl()}
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </MenuItem>

              {/* Profile */}
              <MenuItem 
                icon={User} 
                href={getProfileUrl()}
                onClick={() => setIsOpen(false)}
              >
                My Profile
              </MenuItem>

              {/* Tickets - conditional berdasarkan role */}
              {user.role?.toLowerCase() === "customer" && (
                <MenuItem 
                  icon={Ticket} 
                  href={getTicketsUrl()}
                  onClick={() => setIsOpen(false)}
                >
                  My Tickets
                </MenuItem>
              )}

              {/* Pesanan - khusus customer (PRD 25: menu "Pesanan") */}
              {user.role?.toLowerCase() === "customer" && (
                <MenuItem 
                  icon={CreditCard} 
                  href="/customer/orders"
                  onClick={() => setIsOpen(false)}
                >
                  Pesanan
                </MenuItem>
              )}

              {/* Event - khusus customer */}
              {user.role?.toLowerCase() === "customer" && (
                <MenuItem 
                  icon={CalendarDays} 
                  href="/customer/event"
                  onClick={() => setIsOpen(false)}
                >
                  Event
                </MenuItem>
              )}

              {/* Notifications */}
              <MenuItem 
                icon={Bell} 
                href={getNotificationsUrl()}
                onClick={() => setIsOpen(false)}
              >
                Notifications
              </MenuItem>

              {/* Settings - halaman profile sudah mencakup edit profil */}
              <MenuItem 
                icon={Settings} 
                href="/profile"
                onClick={() => setIsOpen(false)}
              >
                Settings
              </MenuItem>
            </div>

            {/* Divider + Logout */}
            <div className="border-t border-[#E5D6D0] py-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#7A1F2B] hover:bg-[#F8F1E7] transition group"
              >
                <LogOut className="w-4 h-4 group-hover:text-[#7A1F2B]" />
                <span>Sign Out</span>
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ========================================
// Menu Item Component
// ========================================
function MenuItem({ icon: Icon, href, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#1E1E1E] hover:bg-[#F8F1E7] transition group"
    >
      <Icon className="w-4 h-4 text-[#737373] group-hover:text-[#5B0F18] transition" />
      <span>{children}</span>
    </Link>
  );
}