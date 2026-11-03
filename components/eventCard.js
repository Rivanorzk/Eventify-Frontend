// components/eventCard.js
import Link from "next/link";
import { Calendar, Music } from "lucide-react";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRupiah(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "Free";
    }
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(Number(value));
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

function daysFromNow(dateStr) {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return null;
    const diffMs = target.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.round(diffMs / 86400000);
}

/**
 * Kartu event untuk daftar "Sedang Hangat".
 *
 * Props:
 *   event: { id, title, poster, category_name, event_date, start_time,
 *            location, price }
 */
export default function EventCard({ event }) {
    const d = daysFromNow(event.event_date);
    const soonBadge =
        d !== null && d >= 0 && d <= 7 ? (d === 0 ? "Hari Ini" : `${d} Hari Lagi`) : null;

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div
                className="relative flex h-36 items-center justify-center bg-gradient-to-br from-[#5B0F18] to-[#7A1F2B] bg-cover bg-center"
                style={event.poster ? { backgroundImage: `url(${event.poster})` } : undefined}
            >
                {!event.poster && <Music className="h-8 w-8 text-white/40" />}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1E1E1E]">
                    {event.category_name || "Event"}
                </span>
                {soonBadge && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#F3D9A4] px-2.5 py-1 text-xs font-semibold text-[#5B0F18]">
                        {soonBadge}
                    </span>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-bold text-[#1E1E1E]">{event.title}</h3>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8C7777]">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatEventDate(event.event_date, event.start_time)}</span>
                </div>
                <p className="mt-1 truncate text-xs text-[#8C7777]">{event.location}</p>

                <div className="mt-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] text-[#8C7777]">Mulai dari</p>
                        <p className="font-bold text-[#5B0F18]">{formatRupiah(event.price)}</p>
                    </div>
                    <Link
                        href={`/customer/event/${event.id}`}
                        className="rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B]"
                    >
                        Beli Tiket
                    </Link>
                </div>
            </div>
        </div>
    );
}