// app/superadmin/dashboard/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
    ArrowRight,
    Building2,
    Download,
    Eye,
    Flag,
    Gauge,
    Loader2,
    Receipt,
    Settings,
    Shield,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    UserCog,
    Users,
} from "lucide-react";

import { getProfile } from "@/services/userService";
import { getSuperadminDashboard } from "@/services/dashboardService";

const POLL_INTERVAL_MS = 60000;

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
    const n = Number(value);
    if (value === null || value === undefined || Number.isNaN(n)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(n);
}

function formatCompactRupiah(value) {
    const n = Number(value) || 0;
    if (n >= 1_000_000_000_000) return `Rp ${(n / 1_000_000_000_000).toFixed(2)}T`;
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)}M`;
    if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}Jt`;
    if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return formatRupiah(n);
}

function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function formatDateTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm}`;
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

function getCountdownLabel(dateStr) {
    const remaining = daysFromNow(dateStr);
    if (remaining === null) return { text: "-", soon: false };
    if (remaining < 0) return { text: "Sudah lewat", soon: false };
    if (remaining === 0) return { text: "Hari ini", soon: true };
    return { text: `H-${remaining}`, soon: remaining <= 7 };
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
    const area = points.length ? `${line} L ${lastX},${bottom} L ${leftPad},${bottom} Z` : "";

    return { line, area, points };
}

function getOrganizerStatusStyle(status) {
    switch ((status || "").toLowerCase()) {
        case "active":
            return { label: "AKTIF", classes: "bg-[#E4F3EA] text-[#1E7A4C]" };
        case "suspended":
            return { label: "NONAKTIF", classes: "bg-[#F3E4E4] text-[#B3261E]" };
        default:
            return { label: (status || "-").toUpperCase(), classes: "bg-[#F0EDED] text-[#8C7777]" };
    }
}

function periodLabel(period) {
    return period === "30d" ? "30 Hari Terakhir" : "Bulan Ini";
}

function Skeleton({ className }) {
    return <div className={`animate-pulse rounded-2xl bg-white/60 ${className}`} />;
}

function EmptyState({ children }) {
    return (
        <div className="rounded-xl bg-[#F8F1E7] p-6 text-center text-sm text-[#8C7777]">{children}</div>
    );
}

export default function SuperadminDashboardPage() {
    const router = useRouter();

    const [period, setPeriod] = useState("month");
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);

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

                const [profileRes, statsRes] = await Promise.all([
                    getProfile(),
                    getSuperadminDashboard({ period }),
                ]);

                if (cancelled) return;

                const role = (profileRes?.role || "").toLowerCase();
                if (role !== "superadmin") {
                    router.replace("/admin/dashboard");
                    return;
                }

                setProfile(profileRes);
                setStats(statsRes);
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat dashboard superadmin");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();
        return () => { cancelled = true; };
    }, [router, period]);

    useEffect(() => {
        const id = setInterval(async () => {
            if (document.hidden) return;
            try {
                const statsRes = await getSuperadminDashboard({ period });
                setStats(statsRes);
            } catch {
                // silent
            }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [period]);

    // ---------- Derived data ----------
    const topOrganizers = stats?.top_organizers || [];
    const pendingEvents = stats?.pending_events || [];
    const auditLogs = stats?.audit_logs || [];
    const categoryBreakdown = stats?.category_breakdown || [];
    const healthItems = stats?.health?.items || [];
    const trend = stats?.platform_trend || [];
    const recentTransactions = stats?.recent_transactions || [];

    // ---------- KPI Sederhana ----------
    const kpiCards = useMemo(() => {
        if (!stats) return [];

        const gmvGrowth = Number(stats.total_sales_growth_percent) || 0;
        const versus = period === "30d" ? "vs 30 hari sebelumnya" : "vs bulan sebelumnya";

        return [
            {
                label: "Total Transaksi (GMV)",
                value: formatCompactRupiah(stats.total_sales),
                icon: Receipt,
                trend: `${gmvGrowth > 0 ? "+" : ""}${gmvGrowth}%`,
                trendDown: gmvGrowth < 0,
                note: versus,
                accent: "border-t-4 border-t-[#5B0F18]",
            },
            {
                label: "Pendapatan Platform",
                value: formatCompactRupiah(stats.service_fee_collected),
                icon: Receipt,
                note: `Biaya layanan ${Number(stats.service_fee_percent ?? 0)}% dari harga tiket`,
                accent: "border-t-4 border-t-[#B4841F]",
            },
            {
                label: "Tiket Terjual",
                value: formatNumber(stats.tickets_sold),
                icon: Users,
                note: "Total tiket berbayar seluruh platform",
            },
            {
                label: "Organizer & Event",
                value: formatNumber(stats.active_organizers),
                suffix: `/ ${formatNumber(stats.total_organizers)} organizer`,
                icon: Building2,
                badge: `${formatNumber(stats.published_events)} event aktif • ${formatNumber(stats.pending_moderation)} draft`,
                badgeClasses: "bg-[#F0EDED] text-[#8C7777]",
                note: "Organizer aktif dan event published",
            },
        ];
    }, [stats, period]);

    const salesSeries = useMemo(
        () => buildLinePath(trend.map((d) => Number(d.total_sales) || Number(d.gmv) || 0)),
        [trend]
    );
    const userSeries = useMemo(() => buildLinePath(trend.map((d) => Number(d.new_users) || 0)), [trend]);
    const trendLabels = trend.map((d, i) => {
        if (i === trend.length - 1) return "Hari Ini";
        return DAYS_SHORT_ID[new Date(d.date).getDay()];
    });
    const trendIsEmpty =
        trend.length > 0 && trend.every((d) => !d.total_sales && !d.gmv && !d.new_users);

    // ---------- Export PDF ----------
    const handleExportPdf = useCallback(() => {
        if (!stats) return;
        setExporting(true);

        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const maroon = [91, 15, 24];
            const gold = [180, 132, 31];
            const grey = [140, 119, 119];
            const adminName = profile?.username || "-";
            const printedAt = new Date().toLocaleString("id-ID", {
                day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            });

            doc.setFillColor(...maroon);
            doc.rect(0, 0, 210, 32, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("Laporan Platform", 14, 15);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Eventify • Superadmin Console", 14, 22);
            doc.text(`Periode: ${periodLabel(period)}`, 14, 27);

            doc.setTextColor(...grey);
            doc.setFontSize(9);
            doc.text(`Disusun oleh : ${adminName}`, 14, 42);
            doc.text(`Dicetak      : ${printedAt} WIB`, 14, 47);

            autoTable(doc, {
                startY: 54,
                head: [["Metrik", "Nilai"]],
                body: [
                    [`Total Transaksi / GMV (${periodLabel(period)})`, formatRupiah(stats.total_sales)],
                    ["Pendapatan Platform (Biaya Layanan)", formatRupiah(stats.service_fee_collected)],
                    ["Tiket Terjual", formatNumber(stats.tickets_sold)],
                    ["Total Pengguna", formatNumber(stats.total_users)],
                    [
                        "Organizer Aktif",
                        `${formatNumber(stats.active_organizers)} / ${formatNumber(stats.total_organizers)}`,
                    ],
                    ["Event Aktif (Published)", formatNumber(stats.published_events)],
                    ["Event Draft", formatNumber(stats.pending_moderation)],
                    ["Persentase Biaya Layanan", `${Number(stats.service_fee_percent ?? 0)}% dari harga tiket`],
                ],
                theme: "grid",
                headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 100 }, 1: { halign: "right" } },
            });

            let cursorY = (doc.lastAutoTable?.finalY || 54) + 10;

            if (topOrganizers.length > 0) {
                if (cursorY > 230) { doc.addPage(); cursorY = 20; }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Top Organizer", 14, cursorY);

                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Organizer", "Event", "Tiket Terjual", "Total Penjualan"]],
                    body: topOrganizers.map((o) => [
                        o.username || "-",
                        formatNumber(o.event_count),
                        formatNumber(o.tickets_sold),
                        formatRupiah(o.total_sales ?? o.gmv ?? 0),
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: maroon, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" },
                    columnStyles: {
                        0: { cellWidth: 70 },
                        1: { halign: "right" },
                        2: { halign: "right" },
                        3: { halign: "right" },
                    },
                });
                cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
            }

            if (pendingEvents.length > 0) {
                if (cursorY > 230) { doc.addPage(); cursorY = 20; }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(...maroon);
                doc.text("Event Menunggu Moderasi", 14, cursorY);

                autoTable(doc, {
                    startY: cursorY + 3,
                    head: [["Event", "Organizer", "Dibuat"]],
                    body: pendingEvents.map((e) => [
                        e.title || "-",
                        e.organizer_name || "-",
                        formatDateTime(e.submitted_at),
                    ]),
                    theme: "grid",
                    headStyles: { fillColor: gold, textColor: 255, fontStyle: "bold" },
                    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" },
                });
            }

            const pageCount = doc.getNumberOfPages();
            for (let p = 1; p <= pageCount; p += 1) {
                doc.setPage(p);
                doc.setFontSize(8);
                doc.setTextColor(...grey);
                doc.text(
                    `Eventify Superadmin Console • Halaman ${p} dari ${pageCount}`,
                    105, 290, { align: "center" }
                );
            }

            doc.save(`laporan-platform-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            setError(err.message || "Gagal mengekspor laporan PDF");
        } finally {
            setExporting(false);
        }
    }, [stats, profile, period, topOrganizers, pendingEvents]);

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <div className="mx-auto max-w-7xl px-6 py-6">
                {error && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        {error}
                    </div>
                )}

                {/* Hero */}
                <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#3A0810] via-[#5B0F18] to-[#7A1F2B] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Shield className="h-3.5 w-3.5" />
                            {loading && !profile ? "Memuat..." : `${profile?.username || "-"} • Superadmin`}
                        </span>
                        <h1 className="text-2xl font-bold sm:text-3xl">Superadmin Console</h1>
                        <p className="mt-2 max-w-md text-sm text-white/70">
                            Ringkasan platform: transaksi, biaya layanan, pengguna, organizer, dan event.
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
                                    {periodLabel(p)}
                                </button>
                            ))}
                        </div>
                        <Link
                            href="/superadmin/organizers"
                            className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4]"
                        >
                            Kelola Organizer →
                        </Link>
                    </div>
                </div>

                {/* KPI */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {(loading && !stats ? Array.from({ length: 4 }) : kpiCards).map((stat, i) => {
                        if (!stat) return <Skeleton key={i} className="h-32 shadow-sm" />;
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

                                {stat.trend && (
                                    <span
                                        className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            stat.trendDown
                                                ? "bg-[#F3E4E4] text-[#B3261E]"
                                                : "bg-[#E4F3EA] text-[#1E7A4C]"
                                        }`}
                                    >
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

                {/* Chart + Kesehatan */}
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-[#1E1E1E]">Pertumbuhan Platform</h2>
                            <p className="text-xs text-[#8C7777]">
                                Total transaksi &amp; pendaftaran user baru 7 hari terakhir
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pb-3">
                            <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#5B0F18]" /> Total Transaksi
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[#1E1E1E]">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#B4841F]" /> User Baru
                            </span>
                        </div>

                        {loading && !stats ? (
                            <Skeleton className="h-56 w-full" />
                        ) : trend.length === 0 || trendIsEmpty ? (
                            <div className="flex h-56 w-full items-center justify-center rounded-xl bg-[#F8F1E7] text-sm text-[#8C7777]">
                                Belum ada aktivitas dalam 7 hari terakhir.
                            </div>
                        ) : (
                            <div className="h-56 w-full">
                                <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 220">
                                    <defs>
                                        <linearGradient id="salesAreaGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#581825" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#581825" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="userAreaGrad" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#ffc55f" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#ffc55f" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {[20, 70, 120, 170].map((y) => (
                                        <line key={y} stroke="#f0eded" strokeWidth="1" x1="0" x2="700" y1={y} y2={y} />
                                    ))}
                                    <line stroke="#e5e2e1" strokeWidth="1" x1="0" x2="700" y1="210" y2="210" />

                                    <path d={salesSeries.area} fill="url(#salesAreaGrad)" />
                                    <path d={salesSeries.line} fill="none" stroke="#581825" strokeLinecap="round" strokeWidth="3" />

                                    <path d={userSeries.area} fill="url(#userAreaGrad)" />
                                    <path d={userSeries.line} fill="none" stroke="#755100" strokeDasharray="4 3" strokeLinecap="round" strokeWidth="2.5" />

                                    {salesSeries.points.map((p, i) => (
                                        <circle key={`s-${i}`} cx={p.x} cy={p.y} fill="#3c0311" r="4" stroke="#ffffff" strokeWidth="1.5" />
                                    ))}
                                    {userSeries.points.map((p, i) => (
                                        <circle key={`u-${i}`} cx={p.x} cy={p.y} fill="#755100" r="3.5" stroke="#ffffff" strokeWidth="1.5" />
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
                                    Belum ada data kategori tiket.
                                </div>
                            )}
                            {categoryBreakdown.map((cat) => (
                                <div key={cat.category_name} className="rounded-xl bg-[#F8F1E7] p-2.5">
                                    <p className="truncate text-[10px] text-[#8C7777]">{cat.category_name}</p>
                                    <p className="text-lg font-bold text-[#5B0F18]">{cat.percent}%</p>
                                    <p className="text-[10px] text-[#8C7777]">
                                        {formatNumber(cat.sold)} / {formatNumber(cat.quota)} terjual
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Kesehatan Sistem */}
                    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Gauge className="h-5 w-5 text-[#5B0F18]" />
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Kesehatan Sistem</h2>
                            </div>
                            {stats?.health?.status === "operational" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E4F3EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E7A4C]">
                                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#1E7A4C]" />
                                    OPERASIONAL
                                </span>
                            )}
                        </div>
                        <p className="mb-4 text-xs text-[#8C7777]">Diukur langsung dari server dan database.</p>

                        <div className="space-y-2">
                            {loading && !stats
                                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                                : healthItems.map((item) => (
                                      <div key={item.label} className="rounded-xl bg-[#F8F1E7] p-3">
                                          <div className="flex items-center justify-between text-xs">
                                              <span className="font-semibold text-[#1E1E1E]">{item.label}</span>
                                              <span className="font-bold text-[#1E7A4C]">{item.display}</span>
                                          </div>
                                          {item.percent != null && (
                                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                                  <div
                                                      className="h-full rounded-full bg-[#1E7A4C]"
                                                      style={{ width: `${item.percent}%` }}
                                                  />
                                              </div>
                                          )}
                                          {item.note && (
                                              <p className="mt-1 text-[10px] text-[#8C7777]">{item.note}</p>
                                          )}
                                      </div>
                                  ))}
                            {!loading && healthItems.length === 0 && <EmptyState>Data kesehatan sistem belum tersedia.</EmptyState>}
                        </div>

                        <div className="mt-4 flex flex-1 items-end">
                            <Link
                                href="/superadmin/system"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                <Gauge className="h-4 w-4" />
                                Buka System Console
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Transaksi Terbaru (BARU, pengganti Payout Outstanding) */}
                <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-[#5B0F18]" />
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Transaksi Terbaru</h2>
                            </div>
                            <p className="text-xs text-[#8C7777]">
                                Transaksi berhasil dibayar di seluruh platform.
                            </p>
                        </div>
                        <Link
                            href="/superadmin/orders"
                            className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                        >
                            Semua Transaksi
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {(loading && !stats ? Array.from({ length: 5 }) : recentTransactions).map((trx, i) => {
                            if (!trx) return <Skeleton key={i} className="h-16 rounded-xl" />;
                            return (
                                <div key={trx.id} className="flex items-center gap-3 rounded-xl bg-[#F8F1E7] p-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#5B0F18]">
                                        <Receipt className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-[#1E1E1E]">
                                            {trx.invoice_number || `#${trx.id}`}
                                        </p>
                                        <p className="truncate text-[11px] text-[#8C7777]">
                                            {trx.event_title || "-"} • oleh {trx.customer_name || "-"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold text-[#5B0F18]">
                                            {formatRupiah(trx.grand_total)}
                                        </p>
                                        <p className="text-[10px] text-[#8C7777]">
                                            {formatDateTime(trx.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {!loading && recentTransactions.length === 0 && (
                            <EmptyState>Belum ada transaksi.</EmptyState>
                        )}
                    </div>
                </div>

                {/* Event Draft */}
                <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-[#5B0F18]" />
                                <h2 className="text-lg font-bold text-[#1E1E1E]">Event Menunggu Moderasi</h2>
                                <span className="rounded-full bg-[#F0EDED] px-2 py-0.5 text-[10px] font-semibold text-[#8C7777]">
                                    {formatNumber(stats?.pending_moderation)} Draft
                                </span>
                            </div>
                            <p className="text-xs text-[#8C7777]">
                                Event draft yang belum dipublikasikan.
                            </p>
                        </div>
                        <Link
                            href="/superadmin/moderation"
                            className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                        >
                            Kelola Moderasi
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {(loading && !stats ? Array.from({ length: 3 }) : pendingEvents).map((event, i) => {
                            if (!event) return <Skeleton key={i} className="h-20" />;
                            const { month, day } = getMonthDayBadge(event.event_date);
                            const countdown = getCountdownLabel(event.event_date);

                            return (
                                <div
                                    key={event.id}
                                    className="flex flex-col gap-4 rounded-2xl bg-[#F8F1E7] p-4 sm:flex-row sm:items-center"
                                >
                                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-[#5B0F18]">
                                        <span className="text-[10px] font-bold uppercase">{month}</span>
                                        <span className="text-lg font-bold leading-none">{day}</span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                                countdown.soon
                                                    ? "bg-[#FDF3D8] text-[#B4841F]"
                                                    : "bg-[#F0EDED] text-[#8C7777]"
                                            }`}
                                        >
                                            <Flag className="h-3 w-3" />
                                            DRAFT • {countdown.text}
                                        </span>
                                        <h3 className="mt-1 truncate font-bold text-[#1E1E1E]">{event.title}</h3>
                                        <p className="mt-0.5 truncate text-xs text-[#8C7777]">
                                            oleh{" "}
                                            <span className="font-semibold text-[#5B0F18]">
                                                {event.organizer_name || "-"}
                                            </span>{" "}
                                            • dibuat {formatDateTime(event.submitted_at)}
                                        </p>
                                    </div>

                                    <Link
                                        href={`/superadmin/moderation/${event.id}`}
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        Review
                                    </Link>
                                </div>
                            );
                        })}

                        {!loading && pendingEvents.length === 0 && (
                            <EmptyState>Tidak ada event draft yang menunggu.</EmptyState>
                        )}
                    </div>
                </div>

                {/* Top Organizer + Audit Log */}
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-[#5B0F18]" />
                                    <h2 className="text-lg font-bold text-[#1E1E1E]">Top Organizer</h2>
                                </div>
                                <p className="text-xs text-[#8C7777]">
                                    Berdasarkan total penjualan — {periodLabel(period).toLowerCase()}.
                                </p>
                            </div>
                            <Link
                                href="/superadmin/admin"
                                className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                            >
                                Semua
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {(loading && !stats ? Array.from({ length: 4 }) : topOrganizers).map((o, i) => {
                                if (!o) return <Skeleton key={i} className="h-16 rounded-xl" />;
                                const orgStatus = getOrganizerStatusStyle(o.status);
                                return (
                                    <div key={o.id} className="flex items-center gap-3 rounded-xl bg-[#F8F1E7] p-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#5B0F18]">
                                            {String(i + 1).padStart(2, "0")}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-sm font-bold text-[#1E1E1E]">
                                                    {o.username || "-"}
                                                </p>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${orgStatus.classes}`}
                                                >
                                                    {orgStatus.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#8C7777]">
                                                {formatNumber(o.event_count)} event • {formatNumber(o.tickets_sold)} tiket terjual
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-sm font-bold text-[#5B0F18]">
                                            {formatCompactRupiah(o.total_sales ?? o.gmv ?? 0)}
                                        </p>
                                    </div>
                                );
                            })}

                            {!loading && topOrganizers.length === 0 && <EmptyState>Belum ada data organizer.</EmptyState>}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-[#5B0F18]" />
                                    <h2 className="text-lg font-bold text-[#1E1E1E]">Audit Log Terbaru</h2>
                                </div>
                                <p className="text-xs text-[#8C7777]">Aktivitas administratif yang tercatat.</p>
                            </div>
                            <Link
                                href="/superadmin/audit"
                                className="flex items-center gap-1 text-sm font-semibold text-[#7A1F2B] hover:underline"
                            >
                                Semua
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        <div className="space-y-2">
                            {(loading && !stats ? Array.from({ length: 5 }) : auditLogs).map((log, i) => {
                                if (!log) return <Skeleton key={i} className="h-14 rounded-xl" />;
                                return (
                                    <div key={log.id} className="flex items-start gap-3 rounded-xl bg-[#F8F1E7] p-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#5B0F18]">
                                            <UserCog className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-[#1E1E1E]">
                                                {log.action || "-"}
                                            </p>
                                            <p className="truncate text-[11px] text-[#8C7777]">
                                                {log.actor || "-"} • {log.target || "-"}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-[10px] text-[#8C7777]">
                                            {formatDateTime(log.created_at)}
                                        </span>
                                    </div>
                                );
                            })}

                            {!loading && auditLogs.length === 0 && <EmptyState>Belum ada aktivitas tercatat.</EmptyState>}
                        </div>
                    </div>
                </div>

                {/* Aksi Cepat */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-[#1E1E1E]">Kelola Organizer</p>
                                <p className="mt-1 text-xs text-[#8C7777]">
                                    Daftar organizer, status aktif, dan performa penjualannya.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#B4841F]">
                                {formatNumber(stats?.active_organizers)} aktif dari {formatNumber(stats?.total_organizers)}
                            </span>
                            <Link
                                href="/superadmin/admin"
                                className="rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                Buka
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                <Settings className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-[#1E1E1E]">Biaya Layanan</p>
                                <p className="mt-1 text-xs text-[#8C7777]">
                                    Persentase biaya layanan dari harga tiket untuk seluruh order baru.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#B4841F]">
                                {Number(stats?.service_fee_percent ?? 0)}% dari harga tiket
                            </span>
                            <Link
                                href="/superadmin/settings"
                                className="rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                Atur
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                <Download className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-[#1E1E1E]">Laporan Platform</p>
                                <p className="mt-1 text-xs text-[#8C7777]">
                                    Unduh rekap transaksi, biaya layanan, dan top organizer.
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
                                        Ekspor
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}