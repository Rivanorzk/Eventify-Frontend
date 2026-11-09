// app/admin/dashboard/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    ArrowRight,
    Calendar,
    CheckCircle2,
    Download,
    ExternalLink,
    Loader2,
    QrCode,
    Search,
    Sparkles,
    Ticket,
    TrendingDown,
    TrendingUp,
    Wallet,
} from "lucide-react";

import { getProfile } from "@/services/userService";
import { getAdminDashboard } from "@/services/dashboardService";
import { getUnreadCount } from "@/services/notificationService";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT_ID = [
    "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
    "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
];
const DAYS_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// ---------- Formatter ----------
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
    const time = timeStr ? String(timeStr).slice(0, 5) : null;
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}${
        time ? ` • ${time} WIB` : ""
    }`;
}

function getMonthDayBadge(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return { month: "-", day: "-" };
    return { month: MONTHS_SHORT_ID[d.getMonth()], day: String(d.getDate()).padStart(2, "0") };
}

function daysFromNow(dateStr) {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs = target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
}

function getStatusStyle(status) {
    switch ((status || "").toLowerCase()) {
        case "live":
            return { label: "LIVE EVENT", classes: "bg-[#5B0F18] text-white", dot: "bg-[#F3D9A4] animate-ping" };
        case "sold out":
            return { label: "SOLD OUT", classes: "bg-[#F3E4E4] text-[#B3261E]", dot: null };
        case "draft":
            return { label: "DRAFT", classes: "bg-[#F0EDED] text-[#8C7777]", dot: null };
        case "published":
            return { label: "PUBLISHED", classes: "bg-[#E4F3EA] text-[#1E7A4C]", dot: null };
        default:
            return { label: (status || "UNKNOWN").toUpperCase(), classes: "bg-[#F0EDED] text-[#8C7777]", dot: null };
    }
}

function buildLinePath(values, { width = 700, top = 20, bottom = 210, leftPad = 30, rightPad = 30 } = {}) {
    const max = Math.max(1, ...values);
    const usableWidth = width - leftPad - rightPad;
    const step = values.length > 1 ? usableWidth / (values.length - 1) : 0;

    const points = values.map((v, i) => ({
        x: leftPad + step * i,
        y: bottom - (v / max) * (bottom - top),
    }));

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const lastX = points.length ? points[points.length - 1].x.toFixed(1) : leftPad;
    const area = `${line} L ${lastX},${bottom} L ${leftPad},${bottom} Z`;
    return { line, area, points };
}

export default function AdminDashboardPage() {
    const router = useRouter();

    const [period, setPeriod] = useState("month");
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [gates, setGates] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exporting, setExporting] = useState(false);

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

                const [profileRes, statsRes, unreadRes] = await Promise.all([
                    getProfile(),
                    getAdminDashboard({ period }),
                    getUnreadCount(),
                ]);

                if (cancelled) return;

                setProfile(profileRes);
                setStats(statsRes);
                setEvents(statsRes?.events || []);
                setGates(statsRes?.gates || []);
                setUnreadCount(unreadRes || 0);
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat dashboard");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, period]);

    // Polling ringan tiap 30 detik
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const [unreadRes, statsRes] = await Promise.all([
                    getUnreadCount(),
                    getAdminDashboard({ period }),
                ]);
                setUnreadCount(unreadRes || 0);
                setStats(statsRes);
                setEvents(statsRes?.events || []);
                setGates(statsRes?.gates || []);
            } catch {
                // silent fail
            }
        }, 30000);
        return () => clearInterval(id);
    }, [period]);

    // ---------- KPI sederhana ----------
    const kpiCards = useMemo(() => {
        if (!stats) return [];

        const growth = stats.total_sales_growth_percent ?? 0;
        // total_sales   = total yang dibayar pembeli (harga tiket + biaya layanan)
        // net_revenue   = hak organizer (harga tiket setelah diskon)
        const totalSales = Number(stats.total_sales ?? 0);
        const serviceFee = Number(stats.service_fee_collected ?? 0);
        const netRevenue = Number(stats.net_revenue ?? 0);

        const ticketsSold = Number(stats.tickets_sold ?? 0);
        const ticketsQuota = Number(stats.tickets_quota ?? 0);
        const soldPercent = ticketsQuota > 0 ? Math.round((ticketsSold / ticketsQuota) * 100) : 0;

        const checkedIn = Number(stats.checked_in ?? 0);
        const checkInPercent = ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0;

        return [
            {
                label: "Total Penjualan",
                value: formatCompactRupiah(totalSales),
                icon: Wallet,
                trend: `${growth > 0 ? "+" : ""}${growth}%`,
                trendDown: growth < 0,
                note: `${period === "30d" ? "vs 30 hari sebelumnya" : "vs bulan sebelumnya"} (${formatCompactRupiah(stats.previous_total_sales)})`,
                accent: "border-t-4 border-t-[#5B0F18]",
            },
            {
                label: "Pendapatan Bersih",
                value: formatCompactRupiah(netRevenue),
                icon: Wallet,
                note: `Total penjualan dikurangi biaya layanan ${formatCompactRupiah(serviceFee)}`,
                accent: "border-t-4 border-t-[#B4841F]",
            },
            {
                label: "Tiket Terjual",
                value: formatNumber(ticketsSold),
                suffix: `/ ${formatNumber(ticketsQuota)}`,
                icon: CheckCircle2,
                percent: soldPercent,
                note: `${formatNumber(Math.max(0, ticketsQuota - ticketsSold))} pax tersisa`,
            },
            {
                label: "Tiket Check-in",
                value: formatNumber(checkedIn),
                suffix: `/ ${formatNumber(ticketsSold)}`,
                icon: QrCode,
                note: `${checkInPercent}% pembeli sudah hadir`,
            },
        ];
    }, [stats, period]);

    const activeEvents = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        return (events || [])
            .filter((e) => e.status === "published" || e.event_date?.slice(0, 10) >= todayStr)
            .slice(0, 5);
    }, [events]);

    const trend = stats?.sales_trend || [];
    const ticketSeries = useMemo(() => buildLinePath(trend.map((d) => d.tickets_sold)), [trend]);
    const revenueSeries = useMemo(() => buildLinePath(trend.map((d) => d.revenue)), [trend]);
    const trendLabels = trend.map((d, i) => {
        if (i === trend.length - 1) return "Hari Ini";
        return DAYS_SHORT_ID[new Date(d.date).getDay()];
    });

    const categoryBreakdown = stats?.category_breakdown || [];

    const gateSummary = useMemo(() => {
        const totalQuota = gates.reduce((acc, g) => acc + (g.quota || 0), 0);
        const totalCheckedIn = gates.reduce((acc, g) => acc + (g.checked_in || 0), 0);
        const percent = totalQuota ? Math.round((totalCheckedIn / totalQuota) * 100) : 0;
        return { totalQuota, totalCheckedIn, percent, gateCount: gates.length };
    }, [gates]);

    // ---------- Export PDF ----------
    const handleExportPdf = useCallback(() => {
        if (!stats) return;
        setExporting(true);

        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const maroon = [91, 15, 24];
            const gold = [180, 132, 31];
            const grey = [140, 119, 119];
            const organizerName = profile?.company_name || profile?.username || "Organizer";
            const periodLabel = period === "30d" ? "30 Hari Terakhir" : "Bulan Ini";
            const printedAt = new Date().toLocaleString("id-ID", {
                day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            });

            const totalSales = Number(stats.total_sales ?? 0);
            const serviceFee = Number(stats.service_fee_collected ?? 0);
            const eventRevenue = Number(stats.net_revenue ?? 0);

            doc.setFillColor(...maroon);
            doc.rect(0, 0, 210, 32, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Laporan Penjualan Event", 14, 15);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Eventify • Organizer Console", 14, 22);
            doc.text(`Periode: ${periodLabel}`, 14, 27);

            doc.setTextColor(...grey);
            doc.setFontSize(9);
            doc.text(`Organizer : ${organizerName}`, 14, 42);
            doc.text(`Dicetak   : ${printedAt} WIB`, 14, 47);

            autoTable(doc, {
                startY: 54,
                head: [["Metrik", "Nilai"]],
                body: [
                    ["Total Penjualan", formatRupiah(totalSales)],
                    ["Biaya Layanan", formatRupiah(serviceFee)],
                    ["Pendapatan Bersih", formatRupiah(eventRevenue)],
                    [
                        "Tiket Terjual",
                        `${formatNumber(stats.tickets_sold ?? 0)} / ${formatNumber(stats.tickets_quota ?? 0)}`,
                    ],
                    ["Gate Check-in", `${formatNumber(stats.checked_in ?? 0)} Tiket`],
                ],
                theme: "grid",
                headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 90 }, 1: { halign: "right" } },
            });

            let cursorY = (doc.lastAutoTable?.finalY || 54) + 10;

            if (activeEvents.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Event Aktif", 14, cursorY);

                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Event", "Tanggal", "Terjual", "Kuota", "Omzet"]],
                    body: activeEvents.map((e) => [
                        e.title || "-",
                        formatEventDate(e.event_date, e.start_time),
                        formatNumber(e.tickets_sold ?? 0),
                        formatNumber(e.quota ?? 0),
                        formatRupiah(e.gross_revenue ?? 0),
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        2: { halign: "right" },
                        3: { halign: "right" },
                        4: { halign: "right" },
                    },
                });
                cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
            }

            if (categoryBreakdown.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Breakdown Kategori Tiket", 14, cursorY);

                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Kategori", "Terjual", "Persentase"]],
                    body: categoryBreakdown.map((c) => [
                        c.category_name || "-",
                        formatNumber(c.sold ?? 0),
                        `${c.percent ?? 0}%`,
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: gold, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 9, cellPadding: 2.5 },
                    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
                });
            }

            const pageCount = doc.getNumberOfPages();
            for (let p = 1; p <= pageCount; p += 1) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(...grey);
                doc.text(
                    `Eventify Organizer Console • Halaman ${p} dari ${pageCount}`,
                    105, 290, { align: "center" }
                );
            }

            doc.save(`laporan-penjualan-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            setError(err.message || "Gagal mengekspor laporan PDF");
        } finally {
            setExporting(false);
        }
    }, [stats, profile, period, activeEvents, categoryBreakdown]);

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <div className="mx-auto max-w-7xl px-6 py-6">

                {error && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        {error}
                    </div>
                )}

                {/* Hero */}
                <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#5B0F18] to-[#3A0810] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {profile?.company_name || profile?.username || "Organizer"}
                            {unreadCount > 0 && (
                                <span className="ml-1 rounded-full bg-[#F3D9A4] px-1.5 text-[10px] font-bold text-[#5B0F18]">
                                    {unreadCount}
                                </span>
                            )}
                        </span>
                        <h1 className="text-2xl font-bold sm:text-3xl">Organizer Console</h1>
                        <p className="mt-2 max-w-md text-sm text-white/70">
                            Pantau penjualan tiket, biaya layanan, dan performa event Anda.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <div className="inline-flex rounded-full bg-white/10 p-1">
                            {["month", "30d"].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                                        period === p ? "bg-white text-[#5B0F18]" : "text-white/80 hover:text-white"
                                    }`}
                                >
                                    {p === "30d" ? "30 Hari Terakhir" : "Bulan Ini"}
                                </button>
                            ))}
                        </div>
                        <Link
                            href="/admin/events/create"
                            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4]"
                        >
                            + Buat Event Baru
                        </Link>
                    </div>
                </div>

                {/* KPI */}
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
                                        <span className="text-xs font-bold text-[#5B0F18]">
                                            {stat.percent}% Terjual
                                        </span>
                                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                            <div
                                                className="h-full rounded-full bg-[#F3D9A4]"
                                                style={{ width: `${stat.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {stat.trend && (
                                    <span
                                        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            stat.trendDown
                                                ? "bg-[#F3E4E4] text-[#B3261E]"
                                                : "bg-[#E4F3EA] text-[#1E7A4C]"
                                        }`}
                                    >
                                        {stat.trendDown ? (
                                            <TrendingDown className="h-3 w-3" />
                                        ) : (
                                            <TrendingUp className="h-3 w-3" />
                                        )}
                                        {stat.trend}
                                    </span>
                                )}

                                <p className="mt-2 text-xs text-[#8C7777]">{stat.note}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Chart + Gate */}
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-[#1E1E1E]">Kecepatan Penjualan</h2>
                            <p className="text-xs text-[#8C7777]">Tiket terjual &amp; omzet 7 hari terakhir</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pb-3">
                            <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#5B0F18]" /> Tiket Terjual
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#B4841F]" /> Omzet
                            </span>
                        </div>

                        {!loading && trend.length > 0 && trend.every((d) => d.tickets_sold === 0 && d.revenue === 0) ? (
                            <div className="flex h-56 w-full items-center justify-center rounded-xl bg-[#F8F1E7] text-sm text-[#8C7777]">
                                Belum ada penjualan dalam 7 hari terakhir.
                            </div>
                        ) : (
                            <div className="h-56 w-full">
                                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 220">
                                    <defs>
                                        <linearGradient id="primaryAreaGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#581825" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#581825" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="amberAreaGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#ffc55f" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#ffc55f" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {[20, 70, 120, 170].map((y) => (
                                        <line key={y} stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1={y} y2={y} />
                                    ))}
                                    <line stroke="#e5e2e1" strokeWidth="1" x1="0" x2="700" y1="210" y2="210" />

                                    <path d={ticketSeries.area} fill="url(#primaryAreaGrad)" />
                                    <path d={ticketSeries.line} fill="none" stroke="#581825" strokeLinecap="round" strokeWidth="3" />

                                    <path d={revenueSeries.area} fill="url(#amberAreaGrad)" />
                                    <path d={revenueSeries.line} fill="none" stroke="#755100" strokeDasharray="4 3" strokeLinecap="round" strokeWidth="2.5" />

                                    {ticketSeries.points.map((p, i) => (
                                        <circle key={`t-${i}`} cx={p.x} cy={p.y} fill="#3c0311" r="4" stroke="#ffffff" strokeWidth="1.5" />
                                    ))}
                                    {revenueSeries.points.map((p, i) => (
                                        <circle key={`r-${i}`} cx={p.x} cy={p.y} fill="#755100" r="3.5" stroke="#ffffff" strokeWidth="1.5" />
                                    ))}
                                </svg>
                            </div>
                        )}

                        <div className="flex justify-between px-3 pt-2 text-[10px] uppercase text-[#8C7777]">
                            {trendLabels.map((label, i) => (
                                <span key={i}>{label}</span>
                            ))}
                        </div>

                        <div
                            className="mt-4 grid gap-2"
                            style={{
                                gridTemplateColumns: `repeat(${Math.min(5, Math.max(1, categoryBreakdown.length))}, minmax(0, 1fr))`,
                            }}
                        >
                            {!loading && categoryBreakdown.length === 0 && (
                                <div className="col-span-full rounded-xl bg-[#F8F1E7] p-3 text-center text-xs text-[#8C7777]">
                                    Belum ada kategori tiket.
                                </div>
                            )}
                            {categoryBreakdown.slice(0, 5).map((tier) => (
                                <div key={tier.category_name} className="rounded-xl bg-[#F8F1E7] p-2.5">
                                    <p className="truncate text-[10px] text-[#8C7777]">{tier.category_name}</p>
                                    <p className="text-lg font-bold text-[#5B0F18]">{tier.percent}%</p>
                                    <p className="text-[10px] text-[#8C7777]">{formatNumber(tier.sold)} Terjual</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gate Scanner */}
                    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <QrCode className="h-5 w-5 text-[#5B0F18]" />
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Gate Scanner</h2>
                            </div>
                            {!loading && gates.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3D9A4] px-2 py-0.5 text-[10px] font-semibold text-[#5B0F18]">
                                    <span className="h-2 w-2 rounded-full bg-[#B4841F]" />
                                    {gateSummary.gateCount} Gate
                                </span>
                            )}
                        </div>
                        <p className="mb-4 text-xs text-[#8C7777]">
                            Validasi &amp; monitoring check-in pengunjung di lokasi.
                        </p>

                        <div className="rounded-xl bg-[#F8F1E7] p-4">
                            {loading ? (
                                <div className="h-20 animate-pulse rounded-lg bg-white/60" />
                            ) : gates.length === 0 ? (
                                <div className="text-center text-xs text-[#8C7777]">
                                    Belum ada gate terdaftar.
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8C7777]">
                                                Total Check-in
                                            </p>
                                            <p className="mt-1 text-2xl font-bold text-[#5B0F18]">
                                                {formatNumber(gateSummary.totalCheckedIn)}
                                                <span className="ml-1 text-xs font-normal text-[#8C7777]">
                                                    / {formatNumber(gateSummary.totalQuota)}
                                                </span>
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#B4841F]">
                                            {gateSummary.percent}%
                                        </span>
                                    </div>
                                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                        <div
                                            className="h-full rounded-full bg-[#5B0F18]"
                                            style={{ width: `${gateSummary.percent}%` }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex flex-1 items-end">
                            <Link
                                href="/admin/gate-scanner"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Buka Gate Scanner
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Event Aktif */}
                <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Event Aktif</h2>
                                <span className="rounded-full bg-[#F0EDED] px-2 py-0.5 text-[10px] font-semibold text-[#8C7777]">
                                    {activeEvents.length} Produksi
                                </span>
                            </div>
                            <p className="text-xs text-[#8C7777]">
                                Konser yang sedang berjalan, status kuota, dan omzet.
                            </p>
                        </div>
                        <Link href="/admin/events" className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline">
                            Kelola Semua
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {(loading ? Array.from({ length: 3 }) : activeEvents).map((event, i) => {
                            if (!event) {
                                return <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/60" />;
                            }
                            const soldPercent = event.quota ? Math.round((event.tickets_sold / event.quota) * 100) : 0;
                            const status = getStatusStyle(
                                event.status === "published" && event.event_date
                                    ? daysFromNow(event.event_date) === 0
                                        ? "live"
                                        : soldPercent >= 100 ? "sold out" : "published"
                                    : event.status
                            );
                            const { month, day } = getMonthDayBadge(event.event_date);

                            return (
                                <div key={event.id} className="flex flex-col gap-4 rounded-2xl bg-[#F8F1E7] p-4 sm:flex-row sm:items-center">
                                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-[#5B0F18]">
                                        <span className="text-[10px] font-bold uppercase">{month}</span>
                                        <span className="text-lg font-bold leading-none">{day}</span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${status.classes}`}>
                                            {status.dot && <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />}
                                            {status.label}
                                        </span>
                                        <h3 className="mt-1 truncate font-bold text-[#1E1E1E]">{event.title}</h3>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8C7777]">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formatEventDate(event.event_date, event.start_time)} • {event.location}
                                        </p>

                                        <div className="mt-2 w-full max-w-xs">
                                            <div className="flex justify-between text-[11px] font-semibold text-[#8C7777]">
                                                <span className="font-bold text-[#5B0F18]">
                                                    {formatNumber(event.tickets_sold)} / {formatNumber(event.quota)}
                                                </span>
                                                <span>{soldPercent}%</span>
                                            </div>
                                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                                <div className="h-full rounded-full bg-[#F3D9A4]" style={{ width: `${soldPercent}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                        <div className="text-left sm:text-right">
                                            <p className="text-sm font-bold text-[#1E1E1E]">{formatRupiah(event.gross_revenue ?? 0)}</p>
                                            <p className="text-[11px] text-[#8C7777]">Total Penjualan</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/admin/events/${event.id}/tickets`}
                                                className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                                            >
                                                Kelola Tiket
                                            </Link>
                                            <Link
                                                href={`/admin/events/${event.id}/analytics`}
                                                className="rounded-xl bg-[#5B0F18] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                                            >
                                                Analitik
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {!loading && activeEvents.length === 0 && (
                            <div className="rounded-2xl bg-[#F8F1E7] p-6 text-center text-sm text-[#8C7777]">
                                Belum ada event aktif.
                            </div>
                        )}
                    </div>
                </div>

                {/* Aksi Cepat */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                <Download className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-[#1E1E1E]">Laporan Penjualan</p>
                                <p className="mt-1 text-xs text-[#8C7777]">
                                    Unduh rekap penjualan, biaya layanan, dan pendapatan event dalam PDF.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-[#8C7777]">Format PDF</span>
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={exporting || loading || !stats}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F8F1E7] px-4 py-2 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD] disabled:cursor-not-allowed disabled:opacity-60"
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

                    <div className="relative overflow-hidden rounded-2xl bg-[#5B0F18] p-6 text-white shadow-sm">
                        <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[#7A1F2B]/40" />
                        <div className="relative flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3D9A4] text-[#5B0F18]">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold">Pendapatan Bersih</p>
                                <p className="mt-1 text-2xl font-bold">
                                    {loading && !stats ? "—" : formatCompactRupiah(stats?.net_revenue)}
                                </p>
                            </div>
                        </div>
                        <div className="relative mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-white/10 p-2.5">
                                <p className="text-white/70">Total Penjualan</p>
                                <p className="text-base font-bold">{formatCompactRupiah(stats?.total_sales)}</p>
                            </div>
                            <div className="rounded-xl bg-white/10 p-2.5">
                                <p className="text-white/70">Biaya Layanan</p>
                                <p className="text-base font-bold">{formatCompactRupiah(stats?.service_fee_collected)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}