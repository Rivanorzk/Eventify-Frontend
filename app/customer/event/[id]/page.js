// app/customer/event/[id]/page.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    CalendarDays,
    ChevronRight,
    Clock,
    Info,
    MapPin,
    Minus,
    Music,
    Plus,
    Share2,
    Ticket,
    User,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { getEventById } from "@/services/eventService";
import { isAuthenticated } from "@/lib/auth";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import { currency, formatDate, formatTime } from "@/lib/formatter";

/* =========================
   KONSTANTA & HELPER
========================= */
const MAX_PER_ORDER = 10; // batas pembelian per transaksi
const LOW_STOCK_THRESHOLD = 10; // tampilkan peringatan "Tersisa X" di bawah angka ini

const STATUS_META = {
    published: { label: "Tersedia", className: "text-[#1E7A4C]" },
    finished: { label: "Selesai", className: "text-[#737373]" },
    cancelled: { label: "Dibatalkan", className: "text-[#B3261E]" },
    draft: { label: "Draft", className: "text-[#B4841F]" },
};

function getStatusMeta(status) {
    const key = status?.toLowerCase();
    return (
        STATUS_META[key] || {
            label: status || "Tidak diketahui",
            className: "text-[#737373]",
        }
    );
}

function getCountdown(event, now) {
    if (event.status?.toLowerCase() !== "published" || !event.event_date) {
        return null;
    }
    const start = new Date(`${event.event_date}T${event.start_time || "00:00"}`);
    if (Number.isNaN(start.getTime())) return null;

    const diffMs = start - now;
    if (diffMs <= 0) return "Sedang berlangsung";

    const minutes = Math.round(diffMs / 60000);
    if (minutes < 60) return `Mulai dalam ${Math.max(1, minutes)} menit`;
    if (minutes < 60 * 24) return `Mulai dalam ${Math.round(minutes / 60)} jam`;
    return `Mulai dalam ${Math.round(minutes / (60 * 24))} hari`;
}

function firstAvailableTicket(tickets = []) {
    return tickets.find((t) => t.remaining_stock > 0) || null;
}

