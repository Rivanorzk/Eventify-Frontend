// app/superadmin/events/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Music, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { deleteEvent, getEvents, updateEvent } from "@/services/eventService";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import { currency, formatDate, formatTime } from "@/lib/formatter";

const STATUS_OPTIONS = [
    { value: "all", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "finished", label: "Finished" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGES = {
    draft: "bg-[#FDF3D8] text-[#B4841F]",
    published: "bg-[#E4F3EA] text-[#1E7A4C]",
    finished: "bg-[#EDEDED] text-[#737373]",
    cancelled: "bg-[#F3E4E4] text-[#B3261E]",
};

export default function SuperadminEventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");

    const [updatingId, setUpdatingId] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getEvents({
                status,
                search: search || undefined,
            });
            setEvents(data);
        } catch (err) {
            toast.error(err.message || "Gagal memuat event");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(load, 300); // debounce search
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, search]);

    const handleDelete = async (event) => {
        if (!confirm(`Hapus event "${event.title}"? Aksi ini permanen.`)) return;

        try {
            await deleteEvent(event.id);
            toast.success("Event berhasil dihapus");
            load();
        } catch (err) {
            toast.error(err.message || "Gagal menghapus event");
        }
    };

    const handleStatusChange = async (event, nextStatus) => {
        if (nextStatus === event.status) return;

        const previousEvents = events;

        setEvents((current) =>
            current.map((item) =>
                item.id === event.id
                    ? { ...item, status: nextStatus }
                    : item
            )
        );

        setUpdatingId(event.id);

        try {
            const formData = new FormData();
            formData.append("status", nextStatus);

            await updateEvent(event.id, formData);
            toast.success(`Status event diubah menjadi ${nextStatus}`);
        } catch (err) {
            toast.error(err.message || "Gagal mengubah status event");
            setEvents(previousEvents);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-[#1E1E1E]">
                        <CalendarDays className="h-5 w-5 text-[#7A1F2B]" />
                        Event
                    </h1>
                    <p className="mt-1 text-sm text-[#8C7777]">
                        Kelola semua event, termasuk yang masih draft.
                    </p>
                </div>
                <Link
                    href="/superadmin/events/new"
                    className="flex items-center gap-2 rounded-xl bg-[#5B0F18] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A1F2B]"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Event
                </Link>
            </div>

            {/* FILTER */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7777]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari judul, lokasi, atau kategori..."
                        className="w-full rounded-xl border border-[#E5D6D0] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#7A1F2B]"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="rounded-xl border border-[#E5D6D0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#7A1F2B]"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner text="Memuat event..." />
                </div>
            ) : events.length === 0 ? (
                <EmptyState title="Tidak ada event" description="Belum ada event yang cocok dengan filter ini." />
            ) : (
                <div className="space-y-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                        >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#5B0F18] sm:h-20 sm:w-20">
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

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-bold text-[#1E1E1E]">{event.title}</h3>
                                    <select
                                        value={event.status}
                                        disabled={updatingId === event.id}
                                        onChange={(e) =>
                                            handleStatusChange(event, e.target.value)
                                        }
                                        className={`shrink-0 rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#7A1F2B]/30 disabled:opacity-50 ${
                                            STATUS_BADGES[event.status] || "bg-[#F8F1E7] text-[#8C7777]"
                                        }`}
                                    >
                                        {STATUS_OPTIONS.filter((opt) => opt.value !== "all").map(
                                            (opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8C7777]">
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {formatDate(event.event_date)} • {formatTime(event.start_time)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {event.location || "TBA"}
                                    </span>
                                    {event.category_name && <span>{event.category_name}</span>}
                                    {event.price != null && <span>Mulai {currency(event.price)}</span>}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <Link
                                    href={`/superadmin/events/${event.id}/edit`}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5D6D0] text-[#8C7777] transition hover:bg-[#F8F1E7] hover:text-[#1E1E1E]"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(event)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5D6D0] text-[#8C7777] transition hover:bg-[#F3E4E4] hover:text-[#B3261E]"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}