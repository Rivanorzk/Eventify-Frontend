// app/customer/dashboard/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { DynamicIcon } from "lucide-react/dynamic";
import {
    ArrowRight,
    Bell,
    CheckCircle2,
    Clock,
    Lightbulb,
    Music,
    QrCode,
    Search,
    Sparkles,
    Ticket,
    Wallet,
} from "lucide-react";

import api from "@/lib/api";
import { getProfile } from "@/services/userService";
import { getCustomerDashboard } from "@/services/dashboardService";
import { getCategories } from "@/services/categoryService";
import { getEvents } from "@/services/eventService";
import { getMyTickets } from "@/services/ticketService";
import { getUnreadCount } from "@/services/notificationService";
import EventCard from "@/components/eventCard";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT_ID = [
    "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
    "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
];

/**
 * CATATAN KONVENSI ICON
 * ---------------------
 * Kolom `categories.icon` di DB menyimpan nama icon lucide-react
 * dalam kebab-case, contoh: "music", "music-2", "audio-lines".
 * Nilai tersebut langsung dipakai oleh <DynamicIcon name={icon} />.
 * Daftar lengkap: https://lucide.dev/icons
 */

function formatRupiah(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "Harga menyusul";
    }
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value));
}

function formatEventDate(dateStr, timeStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const day = d.getDate();
    const month = MONTHS_ID[d.getMonth()];
    const year = d.getFullYear();
    const time = timeStr ? String(timeStr).slice(0, 5) : null;
    return `${day} ${month} ${year}${time ? ` • ${time} WIB` : ""}`;
}

function getMonthDayBadge(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return { month: "-", day: "-" };
    return {
        month: MONTHS_SHORT_ID[d.getMonth()],
        day: String(d.getDate()).padStart(2, "0"),
    };
}

function daysFromNow(dateStr) {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs =
        target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
}

function getCountdownParts(dateStr, timeStr) {
    if (!dateStr) return null;
    const target = new Date(
        `${dateStr.slice(0, 10)}T${(timeStr || "00:00:00").slice(0, 8)}`
    );
    if (Number.isNaN(target.getTime())) return null;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { expired: true };
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return { days, hours, minutes, expired: false };
}

