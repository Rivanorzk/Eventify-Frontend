// app/customer/checkout/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    BadgePercent,
    CalendarDays,
    Loader2,
    MapPin,
    Music,
    RefreshCw,
    ShieldCheck,
    Ticket,
    X,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { getEventById } from "@/services/eventService";
import { createOrder } from "@/services/orderService";
import { getAvailableVouchers } from "@/services/voucherService";
import { isAuthenticated } from "@/lib/auth";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import { currency, formatDate, formatTime } from "@/lib/formatter";

// Pesan dari backend ada di response.data.message; err.message dari axios
// hanya "Request failed with status code 400".
const getErrorMessage = (err, fallback) =>
    err?.response?.data?.message || err?.data?.message || fallback;

const compactRupiah = (value) => {
    const n = Number(value) || 0;
    if (n >= 1_000_000) return `Rp${+(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000) return `Rp${+(n / 1_000).toFixed(1)}rb`;
    return `Rp${n}`;
};

const discountLabel = (voucher) =>
    voucher.discount_type === "percentage"
        ? `${Number(voucher.discount_value)}%`
        : compactRupiah(voucher.discount_value);

// Perkiraan diskon untuk tampilan. Angka final tetap dihitung server saat order dibuat.
const estimateDiscount = (voucher, subtotal) => {
    if (!voucher) return 0;

    const value = Number(voucher.discount_value);
    let raw;

    if (voucher.discount_type === "percentage") {
        raw = Math.floor((subtotal * value) / 100);

        if (
            voucher.maximum_discount !== null &&
            voucher.maximum_discount !== undefined &&
            raw > Number(voucher.maximum_discount)
        ) {
            raw = Number(voucher.maximum_discount);
        }
    } else {
        raw = value;
    }

    return Math.min(raw, subtotal);
};

// Persentase biaya layanan diambil OTOMATIS dari backend (event.service_fee_percent,
// sama dengan pengaturan superadmin), jadi tidak perlu diubah manual. Env
// NEXT_PUBLIC_SERVICE_FEE_PERCENT hanya cadangan kalau backend belum mengirimnya.
// Angka di checkout tetap PERKIRAAN; total final dihitung server saat order
// dibuat dan ditampilkan di halaman pembayaran.
const ENV_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_SERVICE_FEE_PERCENT);

const resolveFeePercent = (fromApi) => {
    const value =
        fromApi !== null && fromApi !== undefined
            ? Number(fromApi)
            : ENV_FEE_PERCENT;
    return Number.isFinite(value) && value > 0 ? value : 0;
};

// Rumus sama dengan backend: dari harga tiket setelah diskon, dibulatkan ke rupiah.
const estimateServiceFee = (amountAfterDiscount, percent) =>
    percent > 0 ? Math.round((amountAfterDiscount * percent) / 100) : 0;

const formatPercent = (value) =>
    `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value) || 0)}%`;

// Satu pilihan voucher (radio).
function VoucherOption({ voucher, selected, quantity, onSelect }) {
    const minimum = Number(voucher.minimum_quantity) || 1;
    const disabled = quantity < minimum;

    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onSelect(voucher.id)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40 ${
                selected
                    ? "border-[#7A1F2B] bg-[#FBF3F1]"
                    : "border-[#E5D6D0] bg-white hover:border-[#C9A9A2]"
            } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
        >
            <div
                className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-lg px-1 text-center text-sm font-extrabold tabular-nums text-white ${
                    disabled ? "bg-[#7C726F]" : "bg-[#5B0F18]"
                }`}
            >
                {discountLabel(voucher)}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1E1E1E]">
                    {voucher.title || voucher.promo_code}
                </p>
                <p className="mt-0.5 text-xs text-[#8C7777]">
                    {disabled
                        ? `Butuh minimal ${minimum} tiket`
                        : `Berlaku sampai ${formatDate(voucher.end_date)}`}
                </p>
                {!disabled && minimum > 1 && (
                    <p className="text-xs text-[#8C7777]">Minimal {minimum} tiket</p>
                )}
            </div>

            <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-[#7A1F2B]" : "border-[#D9C5BE]"
                }`}
            >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#7A1F2B]" />}
            </span>
        </button>
    );
}

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const eventId = searchParams.get("event_id");
    const ticketId = searchParams.get("ticket_id");
    const initialQuantity = Number(searchParams.get("quantity") || 1);

    const [event, setEvent] = useState(null);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [quantity, setQuantity] = useState(
        Number.isFinite(initialQuantity) && initialQuantity > 0
            ? initialQuantity
            : 1
    );

    // Voucher milik customer untuk event ini (dari /vouchers/available)
    const [vouchers, setVouchers] = useState([]);
    const [vouchersLoading, setVouchersLoading] = useState(true);
    const [vouchersError, setVouchersError] = useState(false);
    const [selectedVoucherId, setSelectedVoucherId] = useState(null);

    const [submitting, setSubmitting] = useState(false);

    // =========================
    // Guard: harus login
    // =========================
    useEffect(() => {
        if (!isAuthenticated()) {
            toast.error("Silakan login untuk melanjutkan checkout");
            if (typeof window !== "undefined") {
                localStorage.setItem(
                    "redirectAfterLogin",
                    window.location.pathname + window.location.search
                );
            }
            router.push("/login");
        }
    }, [router]);

    // =========================
    // Load event & ticket category
    // =========================
    useEffect(() => {
        const load = async () => {
            if (!eventId || !ticketId) {
                setError("Data tiket tidak lengkap");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data = await getEventById(eventId);
                const selected = (data?.ticket_categories || []).find(
                    (t) => String(t.id) === String(ticketId)
                );

                if (!selected) {
                    setError("Kategori tiket tidak ditemukan");
                    return;
                }

                setEvent(data);
                setTicket(selected);
                setQuantity((q) => Math.min(Math.max(q, 1), selected.remaining_stock || 1));
            } catch (err) {
                console.error("Error loading checkout data:", err);
                setError(getErrorMessage(err, "Gagal memuat data checkout"));
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [eventId, ticketId]);

    // =========================
    // Load voucher milik customer untuk event ini
    // =========================
    const loadVouchers = useCallback(async () => {
        if (!eventId) return;

        try {
            setVouchersLoading(true);
            setVouchersError(false);

            const data = await getAvailableVouchers(eventId);
            const list = Array.isArray(data) ? data : [];

            setVouchers(list);
            // Lepas pilihan kalau voucher-nya sudah tidak tersedia
            setSelectedVoucherId((prev) =>
                list.some((v) => v.id === prev) ? prev : null
            );
        } catch (err) {
            console.error("Error loading vouchers:", err);
            setVouchersError(true);
        } finally {
            setVouchersLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        if (isAuthenticated()) {
            loadVouchers();
        }
    }, [loadVouchers]);

    const selectedVoucher = useMemo(
        () => vouchers.find((v) => v.id === selectedVoucherId) || null,
        [vouchers, selectedVoucherId]
    );

    // =========================
    // Lepas voucher kalau jumlah tiket turun di bawah minimumnya
    // =========================
    useEffect(() => {
        if (!selectedVoucher) return;

        const minimum = Number(selectedVoucher.minimum_quantity) || 1;

        if (quantity < minimum) {
            setSelectedVoucherId(null);
            toast(`Voucher dilepas, butuh minimal ${minimum} tiket`, {
                icon: "ℹ️",
            });
        }
    }, [quantity, selectedVoucher]);

    const subtotal = useMemo(() => {
        if (!ticket) return 0;
        return ticket.price * quantity;
    }, [ticket, quantity]);

    const discount = useMemo(
        () => estimateDiscount(selectedVoucher, subtotal),
        [selectedVoucher, subtotal]
    );

    // Harga tiket setelah diskon, lalu ditambah biaya layanan (perkiraan).
    const finalPrice = Math.max(subtotal - discount, 0);
    const feePercent = resolveFeePercent(event?.service_fee_percent);
    const hasFeeEstimate = feePercent > 0;
    const serviceFee = estimateServiceFee(finalPrice, feePercent);
    const grandTotal = finalPrice + serviceFee;

    const handleSelectVoucher = (id) => {
        // Klik voucher yang sama sekali lagi = lepas
        setSelectedVoucherId((prev) => (prev === id ? null : id));
    };

    const handleCheckout = async () => {
        if (!ticket) return;

        if (quantity < 1) {
            toast.error("Minimum pembelian 1 tiket");
            return;
        }

        if (quantity > ticket.remaining_stock) {
            toast.error(`Stok tersisa hanya ${ticket.remaining_stock}`);
            return;
        }

        try {
            setSubmitting(true);

            const order = await createOrder({
                event_id: Number(eventId),
                user_voucher_id: selectedVoucher?.id ?? null,
                tickets: [
                    {
                        ticket_category_id: ticket.id,
                        quantity,
                    },
                ],
            });

            toast.success("Order berhasil dibuat, lanjut ke pembayaran");
            router.push(`/customer/payment/${order.id}`);
        } catch (err) {
            console.error("Checkout error:", err);
            toast.error(getErrorMessage(err, "Gagal membuat order"));
            // Status voucher mungkin berubah (mis. sudah terpakai / kedaluwarsa)
            loadVouchers();
        } finally {
            setSubmitting(false);
        }
    };

    /* =========================
       LOADING
    ========================= */
    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <LoadingSpinner text="Menyiapkan checkout..." />
            </div>
        );
    }

    /* =========================
       ERROR
    ========================= */
    if (error || !event || !ticket) {
        return (
            <div className="mx-auto max-w-3xl">
                <EmptyState
                    title="Checkout tidak tersedia"
                    description={error || "Data tiket tidak ditemukan."}
                />
                <Link
                    href="/customer/event"
                    className="mt-4 inline-flex items-center gap-2 text-[#7A1F2B] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Event
                </Link>
            </div>
        );
    }

    const soldOut = ticket.remaining_stock === 0;

    return (
        <div className="mx-auto max-w-3xl pb-28 lg:pb-8">
            {/* TOP BAR */}
            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1E1E1E] shadow-sm transition hover:bg-[#F8F1E7]"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h1 className="text-lg font-bold text-[#1E1E1E] sm:text-xl">
                    Checkout
                </h1>
            </div>

            <div className="space-y-4">
                {/* EVENT INFO */}
                <div className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#5B0F18]">
                        {event.poster ? (
                            <img
                                src={event.poster}
                                alt={event.title}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <Music className="h-6 w-6 text-white/50" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate font-bold text-[#1E1E1E]">
                            {event.title}
                        </h2>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8C7777]">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span>
                                {formatDate(event.event_date)} • {formatTime(event.start_time)}
                            </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8C7777]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                                {event.location || "To be announced"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* TICKET DETAIL */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1E1E1E]">
                        <Ticket className="h-4 w-4 text-[#7A1F2B]" />
                        Detail Tiket
                    </h3>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E5D6D0] p-4">
                        <div>
                            <p className="font-semibold text-[#1E1E1E]">
                                {ticket.category_name || "Regular"}
                            </p>
                            <p className="mt-0.5 text-sm text-[#8C7777]">
                                {currency(ticket.price)} / tiket
                            </p>
                            {!soldOut && (
                                <p className="mt-0.5 text-xs text-[#8C7777]">
                                    Sisa {ticket.remaining_stock} tiket
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                disabled={soldOut}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5D6D0] transition hover:bg-[#F8F1E7] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                -
                            </button>
                            <span className="w-8 text-center font-semibold text-[#1E1E1E]">
                                {quantity}
                            </span>
                            <button
                                onClick={() =>
                                    setQuantity((q) =>
                                        Math.min(ticket.remaining_stock || 0, q + 1)
                                    )
                                }
                                disabled={soldOut || quantity >= ticket.remaining_stock}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5D6D0] transition hover:bg-[#F8F1E7] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {soldOut && (
                        <p className="mt-3 text-sm font-medium text-[#B3261E]">
                            Tiket kategori ini sudah habis.
                        </p>
                    )}
                </div>

                {/* VOUCHER */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1E1E1E]">
                            <BadgePercent className="h-4 w-4 text-[#7A1F2B]" />
                            Voucher
                        </h3>

                        {selectedVoucher && (
                            <button
                                type="button"
                                onClick={() => setSelectedVoucherId(null)}
                                className="inline-flex items-center gap-1 rounded-md text-xs font-semibold text-[#8C7777] transition hover:text-[#B3261E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40"
                            >
                                <X className="h-3.5 w-3.5" />
                                Lepas voucher
                            </button>
                        )}
                    </div>

                    {vouchersLoading ? (
                        <div className="flex items-center gap-2 text-sm text-[#8C7777]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat voucher Anda...
                        </div>
                    ) : vouchersError ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F1E7] px-4 py-3 text-sm text-[#8C7777]">
                            <span>Voucher gagal dimuat. Anda tetap bisa lanjut tanpa voucher.</span>
                            <button
                                type="button"
                                onClick={loadVouchers}
                                className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#7A1F2B] hover:underline"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Coba lagi
                            </button>
                        </div>
                    ) : vouchers.length === 0 ? (
                        <div className="rounded-xl bg-[#F8F1E7] px-4 py-3 text-sm text-[#8C7777]">
                            <p>Anda belum punya voucher untuk event ini.</p>
                            <Link
                                href="/customer/voucher"
                                className="mt-1 inline-block font-semibold text-[#7A1F2B] hover:underline"
                            >
                                Punya kode? Tukar di halaman voucher
                            </Link>
                        </div>
                    ) : (
                        <div
                            role="radiogroup"
                            aria-label="Pilih voucher"
                            className="max-h-72 space-y-2 overflow-y-auto"
                        >
                            {vouchers.map((voucher) => (
                                <VoucherOption
                                    key={voucher.id}
                                    voucher={voucher}
                                    selected={voucher.id === selectedVoucherId}
                                    quantity={quantity}
                                    onSelect={handleSelectVoucher}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* PRICE SUMMARY */}
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-bold text-[#1E1E1E]">
                        Ringkasan Pembayaran
                    </h3>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-[#8C7777]">
                            <span>
                                Subtotal ({quantity}x {ticket.category_name || "Tiket"})
                            </span>
                            <span>{currency(subtotal)}</span>
                        </div>

                        {discount > 0 && (
                            <div className="flex justify-between text-[#1E7A4C]">
                                <span>Diskon ({selectedVoucher?.promo_code})</span>
                                <span>-{currency(discount)}</span>
                            </div>
                        )}

                        {hasFeeEstimate && (
                            <div className="flex justify-between text-[#8C7777]">
                                <span>
                                    Biaya Layanan ({formatPercent(feePercent)})
                                </span>
                                <span>{currency(serviceFee)}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#E5D6D0] pt-4">
                        <span className="font-semibold text-[#1E1E1E]">
                            {hasFeeEstimate ? "Total Bayar" : "Total Tiket"}
                        </span>
                        <span className="text-xl font-bold text-[#5B0F18]">
                            {currency(grandTotal)}
                        </span>
                    </div>

                    <p className="mt-2 text-xs text-[#8C7777]">
                        {hasFeeEstimate
                            ? "Perkiraan. Total final tampil di halaman pembayaran setelah order dibuat."
                            : "Biaya layanan (jika ada) ditambahkan di halaman pembayaran."}
                    </p>
                </div>

                {/* INFO */}
                <div className="flex items-start gap-2 rounded-2xl bg-[#F8F1E7] p-4 text-xs text-[#8C7777]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7A1F2B]" />
                    <p>
                        Order akan menunggu pembayaran selama 15 menit. Jika belum
                        dibayar sampai batas waktu tersebut, tiket akan otomatis
                        dilepas kembali.
                    </p>
                </div>

                {/* DESKTOP CTA */}
                <button
                    onClick={handleCheckout}
                    disabled={submitting || soldOut}
                    className="hidden w-full items-center justify-center gap-2 rounded-2xl bg-[#5B0F18] py-3.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
                        </>
                    ) : (
                        `Lanjutkan ke Pembayaran • ${currency(grandTotal)}`
                    )}
                </button>
            </div>

            {/* MOBILE STICKY CTA */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5D6D0] bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
                <button
                    onClick={handleCheckout}
                    disabled={submitting || soldOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B0F18] py-3.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses...
                        </>
                    ) : (
                        `Bayar`
                    )}
                </button>
            </div>
        </div>
    );
}