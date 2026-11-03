// app/customer/vouchers/page.js
"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Gift,
    Ticket,
    CalendarDays,
    ChevronRight,
    Copy,
    Check,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
} from "lucide-react";

import { getMyVouchers, redeemVoucher } from "@/services/voucherService";
import SectionHeader from "@/components/sectionHeader";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import { currency, formatDate } from "@/lib/formatter";

// ---------------------------------------------------------------------
// Konfigurasi
// ---------------------------------------------------------------------

// `state` dihitung oleh backend: available | upcoming | used | expired | inactive
const TABS = [
    {
        key: "available",
        label: "Tersedia",
        states: ["available", "upcoming"],
        emptyTitle: "Belum ada voucher yang bisa dipakai",
        emptyDescription:
            "Masukkan kode voucher di atas untuk menambahkannya ke akun Anda.",
    },
    {
        key: "used",
        label: "Terpakai",
        states: ["used"],
        emptyTitle: "Belum ada voucher terpakai",
        emptyDescription: "Voucher yang sudah Anda pakai saat checkout muncul di sini.",
    },
    {
        key: "expired",
        label: "Kedaluwarsa",
        states: ["expired", "inactive"],
        emptyTitle: "Tidak ada voucher kedaluwarsa",
        emptyDescription: "Voucher yang masa berlakunya habis muncul di sini.",
    },
];

const STATE_BADGE = {
    used: { label: "Sudah dipakai", className: "bg-[#F1ECEA] text-[#5F5551]" },
    expired: { label: "Kedaluwarsa", className: "bg-red-50 text-red-700" },
    inactive: { label: "Tidak aktif", className: "bg-[#F1ECEA] text-[#5F5551]" },
};

// Bentuk tiket: lubang setengah lingkaran di garis sobekan, dibuat dengan
// mask supaya tidak bergantung pada warna latar halaman.
const NOTCH =
    "radial-gradient(circle 9px at var(--stub) 0, #0000 98%, #000) top / 100% 51% no-repeat, " +
    "radial-gradient(circle 9px at var(--stub) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat";
const TICKET_MASK = { WebkitMask: NOTCH, mask: NOTCH };

// ---------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------

const getErrorMessage = (err) =>
    err?.response?.data?.message ||
    err?.data?.message ||
    err?.message ||
    "Terjadi kesalahan. Silakan coba lagi.";

// Aturan yang sama dipakai untuk input manual dan kode dari notifikasi.
const normalizeCode = (value) =>
    String(value || "").toUpperCase().replace(/\s/g, "").slice(0, 50);

