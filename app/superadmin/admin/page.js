// app/superadmin/organizers/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Calendar,
    Plus,
    Receipt,
    Search,
    Ticket,
    UserCog,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { getOrganizerList } from "@/services/dashboardService";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";

const PERIODS = [
    { value: "month", label: "Bulan Ini" },
    { value: "30d", label: "30 Hari Terakhir" },
];

const STATUS_FILTERS = [
    { value: "all", label: "Semua" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
];

const SORT_OPTIONS = [
    { value: "gross_sales", label: "Penjualan tertinggi" },
    { value: "tickets_sold", label: "Tiket terjual terbanyak" },
    { value: "total_events", label: "Event terbanyak" },
    { value: "created_at", label: "Terbaru bergabung" },
    { value: "username", label: "Nama (A-Z)" },
];

function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value) || 0);
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

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function SummaryCard({ label, value, note, icon: Icon, accent }) {
    return (
        <div className={`rounded-2xl bg-white p-5 shadow-sm ${accent || ""}`}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8C7777]">{label}</p>
                <Icon className="h-4 w-4 text-[#8C7777]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1E1E1E]">{value}</p>
            <p className="mt-1 text-xs text-[#8C7777]">{note}</p>
        </div>
    );
}

export default function OrganizersPage() {
    const [period, setPeriod] = useState("month");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("gross_sales");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                const res = await getOrganizerList({ period });
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled) toast.error(err.message || "Gagal memuat organizer");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [period]);

    const organizers = data?.organizers || [];
    const summary = data?.summary;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();

        return organizers
            .filter((o) => {
                if (statusFilter === "active" && !o.is_active) return false;
                if (statusFilter === "inactive" && o.is_active) return false;
                if (!q) return true;
                return (
                    o.username?.toLowerCase().includes(q) ||
                    o.email?.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                if (sortBy === "username") return a.username.localeCompare(b.username);
                if (sortBy === "created_at") return new Date(b.created_at) - new Date(a.created_at);
                return (b[sortBy] || 0) - (a[sortBy] || 0);
            });
    }, [organizers, query, statusFilter, sortBy]);

    const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-[#1E1E1E]">
                        <Building2 className="h-5 w-5 text-[#7A1F2B]" />
                        Organizer
                    </h1>
                    <p className="mt-1 text-sm text-[#8C7777]">
                        Pantau performa penjualan setiap organizer. Angka penjualan untuk {periodLabel}.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                                    period === p.value
                                        ? "bg-[#5B0F18] text-white"
                                        : "text-[#8C7777] hover:text-[#5B0F18]"
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <Link
                        href="/superadmin/users/create"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#5B0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah Admin
                    </Link>
                </div>
            </div>

            {/* Ringkasan */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryCard
                    label="Organizer"
                    value={formatNumber(summary?.total_organizers)}
                    note={`${formatNumber(summary?.active_organizers)} aktif`}
                    icon={Building2}
                    accent="border-t-4 border-t-[#5B0F18]"
                />
                <SummaryCard
                    label="Total Event"
                    value={formatNumber(summary?.total_events)}
                    note="Semua event organizer"
                    icon={Calendar}
                />
                <SummaryCard
                    label="Penjualan"
                    value={formatCompactRupiah(summary?.gross_sales)}
                    note={`Dibayar pembeli, ${periodLabel}`}
                    icon={Receipt}
                    accent="border-t-4 border-t-[#B4841F]"
                />
                <SummaryCard
                    label="Tiket Terjual"
                    value={formatNumber(summary?.tickets_sold)}
                    note={`Pendapatan platform ${formatCompactRupiah(summary?.service_fee)}`}
                    icon={Ticket}
                />
            </div>

            {/* Filter */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full items-center gap-2 rounded-full border border-[#E5D6D0] bg-white px-4 py-2 text-sm text-[#8C7777] lg:max-w-sm">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari nama atau email organizer..."
                        className="w-full bg-transparent text-[#1E1E1E] outline-none placeholder:text-[#8C7777]"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            onClick={() => setStatusFilter(f.value)}
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                statusFilter === f.value
                                    ? "bg-[#5B0F18] text-white"
                                    : "bg-white text-[#1E1E1E] hover:bg-[#F3E9DD]"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-full border border-[#E5D6D0] bg-white px-4 py-2 text-xs font-semibold text-[#1E1E1E] outline-none"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabel */}
            {loading && !data ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner text="Memuat organizer..." />
                </div>
            ) : organizers.length === 0 ? (
                <EmptyState
                    title="Belum ada organizer"
                    description="Tambahkan akun admin untuk mulai mengelola organizer."
                />
            ) : visible.length === 0 ? (
                <EmptyState
                    title="Tidak ada hasil"
                    description="Tidak ada organizer yang cocok dengan pencarian atau filter."
                />
            ) : (
                <div
                    className={`overflow-hidden rounded-2xl border border-[#E5D6D0] bg-white transition-opacity ${
                        loading ? "opacity-60" : ""
                    }`}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#F8F1E7] text-xs uppercase tracking-wide text-[#8C7777]">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Organizer</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 text-right font-semibold">Event</th>
                                    <th className="px-5 py-3 text-right font-semibold">Tiket Terjual</th>
                                    <th className="px-5 py-3 text-right font-semibold">Penjualan</th>
                                    <th className="px-5 py-3 text-right font-semibold">Biaya Layanan</th>
                                    <th className="px-5 py-3 text-right font-semibold">Bergabung</th>
                                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5D6D0]">
                                {visible.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F1E7] text-sm font-bold uppercase text-[#5B0F18]">
                                                    {o.username?.[0] || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-1.5 font-medium text-[#1E1E1E]">
                                                        <span className="truncate">{o.username}</span>
                                                        {o.status === "online" && (
                                                            <span
                                                                title="Sedang online"
                                                                className="h-2 w-2 shrink-0 rounded-full bg-[#1E7A4C]"
                                                            />
                                                        )}
                                                    </p>
                                                    <p className="truncate text-xs text-[#8C7777]">{o.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    o.is_active
                                                        ? "bg-[#E4F3EA] text-[#1E7A4C]"
                                                        : "bg-[#F3E4E4] text-[#B3261E]"
                                                }`}
                                            >
                                                {o.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <p className="font-semibold text-[#1E1E1E]">
                                                {formatNumber(o.total_events)}
                                            </p>
                                            <p className="text-xs text-[#8C7777]">
                                                {formatNumber(o.published_events)} aktif •{" "}
                                                {formatNumber(o.draft_events)} draft
                                            </p>
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold text-[#1E1E1E]">
                                            {formatNumber(o.tickets_sold)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold text-[#5B0F18]">
                                            {formatCompactRupiah(o.gross_sales)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-[#8C7777]">
                                            {formatCompactRupiah(o.service_fee)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-xs text-[#8C7777]">
                                            {formatDate(o.created_at)}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <Link
                                                href="/superadmin/users"
                                                title="Kelola akun di halaman Users"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7777] transition hover:bg-[#F8F1E7] hover:text-[#5B0F18]"
                                            >
                                                <UserCog className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