function formatSalesStartLabel(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDate();
    const month = MONTHS_ID[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} • ${hh}:${mm} WIB`;
}

function getSalesCountdown(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { opened: true };
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    let label;
    if (days > 0) {
        label = `${days} hari ${hours} jam lagi`;
    } else if (hours > 0) {
        label = `${hours} jam ${minutes} menit lagi`;
    } else {
        label = `${minutes} menit lagi`;
    }
    return { opened: false, label };
}

// Belum ada eventReminderService khusus, jadi panggil api langsung.
async function toggleEventReminder(eventId) {
    const { data } = await api.post(`/reminders/${eventId}`);
    return data.data;
}

export default function DashboardPage() {
    const router = useRouter();

    const [activeCategory, setActiveCategory] = useState("all");
    const [categories, setCategories] = useState([
        { id: "all", label: "Semua Event", icon: "layout-grid" },
    ]);

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [hotEvents, setHotEvents] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tick tiap detik untuk countdown tiket aktif.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        let cancelled = false;

        async function loadDashboard() {
            try {
                setLoading(true);
                setError(null);

                const [
                    profileRes,
                    statsRes,
                    categoriesRes,
                    eventsLatestRes,
                    eventsByDateRes,
                    ticketsRes,
                    unreadRes,
                ] = await Promise.all([
                    getProfile(),
                    getCustomerDashboard(),
                    getCategories(),
                    getEvents({ status: "published", sort: "latest" }),
                    getEvents({ status: "draft", sort: "date" }),
                    getMyTickets(),
                    getUnreadCount(),
                ]);

                if (cancelled) return;

                setProfile(profileRes);
                setStats(statsRes);

                // `icon` dari API sudah berupa kebab-case (lihat catatan
                // konvensi di atas). Fallback ke "music" kalau null/kosong.
                setCategories([
                    { id: "all", label: "Semua Event", icon: "layout-grid" },
                    ...(categoriesRes || []).map((c) => ({
                        id: String(c.id),
                        label: c.category_name,
                        icon: c.icon || "music",
                    })),
                ]);

                setHotEvents((eventsLatestRes || []).slice(0, 4));

                const todayStr = new Date().toISOString().slice(0, 10);
                setUpcoming(
                    (eventsByDateRes || [])
                        .filter(
                            (e) =>
                                e.event_date &&
                                e.event_date.slice(0, 10) >= todayStr
                        )
                        .slice(0, 3)
                );

                setMyTickets(ticketsRes || []);
                setUnreadCount(unreadRes || 0);
            } catch (err) {
                if (!cancelled)
                    setError(err.message || "Gagal memuat dashboard");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();
        return () => {
            cancelled = true;
        };
    }, [router]);

    // Polling ringan tiap 30 detik: notifikasi + status event.
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const [unreadRes, eventsLatestRes, eventsByDateRes] =
                    await Promise.all([
                        getUnreadCount(),
                        getEvents({ status: "published", sort: "latest" }),
                        getEvents({ status: "draft", sort: "date" }),
                    ]);
                setUnreadCount(unreadRes || 0);
                setHotEvents((eventsLatestRes || []).slice(0, 4));

                const todayStr = new Date().toISOString().slice(0, 10);
                setUpcoming(
                    (eventsByDateRes || [])
                        .filter(
                            (e) =>
                                e.event_date &&
                                e.event_date.slice(0, 10) >= todayStr
                        )
                        .slice(0, 3)
                );
            } catch {
                // silent fail, biar tidak ganggu UX
            }
        }, 30000);

        return () => clearInterval(id);
    }, []);

    async function handleToggleReminder(eventId) {
        setUpcoming((prev) =>
            prev.map((item) =>
                item.id === eventId
                    ? { ...item, is_reminded: !item.is_reminded }
                    : item
            )
        );

        try {
            const result = await toggleEventReminder(eventId);

            setUpcoming((prev) =>
                prev.map((item) =>
                    item.id === eventId
                        ? { ...item, is_reminded: result.is_reminded }
                        : item
                )
            );
        } catch (err) {
            setUpcoming((prev) =>
                prev.map((item) =>
                    item.id === eventId
                        ? { ...item, is_reminded: !item.is_reminded }
                        : item
                )
            );
            setError(err.message || "Gagal mengubah pengingat");
        }
    }

    const visibleEvents = useMemo(() => {
        if (activeCategory === "all") return hotEvents;
        return hotEvents.filter(
            (e) => String(e.category_id) === activeCategory
        );
    }, [activeCategory, hotEvents]);

    const activeTicket = useMemo(() => {
        const active = myTickets
            .filter(
                (t) => t.status === "active" && t.event_status === "published"
            )
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        return active[0] || null;
    }, [myTickets]);

    const countdown = activeTicket
        ? getCountdownParts(activeTicket.event_date, activeTicket.start_time)
        : null;

    const statCards = stats
        ? [
              {
                  label: "Total Transaksi",
                  value: String(stats.total_order ?? 0),
                  icon: Wallet,
                  note: "Riwayat pembelian terdaftar",
              },
              {
                  label: "Order Pending",
                  value: String(stats.order_pending ?? 0),
                  icon: Clock,
                  badge: "Menunggu Bayar",
                  badgeClasses: "bg-[#FDF3D8] text-[#B4841F]",
                  note: "Segera selesaikan sebelum hangus",
              },
              {
                  label: "Order Berhasil",
                  value: String(stats.order_berhasil ?? 0),
                  icon: CheckCircle2,
                  badge: "Lunas",
                  badgeClasses: "bg-[#E4F3EA] text-[#1E7A4C]",
                  note: "Faktur & e-ticket terbit",
              },
              {
                  label: "Total Tiket Aktif",
                  value: String(stats.total_tiket ?? 0),
                  icon: Ticket,
                  badge: "Ready to Scan",
                  badgeClasses: "bg-[#F3E4E4] text-[#B3261E]",
                  note: "Tersimpan di dompet digital",
              },
          ]
        : [];

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            {/* ===== HEADER / SEARCH BAR ===== */}
            <header className="border-b border-[#EADFD0] bg-[#F8F1E7]/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
                    <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-[#8C7777]">
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari tiket konser, artis, kota, atau nomor invoice..."
                            className="w-full bg-white text-[#1E1E1E] outline-none placeholder:text-[#8C7777]"
                        />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-6">
                {error && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        {error}
                    </div>
                )}

                {/* ===== HERO BANNER ===== */}
                <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#5B0F18] to-[#3A0810] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {profile?.status
                                ? `Akun ${profile.status}`
                                : "Akun Terverifikasi"}
                        </span>
                        <h1 className="text-2xl font-bold sm:text-3xl">
                            Selamat datang kembali,{" "}
                            {profile?.username || (loading ? "..." : "Pengguna")}
                        </h1>
                        <p className="mt-2 max-w-md text-sm text-white/70">
                            Panggung bergemuruh, melodi siap menyambutmu. Akses
                            tiket eksklusif dan amankan bangku terbaik untuk
                            festival konser musik terpanas bulan ini.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <Link
                            href="/customer/event"
                            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4]"
                        >
                            Eksplorasi Konser
                        </Link>
                        <Link
                            href="/customer/voucher"
                            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4]"
                        >
                            Voucher & Promo
                        </Link>
                    </div>
                </div>

                {/* ===== STAT CARDS ===== */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {(loading ? Array.from({ length: 4 }) : statCards).map(
                        (stat, i) => {
                            if (!stat) {
                                return (
                                    <div
                                        key={i}
                                        className="h-32 animate-pulse rounded-2xl bg-white/60 shadow-sm"
                                    />
                                );
                            }
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={stat.label}
                                    className={`rounded-2xl bg-white p-5 shadow-sm ${
                                        stat.accent || ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                            {stat.label}
                                        </p>
                                        <Icon className="h-4 w-4 text-[#8C7777]" />
                                    </div>
                                    <p className="mt-2 text-3xl font-bold text-[#1E1E1E]">
                                        {stat.value}
                                    </p>
                                    {stat.badge && (
                                        <span
                                            className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${stat.badgeClasses}`}
                                        >
                                            {stat.badge}
                                        </span>
                                    )}
                                    <p className="mt-2 text-xs text-[#8C7777]">
                                        {stat.note}
                                    </p>
                                </div>
                            );
                        }
                    )}
                </div>

                {/* ===== CATEGORY TABS ===== */}
                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {categories.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    isActive
                                        ? "bg-[#5B0F18] text-white"
                                        : "bg-white text-[#1E1E1E] hover:bg-[#F3E9DD]"
                                }`}
                            >
                                <DynamicIcon
                                    name={cat.icon || "music"}
                                    className={`h-3.5 w-3.5 ${
                                        isActive
                                            ? "text-[#F3D9A4]"
                                            : "text-[#7A1F2B]"
                                    }`}
                                    fallback={() => (
                                        <Music className="h-3.5 w-3.5" />
                                    )}
                                />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* ===== MAIN GRID ===== */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-[#1E1E1E]">
                                        Sedang Hangat
                                    </h2>
                                    <p className="text-xs text-[#8C7777]">
                                        Event terbaru yang baru saja
                                        dipublikasikan
                                    </p>
                                </div>
                                <Link
                                    href="/customer/event"
                                    className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                                >
                                    Lihat Semua Konser
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {loading &&
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-72 animate-pulse rounded-2xl bg-white/60 shadow-sm"
                                        />
                                    ))}

                                {!loading && visibleEvents.length === 0 && (
                                    <div className="col-span-full rounded-2xl bg-white p-6 text-center text-sm text-[#8C7777] shadow-sm">
                                        Belum ada event untuk kategori ini.
                                    </div>
                                )}

                                {!loading &&
                                    visibleEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                        />
                                    ))}
                            </div>
                        </div>

                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-[#1E1E1E]">
                                        Akan Datang Segera
                                    </h2>
                                    <p className="text-xs text-[#8C7777]">
                                        Jadwalkan kalender Anda dan pasang
                                        pengingat tiket dibuka
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {loading &&
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-20 animate-pulse rounded-2xl bg-white/60 shadow-sm"
                                        />
                                    ))}

                                {!loading && upcoming.length === 0 && (
                                    <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#8C7777] shadow-sm">
                                        Tidak ada event mendatang saat ini.
                                    </div>
                                )}

                                {!loading &&
                                    upcoming.map((item) => {
                                        const { month, day } =
                                            getMonthDayBadge(item.event_date);
                                        const salesLabel =
                                            formatSalesStartLabel(
                                                item.sales_start_at
                                            );
                                        const salesCountdown =
                                            getSalesCountdown(
                                                item.sales_start_at
                                            );
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                                    <span className="text-[10px] font-bold uppercase">
                                                        {month}
                                                    </span>
                                                    <span className="text-lg font-bold leading-none">
                                                        {day}
                                                    </span>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B4841F]">
                                                        {item.category_name ||
                                                            "Segera Dibuka"}
                                                    </span>
                                                    <h3 className="font-bold text-[#1E1E1E]">
                                                        {item.title}
                                                    </h3>
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-[#8C7777]">
                                                        {item.description ||
                                                            item.location}
                                                    </p>

                                                    {salesLabel &&
                                                        salesCountdown &&
                                                        !salesCountdown.opened && (
                                                            <>
                                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#B4841F]">
                                                                    <Ticket className="h-3.5 w-3.5 shrink-0" />
                                                                    <span>
                                                                        Tiket
                                                                        dibuka{" "}
                                                                        {
                                                                            salesLabel
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <p className="mt-0.5 text-xs font-semibold text-[#5B0F18]">
                                                                    Dibuka dalam{" "}
                                                                    {
                                                                        salesCountdown.label
                                                                    }
                                                                </p>
                                                            </>
                                                        )}

                                                    {salesLabel &&
                                                        salesCountdown?.opened && (
                                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#1E7A4C]">
                                                                <Ticket className="h-3.5 w-3.5 shrink-0" />
                                                                <span>
                                                                    Tiket sudah
                                                                    dibuka
                                                                </span>
                                                            </div>
                                                        )}

                                                    <div className="mt-2 flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleToggleReminder(
                                                                    item.id
                                                                )
                                                            }
                                                            aria-pressed={
                                                                item.is_reminded
                                                            }
                                                            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                                item.is_reminded
                                                                    ? "bg-[#5B0F18] text-white"
                                                                    : "bg-[#F8F1E7] text-[#5B0F18] hover:bg-[#F3E9DD]"
                                                            }`}
                                                        >
                                                            <Bell className="h-3 w-3" />
                                                            {item.is_reminded
                                                                ? "Diingatkan"
                                                                : "Ingatkan Saya"}
                                                        </button>

                                                        <Link
                                                            href={`/customer/event/${item.id}`}
                                                            className="flex items-center gap-1 text-xs font-semibold text-[#7A1F2B] hover:underline"
                                                        >
                                                            Lihat Detail
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    {/* ===== SIDEBAR ===== */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="mb-3 text-lg font-bold text-[#1E1E1E]">
                                Tiket Kamu
                            </h2>

                            {loading && (
                                <div className="h-80 animate-pulse rounded-2xl bg-white/60 shadow-sm" />
                            )}

                            {!loading && !activeTicket && (
                                <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                                    <Ticket className="mx-auto h-8 w-8 text-[#8C7777]" />
                                    <p className="mt-2 text-sm font-semibold text-[#1E1E1E]">
                                        Belum ada tiket aktif
                                    </p>
                                    <p className="mt-1 text-xs text-[#8C7777]">
                                        Beli tiket event favoritmu dan tiket
                                        siap-scan akan tampil di sini.
                                    </p>
                                    <Link
                                        href="/customer/event"
                                        className="mt-4 inline-block rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                                    >
                                        Cari Event
                                    </Link>
                                </div>
                            )}

                            {!loading && activeTicket && (
                                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#5B0F18] to-[#3A0810] text-white shadow-sm">
                                    <div className="p-5">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F3D9A4]">
                                                <Ticket className="h-3.5 w-3.5" />
                                                Eventify Pass
                                            </span>
                                            <span className="text-xs text-white/60">
                                                {activeTicket.ticket_code}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-[11px] uppercase tracking-wide text-white/60">
                                            {activeTicket.category_name}
                                        </p>
                                        <h3 className="text-lg font-bold">
                                            {activeTicket.event_title}
                                        </h3>
                                        <p className="mt-1 text-xs text-white/70">
                                            {activeTicket.location}
                                        </p>

                                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <p className="text-white/50">
                                                    Kategori
                                                </p>
                                                <p className="font-semibold">
                                                    {
                                                        activeTicket.category_name
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-white/50">
                                                    Status
                                                </p>
                                                <p className="font-semibold capitalize">
                                                    {activeTicket.status}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 border-t border-white/10 bg-white/5 p-5">
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white">
                                            <QrCode className="h-8 w-8 text-[#1E1E1E]" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-white/60">
                                                Waktu Hitung Mundur
                                            </p>
                                            <p className="font-bold">
                                                {countdown?.expired
                                                    ? "Event dimulai"
                                                    : countdown
                                                    ? `${String(
                                                          countdown.days
                                                      ).padStart(
                                                          2,
                                                          "0"
                                                      )}h : ${String(
                                                          countdown.hours
                                                      ).padStart(
                                                          2,
                                                          "0"
                                                      )}j : ${String(
                                                          countdown.minutes
                                                      ).padStart(2, "0")}m`
                                                    : "-"}
                                            </p>
                                            <p className="text-[11px] text-white/50">
                                                {formatEventDate(
                                                    activeTicket.event_date,
                                                    activeTicket.start_time
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/customer/tickets/${activeTicket.id}`}
                                        className="flex items-center justify-center gap-2 bg-[#F3D9A4] py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#EACB86]"
                                    >
                                        <QrCode className="h-4 w-4" />
                                        Lihat E-Ticket & QR
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
                            <Lightbulb className="h-4 w-4 shrink-0 text-[#B4841F]" />
                            <div>
                                <p className="text-sm font-semibold text-[#1E1E1E]">
                                    Tips Check-in Cepat
                                </p>
                                <p className="mt-0.5 text-xs text-[#8C7777]">
                                    Tingkatkan kecerahan layar ponsel hingga
                                    100% saat antrean scanner di pintu masuk.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}