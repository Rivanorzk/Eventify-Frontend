// app/admin/events/[id]/tickets/page.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Calendar,
    Check,
    CheckCircle2,
    Edit3,
    Loader2,
    MapPin,
    Plus,
    Search,
    Sparkles,
    Ticket,
    Trash2,
    X,
    XCircle,
} from "lucide-react";

import { getEventById } from "@/services/eventService";
import {
    createTicketCategory,
    updateTicketCategory,
    deleteTicketCategory,
} from "@/services/ticketService";

import { getEventTicketCategories } from "@/services/eventTicketCategoryService";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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

const EMPTY_FORM = {
    name: "",
    price: "",
    quota: "",
    description: "",
    is_active: true,
};

export default function EventTicketsPage() {
    const router = useRouter();
    const { id } = useParams();

    const [event, setEvent] = useState(null);
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [showCreate, setShowCreate] = useState(false);

    const loadTiers = useCallback(async () => {
        if (!id) return;
        const res = await getEventTicketCategories(id);
        setTiers(res || []);
    }, [id]);

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
                const [eventRes, tiersRes] = await Promise.all([
                    getEventById(id),
                    getEventTicketCategories(id),
                ]);
                if (cancelled) return;
                setEvent(eventRes);
                setTiers(tiersRes || []);
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat data tiket");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id, router]);

    const summary = useMemo(() => {
        const totalQuota = tiers.reduce((a, t) => a + (Number(t.quota) || 0), 0);
        const totalSold = tiers.reduce((a, t) => a + (Number(t.sold) || 0), 0);
        const available = Math.max(0, totalQuota - totalSold);
        const potential = tiers.reduce(
            (a, t) => a + (Number(t.quota) || 0) * (Number(t.price) || 0),
            0
        );
        const revenue = tiers.reduce(
            (a, t) => a + (Number(t.sold) || 0) * (Number(t.price) || 0),
            0
        );
        const soldPct = totalQuota ? Math.round((totalSold / totalQuota) * 100) : 0;
        return { totalQuota, totalSold, available, potential, revenue, soldPct };
    }, [tiers]);

    const summaryCards = [
        {
            label: "Total Kuota",
            value: formatNumber(summary.totalQuota),
            suffix: "tiket",
            icon: Ticket,
            note: `${tiers.length} kategori aktif`,
            accent: "border-t-4 border-t-[#5B0F18]",
        },
        {
            label: "Terjual",
            value: formatNumber(summary.totalSold),
            suffix: `/ ${formatNumber(summary.totalQuota)}`,
            icon: CheckCircle2,
            percent: summary.soldPct,
            note: `${summary.soldPct}% dari kuota`,
        },
        {
            label: "Sisa Kuota",
            value: formatNumber(summary.available),
            suffix: "tiket",
            icon: AlertTriangle,
            note: summary.available === 0 ? "Semua tiket habis" : "Masih tersedia",
        },
        {
            label: "Pendapatan",
            value: formatCompactRupiah(summary.revenue),
            suffix: "",
            icon: BarChart3,
            badge: `Potensi ${formatCompactRupiah(summary.potential)}`,
            badgeClasses: "bg-[#F0EDED] text-[#8C7777]",
            note: "Dari tiket yang terjual",
        },
    ];

    function startCreate() {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowCreate(true);
        setError(null);
    }

    function startEdit(tier) {
        setForm({
            name: tier.name || "",
            price: String(tier.price ?? ""),
            quota: String(tier.quota ?? ""),
            description: tier.description || "",
            is_active: tier.is_active ?? true,
        });
        setEditingId(tier.id);
        setShowCreate(false);
        setError(null);
    }

    function cancelForm() {
        setEditingId(null);
        setShowCreate(false);
        setForm(EMPTY_FORM);
        setError(null);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);

        if (!form.name.trim()) {
            setError("Nama kategori wajib diisi.");
            return;
        }
        if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
            setError("Harga tidak valid.");
            return;
        }
        if (Number(form.quota) <= 0 || Number.isNaN(Number(form.quota))) {
            setError("Kuota harus lebih dari 0.");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: form.name.trim(),
                price: Number(form.price),
                quota: Number(form.quota),
                description: form.description.trim(),
                is_active: !!form.is_active,
                event_id: id,
            };

            if (editingId) {
                await updateTicketCategory(editingId, payload);
            } else {
                await createTicketCategory(payload);
            }
            await loadTiers();
            cancelForm();
        } catch (err) {
            setError(err.message || "Gagal menyimpan kategori tiket");
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleActive(tier) {
        try {
            await updateTicketCategory(tier.id, {
                ...tier,
                is_active: !tier.is_active,
            });
            setTiers((prev) =>
                prev.map((t) => (t.id === tier.id ? { ...t, is_active: !t.is_active } : t))
            );
        } catch (err) {
            setError(err.message || "Gagal mengubah status kategori");
        }
    }

    async function handleDelete(tier) {
        if (tier.sold > 0) {
            setError("Tidak bisa menghapus kategori yang sudah memiliki penjualan.");
            return;
        }
        if (!window.confirm(`Hapus kategori "${tier.name}"?`)) return;
        try {
            await deleteTicketCategory(tier.id);
            setTiers((prev) => prev.filter((t) => t.id !== tier.id));
        } catch (err) {
            setError(err.message || "Gagal menghapus kategori");
        }
    }

    const isEditing = editingId !== null || showCreate;

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
                            placeholder="Cari kategori atau harga..."
                            className="w-full bg-white text-[#1E1E1E] outline-none placeholder:text-[#8C7777]"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="shrink-0 text-[#B4841F] hover:text-[#5B0F18]"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Hero */}
                <div className="mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B0F18] to-[#3A0810] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {event?.category_name || "Kelola Tiket"}
                        </span>
                        <h1 className="truncate text-2xl font-bold sm:text-3xl">
                            {loading ? "Memuat..." : event?.title || "Kelola Tiket"}
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
                        <Link
                            href={`/admin/events/${id}/analytics`}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Lihat Analitik
                        </Link>
                        <button
                            type="button"
                            onClick={startCreate}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4]"
                        >
                            <Plus className="h-4 w-4" />
                            Tambah Kategori
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {(loading ? Array.from({ length: 4 }) : summaryCards).map((stat, i) => {
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
                                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                        <div className="h-full rounded-full bg-[#F3D9A4]" style={{ width: `${stat.percent}%` }} />
                                    </div>
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

                {/* Form */}
                {isEditing && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1E1E]">
                                {editingId ? "Edit Kategori Tiket" : "Tambah Kategori Tiket"}
                            </h2>
                            <button
                                type="button"
                                onClick={cancelForm}
                                className="rounded-full p-1.5 text-[#8C7777] transition hover:bg-[#F8F1E7]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-[#8C7777]">
                                    Nama Kategori
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="Contoh: VIP, Festival A, Tribune"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#1E1E1E] outline-none transition focus:border-[#5B0F18] focus:ring-2 focus:ring-[#5B0F18]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[#8C7777]">
                                    Harga (Rp)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={form.price}
                                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                    placeholder="500000"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#1E1E1E] outline-none transition focus:border-[#5B0F18] focus:ring-2 focus:ring-[#5B0F18]/10"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-[#8C7777]">
                                    Kuota
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.quota}
                                    onChange={(e) => setForm((f) => ({ ...f, quota: e.target.value }))}
                                    placeholder="1000"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#1E1E1E] outline-none transition focus:border-[#5B0F18] focus:ring-2 focus:ring-[#5B0F18]/10"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-[#8C7777]">
                                    Deskripsi (opsional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Fasilitas, benefit, atau catatan tambahan..."
                                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#1E1E1E] outline-none transition focus:border-[#5B0F18] focus:ring-2 focus:ring-[#5B0F18]/10"
                                />
                            </div>

                            <label className="flex cursor-pointer items-center gap-2 md:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                    className="h-4 w-4 rounded border-gray-300 text-[#5B0F18] focus:ring-[#5B0F18]"
                                />
                                <span className="text-sm text-[#1E1E1E]">
                                    Aktifkan kategori ini untuk penjualan
                                </span>
                            </label>

                            <div className="flex items-center gap-2 md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#5B0F18] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            {editingId ? "Simpan Perubahan" : "Simpan Kategori"}
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelForm}
                                    className="rounded-xl bg-[#F8F1E7] px-5 py-2.5 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tier list */}
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-[#1E1E1E]">Daftar Kategori Tiket</h2>
                            <p className="text-xs text-[#8C7777]">
                                Kelola harga, kuota, dan status per kategori tiket.
                            </p>
                        </div>
                        <span className="rounded-full bg-[#F0EDED] px-2.5 py-1 text-[10px] font-semibold text-[#8C7777]">
                            {tiers.length} kategori
                        </span>
                    </div>

                    {loading && (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F8F1E7]" />
                            ))}
                        </div>
                    )}

                    {!loading && tiers.length === 0 && (
                        <div className="rounded-2xl bg-[#F8F1E7] p-10 text-center">
                            <Ticket className="mx-auto h-8 w-8 text-[#8C7777]" />
                            <p className="mt-2 text-sm font-semibold text-[#1E1E1E]">
                                Belum ada kategori tiket
                            </p>
                            <p className="mt-1 text-xs text-[#8C7777]">
                                Tambahkan kategori tiket pertama untuk mulai menjual.
                            </p>
                            <button
                                type="button"
                                onClick={startCreate}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Tambah Kategori
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {tiers.map((tier) => {
                            const quota = Number(tier.quota) || 0;
                            const sold = Number(tier.sold) || 0;
                            const available = Math.max(0, quota - sold);
                            const pct = quota ? Math.round((sold / quota) * 100) : 0;
                            const isSoldOut = quota > 0 && sold >= quota;

                            return (
                                <div
                                    key={tier.id}
                                    className="flex flex-col gap-4 rounded-2xl bg-[#F8F1E7] p-4 sm:flex-row sm:items-center"
                                >
                                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white text-[#5B0F18]">
                                        <Ticket className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-[#F0EDED] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#5B0F18]">
                                                {tier.name || "Tanpa Nama"}
                                            </span>
                                            {tier.is_active === false ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E4E4] px-2 py-0.5 text-[10px] font-semibold text-[#B3261E]">
                                                    <XCircle className="h-3 w-3" /> Nonaktif
                                                </span>
                                            ) : isSoldOut ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E4E4] px-2 py-0.5 text-[10px] font-semibold text-[#B3261E]">
                                                    Sold Out
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F3EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E7A4C]">
                                                    <CheckCircle2 className="h-3 w-3" /> Aktif
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 text-lg font-bold text-[#1E1E1E]">
                                            {formatRupiah(tier.price)}
                                        </p>

                                        {tier.description && (
                                            <p className="mt-0.5 line-clamp-1 text-xs text-[#8C7777]">
                                                {tier.description}
                                            </p>
                                        )}

                                        <div className="mt-2 w-full max-w-xs">
                                            <div className="flex justify-between text-[11px] font-semibold text-[#8C7777]">
                                                <span className="font-bold text-[#5B0F18]">
                                                    {formatNumber(sold)} / {formatNumber(quota)}
                                                </span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
                                                <div
                                                    className="h-full rounded-full bg-[#F3D9A4]"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <p className="mt-1 text-[10px] text-[#8C7777]">
                                                {formatNumber(available)} tiket tersisa
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(tier)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(tier)}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                                        >
                                            {tier.is_active === false ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5" /> Aktifkan
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-3.5 w-3.5" /> Nonaktifkan
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(tier)}
                                            disabled={sold > 0}
                                            title={sold > 0 ? "Kategori sudah memiliki penjualan" : "Hapus kategori"}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#B3261E] transition hover:bg-[#F3E4E4] disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}