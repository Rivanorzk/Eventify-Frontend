// app/admin/events/[id]/analytics/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    ArrowLeft,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Download,
    Loader2,
    MapPin,
    Search,
    Sparkles,
    Ticket,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
} from "lucide-react";

import { getEventById } from "@/services/eventService";
import { getEventAnalytics } from "@/services/dashboardService";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAYS_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatRupiah(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value));
}

function formatCompactRupiah(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return formatRupiah(n);
}

function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
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

function formatDateTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const day = d.getDate();
    const month = MONTHS_ID[d.getMonth()]?.slice(0, 3);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} • ${hh}:${mm}`;
}

function buildLinePath(values, { width = 700, top = 20, bottom = 210, leftPad = 30, rightPad = 30 } = {}) {
    const max = Math.max(1, ...values);
    const usableWidth = width - leftPad - rightPad;
    const step = values.length > 1 ? usableWidth / (values.length - 1) : 0;
    const points = values.map((v, i) => {
        const x = leftPad + step * i;
        const y = bottom - (v / max) * (bottom - top);
        return { x, y };
    });
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const lastX = points.length ? points[points.length - 1].x.toFixed(1) : leftPad;
    const area = `${line} L ${lastX},${bottom} L ${leftPad},${bottom} Z`;
    return { line, area, points };
}

function getOrderStatusStyle(status) {
    switch ((status || "").toLowerCase()) {
        case "paid":
        case "success":
            return "bg-[#E4F3EA] text-[#1E7A4C]";
        case "pending":
            return "bg-[#FDF3D8] text-[#B4841F]";
        case "failed":
        case "cancelled":
            return "bg-[#F3E4E4] text-[#B3261E]";
        default:
            return "bg-[#F0EDED] text-[#8C7777]";
    }
}

export default function EventAnalyticsPage() {
    const router = useRouter();
    const { id } = useParams();

    const [event, setEvent] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [range, setRange] = useState("all"); // all | 7d | 30d

    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) {
            router.replace("/login");
            return;
        }
        if (!id) return;

        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);
                const [eventRes, analyticsRes] = await Promise.all([
                    getEventById(id),
                    getEventAnalytics(id, { range }),
                ]);
                if (cancelled) return;
                setEvent(eventRes);
                setAnalytics(analyticsRes);
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat analitik event");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id, range, router]);

    const summary = analytics?.summary || {};
    const trend = analytics?.sales_trend || [];
    const tiers = analytics?.tier_breakdown || [];
    const recentOrders = analytics?.recent_orders || [];
    const buyerLocations = analytics?.buyer_locations || [];

    const ticketSeries = useMemo(() => buildLinePath(trend.map((d) => d.tickets_sold)), [trend]);
    const revenueSeries = useMemo(() => buildLinePath(trend.map((d) => d.revenue)), [trend]);
    const trendLabels = trend.map((d, i) => {
        if (i === trend.length - 1) return "Hari Ini";
        const dd = new Date(d.date);
        return DAYS_SHORT_ID[dd.getDay()];
    });

    const kpiCards = useMemo(() => {
        if (!analytics) return [];
        const soldPct = summary.tickets_quota
            ? Math.round((summary.tickets_sold / summary.tickets_quota) * 100)
            : 0;
        const checkinPct = summary.tickets_sold
            ? Math.round((summary.checked_in / summary.tickets_sold) * 100)
            : 0;
        const growth = summary.revenue_growth_percent ?? 0;

        return [
            {
                label: "Total Pendapatan",
                value: formatCompactRupiah(summary.total_revenue ?? 0),
                icon: Wallet,
                trend: `${growth > 0 ? "+" : ""}${growth}%`,
                trendDown: growth < 0,
                note: "vs periode sebelumnya",
                accent: "border-t-4 border-t-[#5B0F18]",
            },
            {
                label: "Tiket Terjual",
                value: formatNumber(summary.tickets_sold ?? 0),
                suffix: `/ ${formatNumber(summary.tickets_quota ?? 0)}`,
                icon: Ticket,
                percent: soldPct,
                note: `${soldPct}% dari total kuota`,
            },
            {
                label: "Check-in Rate",
                value: `${checkinPct}%`,
                icon: CheckCircle2,
                badge: `${formatNumber(summary.checked_in ?? 0)} tiket discan`,
                badgeClasses: "bg-[#E4F3EA] text-[#1E7A4C]",
                note: "Dari tiket yang terjual",
            },
            {
                label: "Rata-rata Order",
                value: formatCompactRupiah(summary.avg_order_value ?? 0),
                icon: TrendingUp,
                badge: `${formatNumber(summary.total_orders ?? 0)} transaksi`,
                badgeClasses: "bg-[#F0EDED] text-[#8C7777]",
                note: "Nilai rata-rata per invoice",
            },
        ];
    }, [analytics, summary]);

    const handleExportPdf = useCallback(() => {
        if (!analytics || !event) return;
        setExporting(true);
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const maroon = [91, 15, 24];
            const gold = [180, 132, 31];
            const grey = [140, 119, 119];
            const printedAt = new Date().toLocaleString("id-ID", {
                day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            });

            doc.setFillColor(...maroon);
            doc.rect(0, 0, 210, 34, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.text("Laporan Analitik Event", 14, 14);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(event.title || "-", 14, 21);
            doc.setFontSize(9);
            doc.text(
                `${formatEventDate(event.event_date, event.start_time)} • ${event.location || "-"}`,
                14, 28
            );

            doc.setTextColor(...grey);
            doc.setFontSize(9);
            doc.text(`Dicetak: ${printedAt} WIB`, 14, 44);

            autoTable(doc, {
                startY: 50,
                head: [["Metrik", "Nilai"]],
                body: [
                    ["Total Pendapatan", formatRupiah(summary.total_revenue ?? 0)],
                    [
                        "Tiket Terjual",
                        `${formatNumber(summary.tickets_sold ?? 0)} / ${formatNumber(summary.tickets_quota ?? 0)}`,
                    ],
                    ["Check-in", `${formatNumber(summary.checked_in ?? 0)} tiket`],
                    ["Total Transaksi", formatNumber(summary.total_orders ?? 0)],
                    ["Rata-rata Order", formatRupiah(summary.avg_order_value ?? 0)],
                ],
                theme: "grid",
                headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 80 }, 1: { halign: "right" } },
            });

            let cursorY = (doc.lastAutoTable?.finalY || 50) + 10;

            if (tiers.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Breakdown Kategori Tiket", 14, cursorY);
                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Kategori", "Harga", "Terjual", "Kuota", "Pendapatan"]],
                    body: tiers.map((t) => [
                        t.name || "-",
                        formatRupiah(t.price ?? 0),
                        formatNumber(t.sold ?? 0),
                        formatNumber(t.quota ?? 0),
                        formatRupiah(t.revenue ?? 0),
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: gold, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 8.5, cellPadding: 2.5 },
                    columnStyles: {
                        1: { halign: "right" }, 2: { halign: "right" },
                        3: { halign: "right" }, 4: { halign: "right" },
                    },
                });
                cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
            }

            if (recentOrders.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Transaksi Terbaru", 14, cursorY);
                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Invoice", "Pembeli", "Kategori", "Qty", "Total", "Status"]],
                    body: recentOrders.slice(0, 20).map((o) => [
                        o.invoice_number || "-",
                        o.buyer_name || "-",
                        o.tier_name || "-",
                        formatNumber(o.quantity ?? 0),
                        formatRupiah(o.total ?? 0),
                        (o.status || "-").toUpperCase(),
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 8, cellPadding: 2 },
                });
            }

            const pageCount = doc.getNumberOfPages();
            for (let p = 1; p <= pageCount; p += 1) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(...grey);
                doc.text(
                    `Eventify • Laporan Analitik • Halaman ${p} dari ${pageCount}`,
                    105, 290, { align: "center" }
                );
            }

            doc.save(`analitik-${(event.title || "event").toLowerCase().replace(/\s+/g, "-")}.pdf`);
        } catch (err) {
            setError(err.message || "Gagal mengekspor PDF");
        } finally {
            setExporting(false);
        }
    }, [analytics, event, summary, tiers, recentOrders]);

    const topCities = buyerLocations.slice(0, 5);
    const maxCityCount = Math.max(1, ...topCities.map((c) => c.count || 0));

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <div className="mx-auto max-w-7xl px-6 py-6">
                {/* Search + Back */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5B0F18] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali ke Dashboard
                    </Link>
                    <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-[#8C7777] sm:max-w-md">
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari invoice, pembeli, atau kategori..."
                            className="w-full bg-white text-[#1E1E1E] outline-none placeholder:text-[#8C7777]"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        {error}
                    </div>
                )}

                {/* Hero */}
                <div className="mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B0F18] to-[#3A0810] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {event?.category_name || "Analitik Event"}
                        </span>
                        <h1 className="truncate text-2xl font-bold sm:text-3xl">
                            {loading ? "Memuat..." : event?.title || "Analitik Event"}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatEventDate(event?.event_date, event?.start_time)}
                            </span>
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {event?.location || "-"}
                            </span>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <div className="inline-flex rounded-full bg-white/10 p-1">
                            {[
                                { k: "all", l: "Semua" },
                                { k: "30d", l: "30 Hari" },
                                { k: "7d", l: "7 Hari" },
                            ].map((opt) => (
                                <button
                                    key={opt.k}
                                    onClick={() => setRange(opt.k)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                                        range === opt.k ? "bg-white text-[#5B0F18]" : "text-white/80 hover:text-white"
                                    }`}
                                >
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Link
                                href={`/admin/events/${id}/tickets`}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
                            >
                                <Ticket className="h-3.5 w-3.5" />
                                Kelola Tiket
                            </Link>
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={exporting || loading || !analytics}
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {exporting ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Menyiapkan...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-3.5 w-3.5" />
                                        Ekspor PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {(loading ? Array.from({ length: 4 }) : kpiCards).map((stat, i) => {
                        if (!stat) {
                            return <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/60 shadow-sm" />;
                        }
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className={`rounded-2xl bg-white p-5 shadow-sm ${stat.accent || ""}`}>
                                <div className="flex items-start justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        {stat.label}
                                    </p>
                                    <Icon className="h-4 w-4 text-[#8C7777]" />
                                </div>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <p className="text-2xl font-bold text-[#1E1E1E]">{stat.value}</p>
                                    {stat.suffix && <span className="text-sm text-[#8C7777]">{stat.suffix}</span>}
                                </div>
                                {stat.percent !== undefined && (
                                    <div className="mt-3">
                                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                            <div className="h-full rounded-full bg-[#F3D9A4]" style={{ width: `${stat.percent}%` }} />
                                        </div>
                                    </div>
                                )}
                                {stat.trend && (
                                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        stat.trendDown ? "bg-[#F3E4E4] text-[#B3261E]" : "bg-[#E4F3EA] text-[#1E7A4C]"
                                    }`}>
                                        {stat.trendDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                        {stat.trend}
                                    </span>
                                )}
                                {stat.badge && (
                                    <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${stat.badgeClasses}`}>
                                        {stat.badge}
                                    </span>
                                )}
                                <p className="mt-2 text-xs text-[#8C7777]">{stat.note}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Chart + Tier Breakdown */}
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Tren Penjualan</h2>
                                <p className="text-xs text-[#8C7777]">Tiket terjual &amp; omzet per hari</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#5B0F18]" /> Tiket
                                </span>
                                <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#B4841F]" /> Omzet
                                </span>
                            </div>
                        </div>

                        {!loading && trend.length > 0 && trend.every((d) => !d.tickets_sold && !d.revenue) ? (
                            <div className="flex h-56 w-full items-center justify-center rounded-xl bg-[#F8F1E7] text-sm text-[#8C7777]">
                                Belum ada penjualan pada rentang ini.
                            </div>
                        ) : (
                            <div className="h-56 w-full">
                                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 220">
                                    <defs>
                                        <linearGradient id="anPrimaryGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#581825" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#581825" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="anAmberGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#ffc55f" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#ffc55f" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <line stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1="20" y2="20" />
                                    <line stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1="70" y2="70" />
                                    <line stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1="120" y2="120" />
                                    <line stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1="170" y2="170" />
                                    <line stroke="#e5e2e1" strokeWidth="1" x1="0" x2="700" y1="210" y2="210" />
                                    <path d={ticketSeries.area} fill="url(#anPrimaryGrad)" />
                                    <path d={ticketSeries.line} fill="none" stroke="#581825" strokeLinecap="round" strokeWidth="3" />
                                    <path d={revenueSeries.area} fill="url(#anAmberGrad)" />
                                    <path d={revenueSeries.line} fill="none" stroke="#755100" strokeDasharray="4 3" strokeLinecap="round" strokeWidth="2.5" />
                                    {ticketSeries.points.map((p, i) => (
                                        <circle key={`t-${i}`} cx={p.x} cy={p.y} fill="#3c0311" r="4" stroke="#ffffff" strokeWidth="1.5" />
                                    ))}
                                </svg>
                            </div>
                        )}

                        <div className="flex justify-between px-3 pt-2 text-[10px] uppercase text-[#8C7777]">
                            {trendLabels.map((label, i) => <span key={i}>{label}</span>)}
                        </div>
                    </div>

                    {/* Tier breakdown */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-[#1E1E1E]">Breakdown Kategori</h2>
                        <p className="mb-4 text-xs text-[#8C7777]">Penjualan per tier tiket</p>

                        {loading && <div className="h-48 animate-pulse rounded-xl bg-white/60" />}

                        {!loading && tiers.length === 0 && (
                            <div className="rounded-xl bg-[#F8F1E7] p-4 text-center text-xs text-[#8C7777]">
                                Belum ada kategori tiket.
                            </div>
                        )}

                        <div className="space-y-4">
                            {tiers.map((tier) => {
                                const pct = tier.quota ? Math.round((tier.sold / tier.quota) * 100) : 0;
                                return (
                                    <div key={tier.id || tier.name}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-[#1E1E1E]">{tier.name}</p>
                                                <p className="text-[11px] text-[#8C7777]">{formatRupiah(tier.price ?? 0)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-[#5B0F18]">{pct}%</p>
                                                <p className="text-[10px] text-[#8C7777]">
                                                    {formatNumber(tier.sold)} / {formatNumber(tier.quota)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                            <div className="h-full rounded-full bg-[#5B0F18]" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Buyer Locations + Recent Orders */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-[#5B0F18]" />
                            <h2 className="text-lg font-bold text-[#1E1E1E]">Top Kota Pembeli</h2>
                        </div>
                        {loading && <div className="h-40 animate-pulse rounded-xl bg-white/60" />}
                        {!loading && topCities.length === 0 && (
                            <div className="rounded-xl bg-[#F8F1E7] p-4 text-center text-xs text-[#8C7777]">
                                Belum ada data lokasi pembeli.
                            </div>
                        )}
                        <div className="space-y-3">
                            {topCities.map((c, i) => (
                                <div key={c.city || i}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-[#1E1E1E]">{c.city || "-"}</span>
                                        <span className="text-[#8C7777]">{formatNumber(c.count)} pembeli</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                        <div className="h-full rounded-full bg-[#F3D9A4]" style={{ width: `${(c.count / maxCityCount) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Transaksi Terbaru</h2>
                                <p className="text-xs text-[#8C7777]">20 order terakhir untuk event ini</p>
                            </div>
                            <Link
                                href={`/admin/events/${id}/tickets`}
                                className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                            >
                                Kelola Tiket <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        {loading && <div className="h-48 animate-pulse rounded-xl bg-white/60" />}

                        {!loading && recentOrders.length === 0 && (
                            <div className="rounded-xl bg-[#F8F1E7] p-6 text-center text-sm text-[#8C7777]">
                                Belum ada transaksi.
                            </div>
                        )}

                        {!loading && recentOrders.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-[#F0EDED] text-[10px] uppercase tracking-wide text-[#8C7777]">
                                            <th className="py-2 pr-3">Invoice</th>
                                            <th className="py-2 pr-3">Pembeli</th>
                                            <th className="py-2 pr-3">Kategori</th>
                                            <th className="py-2 pr-3 text-right">Qty</th>
                                            <th className="py-2 pr-3 text-right">Total</th>
                                            <th className="py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.slice(0, 20).map((o, i) => (
                                            <tr key={o.id || i} className="border-b border-[#F8F1E7] last:border-0">
                                                <td className="py-2.5 pr-3 font-mono text-xs text-[#1E1E1E]">
                                                    {o.invoice_number || "-"}
                                                </td>
                                                <td className="py-2.5 pr-3">
                                                    <p className="font-semibold text-[#1E1E1E]">{o.buyer_name || "-"}</p>
                                                    <p className="text-[10px] text-[#8C7777]">{formatDateTime(o.created_at)}</p>
                                                </td>
                                                <td className="py-2.5 pr-3 text-xs text-[#8C7777]">{o.tier_name || "-"}</td>
                                                <td className="py-2.5 pr-3 text-right text-xs">{formatNumber(o.quantity)}</td>
                                                <td className="py-2.5 pr-3 text-right text-xs font-semibold text-[#1E1E1E]">
                                                    {formatRupiah(o.total)}
                                                </td>
                                                <td className="py-2.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getOrderStatusStyle(o.status)}`}>
                                                        {(o.status || "-").toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}