"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    CalendarDays,
    Plus,
    Search,
    MapPin,
    Clock,
    Pencil,
    Trash2,
    Eye,
} from "lucide-react";

import { getEvents, updateEvent, deleteEvent } from "@/services/eventService";

const STATUS_OPTIONS = ["all", "draft", "published", "finished", "cancelled"];

export default function AdminEventsPage() {
    const [events, setEvents] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const loadEvents = async () => {
        try {
            const response = await getEvents();

            setEvents(
                Array.isArray(response)
                    ? response
                    : []
            );
        } catch (error) {
            console.error("Failed to load events:", error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const filteredEvents = events.filter((event) => {
        const matchesSearch = event.title
            ?.toLowerCase()
            .includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === "all" || event.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this event?"
        );

        if (!confirmed) return;

        try {
            await deleteEvent(id);

            setEvents((current) =>
                current.filter((event) => event.id !== id)
            );
        } catch (error) {
            console.error("Failed to delete event:", error);
            alert("Failed to delete event.");
        }
    };

    const handleStatusChange = async (id, nextStatus) => {
        const previousEvents = events;

        // Optimistic update supaya terasa instan, di-rollback kalau gagal.
        setEvents((current) =>
            current.map((event) =>
                event.id === id
                    ? { ...event, status: nextStatus }
                    : event
            )
        );

        setUpdatingId(id);

        try {
            const formData = new FormData();
            formData.append("status", nextStatus);

            await updateEvent(id, formData);
        } catch (error) {
            console.error("Failed to update event status:", error);
            alert("Gagal mengubah status event.");
            setEvents(previousEvents);
        } finally {
            setUpdatingId(null);
        }
    };

    const formatEventDate = (date) => {
    if (!date) return "-";

    const value = String(date).slice(0, 10);
    const [year, month, day] = value.split("-");

    return `${day} ${new Date(
        Number(year),
        Number(month) - 1
    ).toLocaleString("en-US", {
        month: "short",
    })} ${year}`;
};

const formatEventTime = (time) => {
    if (!time) return "-";

    const [hour, minute] = String(time)
        .split(":")
        .map(Number);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ) {
        return "-";
    }

    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;

    return `${String(formattedHour).padStart(2, "0")}:${String(
        minute
    ).padStart(2, "0")} ${period}`;
};

    return (
        <main className="min-h-screen bg-[#F8F1E7]">
            <div className="max-w-[1600px] mx-auto px-5 py-6 lg:px-8">

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-7">
                    <div>
                        <p className="text-sm text-[#8C7777]">
                            Management
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-[#1E1E1E]">
                            Events
                        </h1>

                        <p className="mt-2 text-sm text-[#8C7777]">
                            Manage all events on Eventify.
                        </p>
                    </div>

                    <Link
                        href="/admin/events/create"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5B0F18] transition"
                    >
                        <Plus className="w-4 h-4" />
                        Create Event
                    </Link>
                </div>

                <div className="bg-white border border-[#E5D6D0] rounded-2xl overflow-hidden text-black">

                    <div className="p-5 border-b border-[#E5D6D0] flex flex-col gap-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A78E8E]" />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search events..."
                                className="w-full rounded-xl border border-[#E5D6D0] bg-[#FCF9F5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#7A1F2B]"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setStatusFilter(option)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                                        statusFilter === option
                                            ? "bg-[#7A1F2B] text-white"
                                            : "bg-[#F8F1E7] text-[#7A1F2B] hover:bg-[#F0E5DE]"
                                    }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-[#FCF9F5] border-b border-[#E5D6D0]">
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        Event
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        Location
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        Date
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        Status
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#F0E5DE]">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-5 py-12 text-center text-sm text-[#8C7777]"
                                        >
                                            Loading events...
                                        </td>
                                    </tr>
                                ) : filteredEvents.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-5 py-12 text-center"
                                        >
                                            <CalendarDays className="w-8 h-8 mx-auto text-[#D8A7A7]" />

                                            <p className="mt-3 text-sm text-[#8C7777]">
                                                No events found
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEvents.map((event) => (
                                        <tr
                                            key={event.id}
                                            className="hover:bg-[#FCF9F5] transition"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F8F1E7] shrink-0">
                                                        {event.poster ? (
                                                            <img
                                                                src={event.poster}
                                                                alt={event.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <CalendarDays className="w-5 h-5 mx-auto mt-3 text-[#7A1F2B]" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-[#1E1E1E] truncate max-w-[300px]">
                                                            {event.title}
                                                        </p>

                                                        <p className="text-xs text-[#8C7777] mt-1">
                                                            Event #{event.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-[#5F5050]">
                                                    <MapPin className="w-4 h-4 text-[#7A1F2B]" />
                                                    {event.location || "-"}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-[#1E1E1E]">
                                                        {formatEventDate(event.event_date)}
                                                    </span>

                                                    <span className="mt-1 text-xs text-[#8C7777]">
                                                        {formatEventTime(event.start_time)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={event.status || "draft"}
                                                    disabled={updatingId === event.id}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            event.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className={`rounded-full border-0 px-3 py-1 text-[11px] font-semibold capitalize outline-none focus:ring-2 focus:ring-[#7A1F2B]/30 disabled:opacity-50 ${
                                                        event.status === "published"
                                                            ? "bg-green-50 text-green-700"
                                                            : event.status === "cancelled"
                                                            ? "bg-red-50 text-red-700"
                                                            : event.status === "finished"
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-[#F8F1E7] text-[#7A1F2B]"
                                                    }`}
                                                >
                                                    {STATUS_OPTIONS.filter(
                                                        (option) => option !== "all"
                                                    ).map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/events/${event.id}`}
                                                        className="w-9 h-9 rounded-lg border border-[#E5D6D0] flex items-center justify-center text-[#7A1F2B] hover:bg-[#F8F1E7]"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>

                                                    <Link
                                                        href={`/admin/events/${event.id}/edit`}
                                                        className="w-9 h-9 rounded-lg border border-[#E5D6D0] flex items-center justify-center text-[#7A1F2B] hover:bg-[#F8F1E7]"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(event.id)
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}