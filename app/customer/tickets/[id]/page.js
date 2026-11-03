// app/customer/ticket/[id]/page.js
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Cookies from "js-cookie";
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Info,
    Lock,
    MapPin,
    RefreshCw,
    Receipt,
    Shield,
    Sparkles,
    Ticket,
    Users,
    Wallet,
    X,
    Armchair,
    CreditCard,
    Package2,
    Headphones,
    Sparkle,
} from "lucide-react";

import { getTicketById } from "@/services/ticketService";
import BackButton from "@/components/backButton";

function formatRupiah(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "Rp 0";
    }
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value));
}

function formatEventDate(dateStr, timeStr) {
    if (!dateStr) return "-";
    const MONTHS_ID = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const day = d.getDate();
    const month = MONTHS_ID[d.getMonth()];
    const year = d.getFullYear();
    const time = timeStr ? String(timeStr).slice(0, 5) : null;
    return `${day} ${month} ${year}${time ? ` • ${time} WIB` : ""}`;
}

function formatTimeRange(startTime, endTime) {
    if (!startTime) return "-";
    const start = String(startTime).slice(0, 5);
    if (!endTime) return `${start} WIB`;
    return `${start} - ${String(endTime).slice(0, 5)} WIB`;
}

const PAYMENT_LABELS = {
    bank_transfer: "Transfer Bank / VA",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
    credit_card: "Kartu Kredit",
};

function formatPaymentMethod(type) {
    if (!type) return "-";
    return PAYMENT_LABELS[type] || type;
}

// Ketentuan default kalau admin belum mengisi event_ticket_rules untuk
// kategori tiket ini — tetap generik, tidak mengarang detail spesifik.
const DEFAULT_RULES = [
    { title: "Bawa identitas diri", description: "Wajib membawa e-KTP/paspor yang sesuai saat check-in." },
    { title: "Tas transparan", description: "Tas transparan/clear bag direkomendasikan untuk mempercepat pemeriksaan." },
];