const compactRupiah = (value) => {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `Rp${+(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `Rp${+(n / 1_000).toFixed(1)}rb`;
    return `Rp${n}`;
};

const daysLeft = (endDate) =>
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);

const byTab = (tabKey) => (a, b) => {
    if (tabKey === "available") return new Date(a.end_date) - new Date(b.end_date);
    if (tabKey === "used") return new Date(b.used_at) - new Date(a.used_at);
    return new Date(b.end_date) - new Date(a.end_date);
};

// ---------------------------------------------------------------------
// Form redeem
// ---------------------------------------------------------------------

function RedeemBox({ onRedeemed, initialCode = "" }) {
    const [code, setCode] = useState(() => normalizeCode(initialCode));
    const [prefilled, setPrefilled] = useState(Boolean(initialCode));
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Kalau customer klik notifikasi lain saat sudah berada di halaman ini,
    // kolom ikut terisi dengan kode yang baru.
    useEffect(() => {
        if (initialCode) {
            setCode(normalizeCode(initialCode));
            setPrefilled(true);
            setFeedback(null);
        }
    }, [initialCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const promoCode = code.trim();

        if (!promoCode) {
            setFeedback({ type: "error", text: "Masukkan kode voucher terlebih dahulu." });
            return;
        }

        try {
            setLoading(true);
            setFeedback(null);

            const voucher = await redeemVoucher(promoCode);

            onRedeemed(voucher);
            setCode("");
            setPrefilled(false);
            setFeedback({
                type: "success",
                text: voucher?.event_title
                    ? `Voucher berhasil ditambahkan untuk ${voucher.event_title}.`
                    : "Voucher berhasil ditambahkan.",
            });
        } catch (err) {
            setFeedback({ type: "error", text: getErrorMessage(err) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            aria-labelledby="redeem-title"
            className="rounded-2xl border border-[#E5D6D0] bg-white p-5 sm:p-6"
        >
            <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8EFEC] text-[#7A1F2B]">
                    <Gift className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                    <h2 id="redeem-title" className="font-bold text-[#1E1E1E]">
                        Punya kode voucher?
                    </h2>
                    <p className="mt-1 text-sm text-[#737373]">
                        Masukkan kode dari penyelenggara. Setiap kode hanya bisa ditukar
                        satu kali dan hanya berlaku untuk event yang tertera.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <label htmlFor="promo-code" className="sr-only">
                            Kode voucher
                        </label>
                        <input
                            id="promo-code"
                            type="text"
                            value={code}
                            onChange={(e) => {
                                setCode(normalizeCode(e.target.value));
                                setPrefilled(false);
                                if (feedback) setFeedback(null);
                            }}
                            placeholder="Contoh: KONSER2027"
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            maxLength={50}
                            disabled={loading}
                            className="h-11 w-full flex-1 rounded-xl border border-[#E5D6D0] bg-white px-4 font-mono text-sm tracking-wide text-[#1E1E1E] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#A8A29E] focus:border-[#7A1F2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/25 disabled:bg-[#FAF7F5]"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#7A1F2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                            {loading ? "Memproses..." : "Tukar kode"}
                        </button>
                    </form>

                    <div aria-live="polite" className="min-h-[1.25rem]">
                        {prefilled && !feedback && (
                            <p className="mt-3 flex items-start gap-2 text-sm text-[#7A1F2B]">
                                <Gift className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                    Kode terisi otomatis dari notifikasi. Tinggal tekan &quot;Tukar kode&quot;.
                                </span>
                            </p>
                        )}
                        {feedback && (
                            <p
                                className={`mt-3 flex items-start gap-2 text-sm ${
                                    feedback.type === "success" ? "text-green-700" : "text-red-700"
                                }`}
                            >
                                {feedback.type === "success" ? (
                                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                ) : (
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                )}
                                <span>{feedback.text}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------
// Kartu voucher
// ---------------------------------------------------------------------

function VoucherCard({ voucher }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    const isPercentage = voucher.discount_type === "percentage";
    const isUsable = voucher.state === "available";
    const isMuted = !isUsable && voucher.state !== "upcoming";

    const days = isUsable ? daysLeft(voucher.end_date) : null;
    const endingSoon = isUsable && days <= 3;

    const badge = STATE_BADGE[voucher.state];

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(voucher.promo_code);
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard bisa diblokir browser; kode tetap terlihat & bisa disalin manual.
        }
    };

    return (
        <article
            style={TICKET_MASK}
            className={`flex overflow-hidden rounded-2xl border border-[#E5D6D0] bg-white [--stub:104px] sm:[--stub:128px] ${
                isMuted ? "opacity-90" : ""
            }`}
        >
            {/* Bagian kiri: nilai diskon */}
            <div
                className={`flex w-[104px] shrink-0 flex-col items-center justify-center px-2 py-5 text-center text-white sm:w-[128px] ${
                    isMuted ? "bg-[#7C726F]" : "bg-[#5B0F18]"
                }`}
            >
                <span
                    className={`font-extrabold leading-none tabular-nums ${
                        isPercentage ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
                    }`}
                >
                    {isPercentage
                        ? `${Number(voucher.discount_value)}%`
                        : compactRupiah(voucher.discount_value)}
                </span>
                <span className="mt-2 text-xs text-white/80">
                    {isPercentage ? "diskon" : "potongan"}
                </span>
            </div>

            {/* Bagian kanan: detail */}
            <div className="flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-[#E5D6D0] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-bold leading-snug text-[#1E1E1E]">
                        {voucher.title || "Voucher"}
                    </h3>

                    {badge && (
                        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                        </span>
                    )}
                    {endingSoon && (
                        <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                            {days <= 1 ? "Segera berakhir" : `${days} hari lagi`}
                        </span>
                    )}
                </div>

                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#7A1F2B]">
                    <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                        {voucher.event_title ? `Untuk ${voucher.event_title}` : "Event tertentu"}
                    </span>
                </p>

                <ul className="mt-3 space-y-1 text-xs text-[#737373]">
                    <li>Minimal {voucher.minimum_quantity} tiket</li>
                    {isPercentage && voucher.maximum_discount !== null && voucher.maximum_discount !== undefined && (
                        <li>Maksimal potongan {currency(voucher.maximum_discount)}</li>
                    )}
                    <li className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#7A1F2B]" aria-hidden="true" />
                        {voucher.state === "upcoming"
                            ? `Berlaku mulai ${formatDate(voucher.start_date)}`
                            : voucher.state === "used" && voucher.used_at
                            ? `Dipakai pada ${formatDate(voucher.used_at)}`
                            : `Berlaku sampai ${formatDate(voucher.end_date)}`}
                    </li>
                </ul>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-4">
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label={`Salin kode ${voucher.promo_code}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#D9C5BE] bg-[#FAF7F5] px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-[#3A2A2C] transition-colors hover:border-[#7A1F2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40"
                    >
                        {voucher.promo_code}
                        {copied ? (
                            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                        ) : (
                            <Copy className="h-3.5 w-3.5 text-[#737373]" aria-hidden="true" />
                        )}
                        <span className="sr-only" aria-live="polite">
                            {copied ? "Kode tersalin" : ""}
                        </span>
                    </button>

                    {isUsable && voucher.event_id && (
                        <Link
                            href={`/customer/event/${voucher.event_id}`}
                            className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-[#7A1F2B] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40"
                        >
                            Pakai di event
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}

// ---------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------

function VouchersContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Kode dari link notifikasi: /customer/vouchers?code=KODE
    const initialCode = searchParams.get("code") || "";

    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState("available");

    const loadVouchers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getMyVouchers();
            setVouchers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading vouchers:", err);
            setError("Gagal memuat voucher. Periksa koneksi Anda lalu coba lagi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVouchers();
    }, [loadVouchers]);

    const handleRedeemed = (voucher) => {
        setVouchers((prev) => [voucher, ...prev.filter((v) => v.id !== voucher.id)]);
        setActiveTab("available");

        // Bersihkan ?code= supaya refresh halaman tidak mengisi ulang
        // kode yang sudah ditukar.
        if (initialCode) {
            router.replace("/customer/vouchers", { scroll: false });
        }
    };

    const grouped = useMemo(() => {
        const result = {};
        for (const tab of TABS) {
            result[tab.key] = vouchers
                .filter((v) => tab.states.includes(v.state))
                .sort(byTab(tab.key));
        }
        return result;
    }, [vouchers]);

    const currentTab = TABS.find((t) => t.key === activeTab);
    const visible = grouped[activeTab] || [];

    return (
        <div>
            <SectionHeader
                title="Voucher Saya"
                description="Tukar kode voucher dan pakai potongan harganya saat checkout"
            />

            <div className="mt-8 space-y-8">
                <RedeemBox onRedeemed={handleRedeemed} initialCode={initialCode} />

                {loading ? (
                    <LoadingSpinner text="Memuat voucher..." />
                ) : error ? (
                    <div className="flex flex-col items-center gap-4">
                        <EmptyState title="Terjadi Kesalahan" description={error} />
                        <button
                            type="button"
                            onClick={loadVouchers}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#E5D6D0] bg-white px-4 py-2 text-sm font-semibold text-[#7A1F2B] transition-colors hover:bg-[#FAF7F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40"
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Coba lagi
                        </button>
                    </div>
                ) : (
                    <section>
                        <div
                            role="tablist"
                            aria-label="Status voucher"
                            className="inline-flex max-w-full overflow-x-auto rounded-xl bg-[#F1ECEA] p-1"
                        >
                            {TABS.map((tab) => {
                                const selected = tab.key === activeTab;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        role="tab"
                                        id={`tab-${tab.key}`}
                                        aria-selected={selected}
                                        aria-controls="voucher-panel"
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40 ${
                                            selected
                                                ? "bg-white text-[#5B0F18] shadow-sm"
                                                : "text-[#737373] hover:text-[#1E1E1E]"
                                        }`}
                                    >
                                        {tab.label}
                                        <span
                                            className={`min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${
                                                selected ? "bg-[#5B0F18] text-white" : "bg-white text-[#737373]"
                                            }`}
                                        >
                                            {grouped[tab.key].length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div
                            id="voucher-panel"
                            role="tabpanel"
                            aria-labelledby={`tab-${activeTab}`}
                            className="mt-5"
                        >
                            {visible.length === 0 ? (
                                <EmptyState
                                    icon={Gift}
                                    title={currentTab.emptyTitle}
                                    description={currentTab.emptyDescription}
                                />
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {visible.map((voucher) => (
                                        <VoucherCard key={voucher.id} voucher={voucher} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

// useSearchParams di App Router wajib berada di dalam <Suspense>,
// kalau tidak build produksi bisa gagal.
export default function VouchersPage() {
    return (
        <Suspense fallback={<LoadingSpinner text="Memuat voucher..." />}>
            <VouchersContent />
        </Suspense>
    );
}