/* =========================
   SUB-KOMPONEN
========================= */
function InfoRow({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#7A1F2B]">
                <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[#8C7777]">{label}</p>
                <div className="text-sm font-semibold text-[#1E1E1E]">{children}</div>
            </div>
        </div>
    );
}

function TicketOption({ ticket, selected, onSelect }) {
    const soldOut = ticket.remaining_stock <= 0;
    const lowStock = !soldOut && ticket.remaining_stock <= LOW_STOCK_THRESHOLD;

    return (
        <button
            type="button"
            onClick={() => onSelect(ticket)}
            disabled={soldOut}
            aria-pressed={selected}
            className={`relative rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B] focus-visible:ring-offset-2 ${
                selected
                    ? "border-[#5B0F18] bg-[#F8F1E7] ring-1 ring-[#5B0F18]"
                    : "border-[#E5D6D0] bg-white hover:border-[#D8A7A7]"
            } ${soldOut ? "cursor-not-allowed bg-[#FAFAFA] opacity-60" : ""}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-bold text-[#1E1E1E]">
                        {ticket.category_name || "Regular"}
                    </h3>
                    <p
                        className={`mt-1 text-sm ${
                            lowStock ? "font-semibold text-[#B3261E]" : "text-[#8C7777]"
                        }`}
                    >
                        {soldOut
                            ? "Habis terjual"
                            : lowStock
                            ? `Tersisa ${ticket.remaining_stock} tiket`
                            : `${ticket.remaining_stock} tiket tersedia`}
                    </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-[#7A1F2B]">
                    {currency(ticket.price)}
                </p>
            </div>
        </button>
    );
}

function QuantityStepper({ value, max, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => onChange(Math.max(1, value - 1))}
                disabled={value <= 1}
                aria-label="Kurangi jumlah tiket"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5D6D0] transition hover:bg-[#F8F1E7] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Minus size={16} />
            </button>
            <span
                className="w-10 text-center text-lg font-semibold tabular-nums text-[#1E1E1E]"
                aria-live="polite"
            >
                {value}
            </span>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={value >= max}
                aria-label="Tambah jumlah tiket"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5D6D0] transition hover:bg-[#F8F1E7] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Plus size={16} />
            </button>
        </div>
    );
}

/* =========================
   HALAMAN
========================= */
export default function CustomerEventDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("details");
    const [descExpanded, setDescExpanded] = useState(false);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [now, setNow] = useState(() => new Date());

    const tabsRef = useRef(null);

    useEffect(() => {
        setIsLoggedIn(isAuthenticated());
    }, []);

    // Perbarui waktu tiap menit supaya label hitung mundur tetap akurat
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Muat data event (dengan guard supaya respons lama tidak menimpa yang baru)
    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await getEventById(id);
                if (cancelled) return;

                const tickets = data?.ticket_categories || [];
                setEvent({ ...data, ticket_categories: tickets });
                setSelectedTicket(firstAvailableTicket(tickets));
                setQuantity(1);
            } catch (err) {
                if (cancelled) return;
                console.error("Error loading event:", err);
                setError(err.message || "Gagal memuat detail event");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const isAvailable = event?.status?.toLowerCase() === "published";
    const tickets = event?.ticket_categories || [];
    const hasTickets = tickets.length > 0;
    const allSoldOut = hasTickets && tickets.every((t) => t.remaining_stock <= 0);

    const maxQuantity = selectedTicket
        ? Math.min(selectedTicket.remaining_stock, MAX_PER_ORDER)
        : 0;

    const lowestPrice = useMemo(() => {
        const available = tickets.filter((t) => t.remaining_stock > 0);
        if (available.length === 0) return null;
        return Math.min(...available.map((t) => Number(t.price) || 0));
    }, [tickets]);

    const countdownLabel = useMemo(
        () => (event ? getCountdown(event, now) : null),
        [event, now]
    );

    const total = selectedTicket ? Number(selectedTicket.price) * quantity : 0;

    const handleSelectTicket = useCallback((ticket) => {
        setSelectedTicket(ticket);
        setQuantity(1); // reset supaya tidak melebihi stok kategori baru
    }, []);

    const goToTickets = useCallback(() => {
        setActiveTab("tickets");
        requestAnimationFrame(() => {
            tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, []);

    const handleShare = useCallback(async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: event?.title, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success("Tautan event disalin");
            }
        } catch (err) {
            // pengguna menutup dialog share → abaikan
            if (err?.name !== "AbortError") toast.error("Gagal membagikan event");
        }
    }, [event?.title]);

    const handleBooking = () => {
        if (!isLoggedIn) {
            toast.error("Silakan masuk untuk memesan tiket");
            try {
                localStorage.setItem("redirectAfterLogin", window.location.pathname);
            } catch {
                /* storage tidak tersedia, lanjutkan saja */
            }
            router.push("/login");
            return;
        }

        if (!selectedTicket) {
            toast.error("Pilih kategori tiket terlebih dahulu");
            return;
        }

        if (quantity < 1 || quantity > maxQuantity) {
            toast.error(`Jumlah tiket harus antara 1 dan ${maxQuantity}`);
            return;
        }

        router.push(
            `/customer/checkout?event_id=${event.id}&ticket_id=${selectedTicket.id}&quantity=${quantity}`
        );
    };

    /* ---------- LOADING ---------- */
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <LoadingSpinner text="Memuat detail event..." />
            </div>
        );
    }

    /* ---------- ERROR ---------- */
    if (error || !event) {
        return (
            <div className="min-h-screen bg-white p-5 lg:p-8">
                <div className="mx-auto max-w-5xl">
                    <EmptyState
                        title="Event tidak ditemukan"
                        description={
                            error || "Event yang kamu cari tidak ada atau sudah dihapus."
                        }
                    />
                    <Link
                        href="/customer/event"
                        className="mt-4 inline-flex items-center gap-2 text-[#7A1F2B] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali ke daftar event
                    </Link>
                </div>
            </div>
        );
    }

    const status = getStatusMeta(event.status);
    const description = event.description || "";
    const isLongDescription = description.length > 280;

    const tabs = [
        { id: "details", label: "Detail", icon: Info },
        { id: "tickets", label: "Tiket", icon: Ticket },
    ];

    // Bar aksi bawah: berubah sesuai tab aktif
    const showActionBar = isAvailable && hasTickets && !allSoldOut;
    const onTicketsTab = activeTab === "tickets";

    return (
        // "Melawan" padding bawaan UserLayout supaya hero full-bleed
        <div className="relative -mx-4 -mt-6 min-h-screen bg-white sm:-mx-6 lg:-mx-8">
            {/* HERO BACKGROUND */}
            <div
                className="absolute inset-x-0 top-0 h-[260px] overflow-hidden sm:h-[340px] lg:h-[380px]"
                aria-hidden="true"
            >
                {event.poster ? (
                    <img
                        src={event.poster}
                        alt=""
                        className="h-full w-full scale-110 object-cover opacity-60 blur-2xl"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#5B0F18] via-[#7A1F2B] to-[#3A0810]" />
                )}
                <div className="absolute inset-0 bg-[#1E1E1E]/45" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
            </div>

            <div className="relative mx-auto flex w-full max-w-3xl flex-col">
                {/* TOP BAR */}
                <div className="flex items-center justify-between p-4 sm:p-5">
                    <Link
                        href="/customer/event"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-[#1E1E1E] shadow-sm backdrop-blur transition hover:bg-white"
                    >
                        <ArrowLeft size={16} />
                        Kembali
                    </Link>

                    <button
                        type="button"
                        onClick={handleShare}
                        aria-label="Bagikan event"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#1E1E1E] shadow-sm backdrop-blur transition hover:bg-white"
                    >
                        <Share2 size={16} />
                    </button>
                </div>

                {/* KARTU UTAMA — satu-satunya animasi masuk di halaman ini */}
                <article className="event-enter w-full bg-white shadow-2xl sm:rounded-3xl">
                    {/* POSTER */}
                    <div className="relative overflow-hidden sm:rounded-t-3xl">
                        {event.poster ? (
                            <img
                                src={event.poster}
                                alt={`Poster ${event.title}`}
                                className="h-[240px] w-full object-cover sm:h-[320px]"
                            />
                        ) : (
                            <div className="flex h-[240px] w-full items-center justify-center bg-gradient-to-br from-[#5B0F18] to-[#7A1F2B] sm:h-[320px]">
                                <Music className="h-16 w-16 text-white/30" aria-hidden="true" />
                            </div>
                        )}

                        <span
                            className={`absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-sm ${status.className}`}
                        >
                            {status.label}
                        </span>

                        {countdownLabel && (
                            <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#1E1E1E] shadow-sm">
                                {countdownLabel}
                            </span>
                        )}
                    </div>

                    <div className="p-6 sm:p-8">
                        {/* JUDUL */}
                        {event.category_name && (
                            <p className="text-sm font-semibold text-[#7A1F2B]">
                                {event.category_name}
                            </p>
                        )}
                        <h1 className="mt-1 text-2xl font-bold text-[#1E1E1E] sm:text-3xl">
                            {event.title || "Event tanpa judul"}
                        </h1>

                        {event.admin_username && (
                            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#737373]">
                                <User size={14} aria-hidden="true" />
                                Diselenggarakan oleh{" "}
                                <span className="font-semibold text-[#1E1E1E]">
                                    {event.admin_username}
                                </span>
                            </p>
                        )}

                        {/* INFO UTAMA */}
                        <div className="mt-6 grid gap-4 rounded-2xl border border-[#E5D6D0] p-4 sm:grid-cols-2 sm:p-5">
                            <InfoRow icon={CalendarDays} label="Tanggal">
                                {formatDate(event.event_date)}
                            </InfoRow>
                            <InfoRow icon={Clock} label="Waktu">
                                {formatTime(event.start_time)}
                                {event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
                            </InfoRow>
                            <div className="sm:col-span-2">
                                <InfoRow icon={MapPin} label="Lokasi">
                                    <span>{event.location || "Akan diumumkan"}</span>
                                    {event.latitude && event.longitude && (
                                        <a
                                            href={`https://maps.google.com/maps?q=${event.latitude},${event.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-[#7A1F2B] hover:underline"
                                        >
                                            Lihat peta
                                            <ChevronRight className="h-3 w-3" />
                                        </a>
                                    )}
                                </InfoRow>
                            </div>
                        </div>

                        {/* TABS */}
                        <div
                            ref={tabsRef}
                            role="tablist"
                            aria-label="Informasi event"
                            className="mt-8 flex scroll-mt-4 gap-6 border-b border-[#E5D6D0]"
                        >
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        id={`tab-${tab.id}`}
                                        role="tab"
                                        type="button"
                                        aria-selected={isActive}
                                        aria-controls={`panel-${tab.id}`}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm font-semibold transition ${
                                            isActive
                                                ? "border-[#7A1F2B] text-[#7A1F2B]"
                                                : "border-transparent text-[#A68C8C] hover:text-[#5B0F18]"
                                        }`}
                                    >
                                        <Icon size={15} aria-hidden="true" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ISI TAB */}
                        <div className="mt-6">
                            {activeTab === "details" ? (
                                <div
                                    role="tabpanel"
                                    id="panel-details"
                                    aria-labelledby="tab-details"
                                >
                                    <h2 className="font-semibold text-[#1E1E1E]">Deskripsi</h2>
                                    {description ? (
                                        <>
                                            <p
                                                className={`mt-2 max-w-prose whitespace-pre-line text-sm leading-7 text-[#6B5B5B] ${
                                                    isLongDescription && !descExpanded
                                                        ? "line-clamp-4"
                                                        : ""
                                                }`}
                                            >
                                                {description}
                                            </p>
                                            {isLongDescription && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDescExpanded((v) => !v)}
                                                    className="mt-2 text-sm font-semibold text-[#7A1F2B] hover:underline"
                                                >
                                                    {descExpanded
                                                        ? "Tampilkan lebih sedikit"
                                                        : "Baca selengkapnya"}
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <p className="mt-2 text-sm text-[#8C7777]">
                                            Penyelenggara belum menambahkan deskripsi.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div
                                    role="tabpanel"
                                    id="panel-tickets"
                                    aria-labelledby="tab-tickets"
                                >
                                    <h2 className="text-lg font-bold text-[#1E1E1E]">
                                        Pilih tiket
                                    </h2>

                                    {!isAvailable ? (
                                        <div className="mt-4 rounded-2xl border border-dashed border-[#E5D6D0] p-8 text-center">
                                            <Info className="mx-auto h-8 w-8 text-gray-400" />
                                            <p className="mt-2 text-sm text-[#8C7777]">
                                                Pemesanan untuk event ini sudah ditutup.
                                            </p>
                                        </div>
                                    ) : !hasTickets ? (
                                        <div className="mt-4 rounded-2xl border border-dashed border-[#E5D6D0] p-8 text-center">
                                            <Ticket className="mx-auto h-8 w-8 text-gray-400" />
                                            <p className="mt-2 text-sm text-[#8C7777]">
                                                Tiket belum tersedia untuk event ini.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-6">
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                {tickets.map((ticket) => (
                                                    <TicketOption
                                                        key={ticket.id}
                                                        ticket={ticket}
                                                        selected={selectedTicket?.id === ticket.id}
                                                        onSelect={handleSelectTicket}
                                                    />
                                                ))}
                                            </div>

                                            {allSoldOut ? (
                                                <p className="rounded-xl bg-[#FDF1F0] p-4 text-center text-sm font-semibold text-[#B3261E]">
                                                    Semua tiket sudah habis terjual.
                                                </p>
                                            ) : (
                                                selectedTicket && (
                                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5D6D0] pt-6">
                                                        <div>
                                                            <p className="mb-1.5 text-sm font-medium text-[#1E1E1E]">
                                                                Jumlah tiket
                                                            </p>
                                                            <QuantityStepper
                                                                value={quantity}
                                                                max={maxQuantity}
                                                                onChange={setQuantity}
                                                            />
                                                            <p className="mt-1.5 text-xs text-[#8C7777]">
                                                                Maksimal {maxQuantity} tiket per pesanan
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-[#8C7777]">
                                                                Total
                                                            </p>
                                                            <p className="text-2xl font-bold text-[#5B0F18]">
                                                                {currency(total)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </article>

                {/* BAR AKSI — menempel di bawah layar, satu CTA utama */}
                {showActionBar && (
                    <div className="sticky bottom-0 z-30 mt-4 border-t border-[#E5D6D0] bg-white/95 px-4 py-3 backdrop-blur sm:rounded-t-2xl sm:px-8">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                {onTicketsTab && selectedTicket ? (
                                    <>
                                        <p className="truncate text-xs text-[#8C7777]">
                                            {quantity} × {selectedTicket.category_name || "Regular"}
                                        </p>
                                        <p className="text-lg font-bold text-[#5B0F18]">
                                            {currency(total)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-[#8C7777]">Mulai dari</p>
                                        <p className="text-lg font-bold text-[#5B0F18]">
                                            {lowestPrice !== null ? currency(lowestPrice) : "-"}
                                        </p>
                                    </>
                                )}
                            </div>

                            {onTicketsTab ? (
                                <button
                                    type="button"
                                    onClick={handleBooking}
                                    disabled={!selectedTicket}
                                    className="shrink-0 rounded-xl bg-[#5B0F18] px-6 py-3 text-sm font-semibold text-[#F8F1E7] transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:bg-gray-400"
                                >
                                    {isLoggedIn ? "Pesan sekarang" : "Masuk untuk memesan"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={goToTickets}
                                    className="flex shrink-0 items-center gap-2 rounded-xl bg-[#1E1E1E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3A0810]"
                                >
                                    <Ticket size={16} aria-hidden="true" />
                                    Pilih tiket
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="h-8 sm:h-12" />
            </div>

            <style jsx global>{`
                @keyframes eventEnter {
                    from {
                        opacity: 0;
                        transform: translateY(16px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .event-enter {
                    animation: eventEnter 0.5s ease-out both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .event-enter {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}