function Toast({ message, icon: Icon, visible, onClose }) {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onClose, 3500);
            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
            }`}
        >
            <div className="bg-[#5B0F18] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3">
                {Icon && <Icon className="h-5 w-5 text-[#F3D9A4]" />}
                <span className="text-sm font-semibold">{message}</span>
            </div>
        </div>
    );
}

export default function TicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const ticketId = params?.id;

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ visible: false, message: "", icon: null });

    const showToast = useCallback((message, icon = CheckCircle2) => {
        setToast({ visible: true, message, icon });
    }, []);
    const hideToast = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) {
            router.replace("/login");
        }
    }, [router]);

    useEffect(() => {
        if (!ticketId) return;
        let cancelled = false;

        async function loadTicket() {
            try {
                setLoading(true);
                setError(null);
                const ticketRes = await getTicketById(ticketId);
                if (!cancelled) setTicket(ticketRes);
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat detail tiket");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadTicket();
        return () => {
            cancelled = true;
        };
    }, [ticketId]);

    const handleDownloadPDF = () => {
        window.print();
    };

    const priceBreakdown = useMemo(() => {
        if (!ticket) return null;
        return {
            ticketPrice: Number(ticket.ticket_price || 0),
            discount: Number(ticket.discount_amount || 0),
            total: Number(ticket.final_price || 0),
        };
    }, [ticket]);

    const rules = ticket?.rules?.length ? ticket.rules : DEFAULT_RULES;
    const areas = ticket?.areas || [];
    const benefits = ticket?.benefits || [];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="h-8 w-8 text-[#5B0F18] animate-spin" />
                    <p className="text-sm text-[#8C7777]">Memuat detail tiket...</p>
                </div>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
                    <X className="h-12 w-12 text-[#B3261E] mx-auto mb-4" />
                    <h2 className="text-lg font-bold text-[#1E1E1E] mb-2">Gagal Memuat Tiket</h2>
                    <p className="text-sm text-[#8C7777] mb-4">{error || "Tiket tidak ditemukan"}</p>
                    <backButton
                        href="/customer/tickets"
                        label="Kembali ke Daftar Tiket"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B0F18] text-white text-sm font-semibold shadow-sm hover:bg-[#3B0008] transition-colors"
                    />
                </div>
            </div>
        );
    }

    const statusLabel =
        ticket.status === "active" ? "TIKET AKTIF • SIAP DIGUNAKAN"
        : ticket.status === "used" ? "TIKET SUDAH DIGUNAKAN"
        : ticket.status === "expired" ? "TIKET KEDALUWARSA"
        : "TIKET DIBATALKAN";

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <main className="relative w-full pt-6 px-6 pb-8 max-w-7xl mx-auto">
                <div className="flex flex-col w-full">
                    {/* Breadcrumb & Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm text-[#8C7777]">
                                <BackButton href="/customer/dashboard" label="Kembali ke Dashboard" />
                                <span>/</span>
                                <span className="text-[#5B0F18] font-semibold truncate max-w-xs sm:max-w-md">
                                    {ticket.event_title}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-[#5B0F18] tracking-tight">
                                    E-Ticket Digital Pass
                                </h1>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF3D8] text-[#B4841F] shadow-sm">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B4841F] opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B4841F]" />
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{statusLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#5B0F18] shadow-sm hover:bg-[#F3E9DD] transition-all text-sm font-semibold"
                            >
                                <Download className="h-4 w-4" />
                                <span>Unduh / Cetak Tiket</span>
                            </button>
                            <button
                                type="button"
                                disabled
                                title="Fitur transfer tiket masih dalam pengembangan"
                                onClick={() => showToast("Fitur transfer tiket segera hadir", Users)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 text-[#8C7777] cursor-not-allowed text-sm font-semibold"
                            >
                                <Users className="h-4 w-4" />
                                <span>Transfer Tiket (Segera)</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        {/* LEFT COLUMN */}
                        <div className="xl:col-span-8 flex flex-col gap-6">
                            {/* HERO TICKET CARD */}
                            <div className="relative bg-gradient-to-br from-[#5B0F18] via-[#581825] to-[#3E000E] text-white rounded-3xl shadow-xl overflow-hidden">
                                <div
                                    className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none mix-blend-overlay"
                                    style={ticket.poster ? { backgroundImage: `url(${ticket.poster})` } : undefined}
                                />
                                <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#ffc55f]/10 blur-3xl pointer-events-none" />

                                <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <div className="flex flex-col gap-2 max-w-xl">
                                        <span className="px-2.5 py-0.5 rounded-full bg-[#7d5700] text-white text-xs font-extrabold uppercase tracking-widest w-fit">
                                            {ticket.category_name}
                                        </span>
                                        <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                                            {ticket.event_title}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[#ffb2bb] text-sm pt-1">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-4 w-4 text-[#ffdeaa]" />
                                                <span>{formatEventDate(ticket.event_date, ticket.start_time)}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-4 w-4 text-[#ffdeaa]" />
                                                <span>{formatTimeRange(ticket.start_time, ticket.end_time)}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-4 w-4 text-[#ffdeaa]" />
                                                <span>{ticket.event_location}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white/10 backdrop-blur-md shadow-inner text-center shrink-0">
                                        <Sparkles className="h-9 w-9 text-[#ffc55f]" />
                                        <span className="text-xs text-[#ffdeaa] uppercase font-bold mt-1 tracking-wider">
                                            {ticket.category_name}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative w-full py-2 flex items-center">
                                    <div className="absolute -left-4 top-1/2 w-8 h-8 rounded-full bg-[#F8F1E7] -translate-y-1/2 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.12)] z-20" />
                                    <div className="absolute -right-4 top-1/2 w-8 h-8 rounded-full bg-[#F8F1E7] -translate-y-1/2 shadow-[inset_3px_0_6px_rgba(0,0,0,0.12)] z-20" />
                                    <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffb2bb]/30 to-transparent" />
                                </div>

                                {/* Area/Zona asli dari event_ticket_areas */}
                                <div className="relative p-6 sm:p-8 bg-[#600c1f]/30">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ffc55f]/20 border border-[#ffc55f]/30 text-[#ffdeaa] text-xs font-bold w-fit mb-4">
                                        <Info className="h-4 w-4" />
                                        <span>Kode Tiket: {ticket.ticket_code}</span>
                                    </div>

                                    {areas.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-white/10 backdrop-blur-md p-5 rounded-2xl">
                                            {areas.map((area) => (
                                                <div key={area.id} className="flex flex-col">
                                                    <span className="text-xs text-[#ffb2bb] uppercase tracking-wider">
                                                        {area.floor || "AREA"}
                                                    </span>
                                                    <span className="text-xl font-extrabold mt-0.5">{area.area_name}</span>
                                                    {area.access_type && (
                                                        <span className="text-xs text-[#ffdeaa] font-medium">{area.access_type}</span>
                                                    )}
                                                    {area.gate_name && (
                                                        <span className="text-xs text-[#ffb2bb]">{area.gate_name}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 bg-white/10 backdrop-blur-md p-5 rounded-2xl">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#ffb2bb] uppercase tracking-wider">KATEGORI</span>
                                                <span className="text-xl font-extrabold mt-0.5">{ticket.category_name}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#ffb2bb] uppercase tracking-wider">HARGA</span>
                                                <span className="text-xl font-extrabold text-[#ffdeaa] mt-0.5">
                                                    {formatRupiah(ticket.ticket_price)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-[#ffb2bb] uppercase tracking-wider">STATUS</span>
                                                <span className="text-xl font-extrabold mt-0.5 capitalize">{ticket.status}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-[#3c0311]/95 px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-[#ffb2bb] text-xs">
                                    <div className="flex items-center gap-2">
                                        <Lock className="h-4 w-4 text-[#ffdeaa]" />
                                        <span className="tracking-wide">TIKET INI SAH DITERBITKAN OLEH EVENTIFY</span>
                                    </div>
                                </div>
                            </div>

                            {/* QR CODE SECTION — QR asli dari backend */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
                                <div className="relative shrink-0 flex flex-col items-center p-5 bg-[#F8F1E7] rounded-2xl shadow-inner">
                                    <div className="relative w-52 h-52 bg-white rounded-xl p-3 flex items-center justify-center overflow-hidden shadow-sm">
                                        {ticket.qr_code && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={ticket.qr_code} alt="QR Tiket" className="w-full h-full object-contain" />
                                        )}
                                    </div>
                                    <span className="text-xs text-[#8C7777] text-center mt-2 font-mono">
                                        {ticket.ticket_code}
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="flex items-center gap-2 text-[#7d5700]">
                                        <Shield className="h-5 w-5" />
                                        <span className="text-sm font-bold uppercase tracking-wide">Gate Check-in</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#1E1E1E] leading-tight">
                                        Tunjukkan QR ini di pintu masuk
                                    </h3>
                                    <p className="text-sm text-[#8C7777]">
                                        Petugas akan memindai QR code di atas untuk memvalidasi kode tiket{" "}
                                        <span className="font-mono font-semibold">{ticket.ticket_code}</span>. Pastikan
                                        kecerahan layar maksimal saat antre di gate.
                                    </p>
                                </div>
                            </div>

                            {/* BENEFITS — asli dari event_ticket_benefits */}
                            {benefits.length > 0 && (
                                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#ffc55f]/40 flex items-center justify-center text-[#755100]">
                                                <Sparkle className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-lg font-bold text-[#1E1E1E]">
                                                Fasilitas Pemegang {ticket.category_name}
                                            </h3>
                                        </div>
                                        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#EAE7E7] text-[#5B0F18] text-xs font-bold uppercase">
                                            {benefits.length} Benefit
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {benefits.map((benefit) => (
                                            <div key={benefit.id} className="p-4 rounded-2xl bg-[#F8F1E7] flex flex-col gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-[#581825] text-[#ffdeaa] flex items-center justify-center">
                                                    <Sparkle className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-bold text-[#1E1E1E]">{benefit.title}</span>
                                                {benefit.description && (
                                                    <span className="text-xs text-[#8C7777]">{benefit.description}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="xl:col-span-4 flex flex-col gap-6">
                            {/* AREA / ZONA — daftar asli, bukan denah karangan */}
                            {areas.length > 0 && (
                                <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <Armchair className="h-5 w-5 text-[#5B0F18]" />
                                        <h3 className="text-lg font-bold text-[#1E1E1E]">Area & Zona</h3>
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        {areas.map((area) => (
                                            <div
                                                key={area.id}
                                                className="w-full p-3 rounded-xl bg-[#F8F1E7] flex flex-col gap-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-[#1E1E1E]">{area.area_name}</span>
                                                    {area.floor && (
                                                        <span className="px-2 py-0.5 rounded bg-white text-[#8C7777] text-xs font-semibold">
                                                            {area.floor}
                                                        </span>
                                                    )}
                                                </div>
                                                {(area.access_type || area.gate_name) && (
                                                    <span className="text-xs text-[#8C7777]">
                                                        {[area.access_type, area.gate_name].filter(Boolean).join(" • ")}
                                                    </span>
                                                )}
                                                {area.description && (
                                                    <span className="text-xs text-[#8C7777]">{area.description}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* INVOICE BREAKDOWN — angka asli */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="h-5 w-5 text-[#5B0F18]" />
                                        <h3 className="text-lg font-bold text-[#1E1E1E]">Rincian Faktur & Biaya</h3>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-[#7d5700]/10 text-[#7d5700] text-xs font-bold uppercase">
                                        {ticket.transaction_status || "-"}
                                    </span>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-[#F8F1E7] flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-[#8C7777]">No. Faktur</span>
                                        <span className="font-mono text-[#1E1E1E] font-semibold">
                                            {ticket.invoice_number}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-[#8C7777]">Metode Bayar</span>
                                        <span className="text-[#1E1E1E] font-semibold flex items-center gap-1.5">
                                            <Wallet className="h-4 w-4 text-[#5B0F18]" />
                                            {formatPaymentMethod(ticket.payment_type)}
                                        </span>
                                    </div>
                                    {ticket.settlement_time && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-[#8C7777]">Dibayar Pada</span>
                                            <span className="text-[#1E1E1E] font-semibold">
                                                {formatEventDate(ticket.settlement_time)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {priceBreakdown && (
                                    <div className="flex flex-col gap-2.5 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#8C7777]">1x {ticket.category_name}</span>
                                            <span className="font-semibold text-[#1E1E1E]">
                                                {formatRupiah(priceBreakdown.ticketPrice)}
                                            </span>
                                        </div>
                                        {priceBreakdown.discount > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-[#8C7777]">Diskon Voucher</span>
                                                <span className="font-semibold text-[#1E7A4C]">
                                                    -{formatRupiah(priceBreakdown.discount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="w-full h-[1px] bg-[#EAE7E7] my-1" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-[#1E1E1E]">Total Pembayaran</span>
                                            <span className="text-lg font-extrabold text-[#5B0F18]">
                                                {formatRupiah(priceBreakdown.total)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleDownloadPDF}
                                    className="w-full py-2.5 rounded-xl bg-[#F8F1E7] text-[#5B0F18] hover:bg-[#F3E9DD] transition-colors text-sm font-bold flex items-center justify-center gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Unduh / Cetak Struk</span>
                                </button>
                            </div>

                            {/* RULES — asli dari event_ticket_rules, fallback generik kalau kosong */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-[#5B0F18]">
                                    <Shield className="h-5 w-5" />
                                    <h3 className="text-lg font-bold text-[#1E1E1E]">Ketentuan & Syarat Masuk</h3>
                                </div>

                                <div className="flex flex-col gap-3 text-xs text-[#8C7777]">
                                    {rules.map((rule, idx) => (
                                        <div key={rule.id || idx} className="flex items-start gap-2.5">
                                            <CreditCard className="h-4 w-4 text-[#5B0F18] shrink-0 mt-0.5" />
                                            <span>
                                                <strong className="text-[#1E1E1E]">{rule.title}</strong>
                                                {rule.description ? ` — ${rule.description}` : ""}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-2.5">
                                        <Clock className="h-4 w-4 text-[#B3261E] shrink-0 mt-0.5" />
                                        <span>
                                            Datang tepat waktu — acara dimulai {formatTimeRange(ticket.start_time, ticket.end_time)}.
                                        </span>
                                    </div>
                                </div>

                                {/* Helpdesk */}
                                <div className="mt-2 p-3.5 rounded-2xl bg-[#ffc55f]/20 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <Headphones className="h-5 w-5 text-[#755100]" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#755100]">Pusat Bantuan</span>
                                            <span className="text-xs text-[#755100]/80">WhatsApp Admin Eventify</span>
                                        </div>
                                    </div>
                                    <a
                                        href="https://wa.me/6281234567890"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-xl bg-white text-[#755100] text-xs font-bold shadow-sm hover:bg-[#FCF9F8] transition-colors"
                                    >
                                        Hubungi
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Toast message={toast.message} icon={toast.icon} visible={toast.visible} onClose={hideToast} />
        </div>
    );
}