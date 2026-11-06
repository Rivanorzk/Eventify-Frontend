// app/admin/vouchers/[id]/edit/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, TicketPercent } from "lucide-react";
import { getEvents } from "@/services/eventService";
import { getVoucherById, updateVoucher } from "@/services/voucherService";

/**
 * Konversi ISO date string ke format "YYYY-MM-DDTHH:mm"
 * yang dibutuhkan oleh input[type=datetime-local].
 */
function toDateTimeLocal(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditVoucherPage() {
    const router = useRouter();
    const params = useParams();
    const voucherId = params?.id;

    const [events, setEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingVoucher, setLoadingVoucher] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notFound, setNotFound] = useState(false);

    const [form, setForm] = useState({
        event_id: "",
        title: "",
        promo_code: "",
        minimum_ticket: 1,
        discount_type: "percentage",
        discount_value: "",
        quota: 1,
        start_date: "",
        end_date: "",
    });

    useEffect(() => {
        if (!voucherId) return;

        const loadData = async () => {
            try {
                const [eventsData, voucherData] = await Promise.all([
                    getEvents(),
                    getVoucherById(voucherId),
                ]);

                setEvents(
                    Array.isArray(eventsData)
                        ? eventsData.filter((e) => e.status !== "cancelled")
                        : []
                );

                if (!voucherData) {
                    setNotFound(true);
                    return;
                }

                setForm({
                    event_id: String(voucherData.event_id ?? ""),
                    title: voucherData.title ?? "",
                    promo_code: voucherData.promo_code ?? "",
                    minimum_ticket: voucherData.minimum_quantity ?? 1,
                    discount_type: voucherData.discount_type ?? "percentage",
                    discount_value: voucherData.discount_value ?? "",
                    quota: voucherData.quota ?? 1,
                    start_date: toDateTimeLocal(voucherData.start_date),
                    end_date: toDateTimeLocal(voucherData.end_date),
                });
            } catch (err) {
                console.error("Failed to load voucher:", err);

                if (err?.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setError(
                        err?.response?.data?.message ||
                            "Failed to load voucher data."
                    );
                }
            } finally {
                setLoadingEvents(false);
                setLoadingVoucher(false);
            }
        };

        loadData();
    }, [voucherId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handlePromoCodeChange = (e) => {
        setForm((current) => ({
            ...current,
            promo_code: e.target.value.toUpperCase().replace(/\s/g, ""),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validasi (sama dengan create)
        if (!form.event_id) {
            setError("Please select an event.");
            return;
        }
        if (!form.title.trim()) {
            setError("Voucher title is required.");
            return;
        }
        if (!form.promo_code.trim()) {
            setError("Promo code is required.");
            return;
        }
        if (Number(form.minimum_ticket) < 1) {
            setError("Minimum ticket must be at least 1.");
            return;
        }
        if (Number(form.discount_value) <= 0) {
            setError("Discount value must be greater than 0.");
            return;
        }
        if (
            form.discount_type === "percentage" &&
            Number(form.discount_value) > 100
        ) {
            setError("Percentage discount cannot exceed 100%.");
            return;
        }
        if (Number(form.quota) < 1) {
            setError("Quota cannot be less than 1.");
            return;
        }
        if (!form.start_date || !form.end_date) {
            setError("Start date and end date are required.");
            return;
        }
        if (new Date(form.end_date) <= new Date(form.start_date)) {
            setError("End date must be after start date.");
            return;
        }

        try {
            setLoading(true);

            await updateVoucher(voucherId, {
                event_id: Number(form.event_id),
                title: form.title.trim(),
                promo_code: form.promo_code.trim(),
                minimum_quantity: Number(form.minimum_ticket),
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value),
                quota: Number(form.quota),
                start_date: new Date(form.start_date).toISOString(),
                end_date: new Date(form.end_date).toISOString(),
            });

            router.push("/admin/vouchers");
        } catch (err) {
            console.error("Failed to update voucher:", err);
            setError(
                err?.response?.data?.message || "Failed to update voucher."
            );
        } finally {
            setLoading(false);
        }
    };

    // ---------- Loading state ----------
    if (loadingVoucher) {
        return (
            <div className="min-h-screen bg-[#F8F0E7] px-4 py-6 md:px-8">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-center py-24">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#8B2635] border-t-transparent" />
                        <p className="text-sm font-semibold text-[#8C7777]">
                            Loading voucher...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- Not found state ----------
    if (notFound) {
        return (
            <div className="min-h-screen bg-[#F8F0E7] px-4 py-6 md:px-8">
                <div className="mx-auto w-full max-w-5xl">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/vouchers")}
                        className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#7E1D2D] transition hover:opacity-70"
                    >
                        <ArrowLeft size={18} />
                        Back to Vouchers
                    </button>

                    <div className="rounded-3xl border border-[#E6D5C9] bg-white px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7E8E4] text-[#8B2635]">
                            <TicketPercent size={26} />
                        </div>
                        <h2 className="text-xl font-bold text-[#1E1E1E]">
                            Voucher Not Found
                        </h2>
                        <p className="mt-2 text-sm text-[#8C7777]">
                            Voucher dengan ID <b>#{voucherId}</b> tidak ditemukan
                            atau sudah dihapus.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push("/admin/vouchers")}
                            className="mt-6 h-11 rounded-xl bg-[#7E1D2D] px-6 text-sm font-bold text-white transition hover:bg-[#691724]"
                        >
                            Back to Vouchers
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ---------- Form ----------
    return (
        <div className="min-h-screen bg-[#F8F0E7] px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-5xl">
                <button
                    type="button"
                    onClick={() => router.push("/admin/vouchers")}
                    className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#7E1D2D] transition hover:opacity-70"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>

                <div className="overflow-hidden rounded-3xl border border-[#E6D5C9] bg-white">
                    <div className="border-b border-[#E6D5C9] px-6 py-6 md:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7E8E4] text-[#8B2635]">
                                <TicketPercent size={23} />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-[#1E1E1E]">
                                    Edit Voucher
                                </h1>
                                <p className="mt-1 text-sm text-[#8C7777]">
                                    Perbarui detail voucher promosi untuk event.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-8 px-6 py-7 text-black md:px-8"
                    >
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                                {error}
                            </div>
                        )}

                        {/* EVENT */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                Event
                            </label>
                            <select
                                name="event_id"
                                value={form.event_id}
                                onChange={handleChange}
                                disabled={loadingEvents}
                                required
                                className="h-14 w-full rounded-xl border border-[#E3D3CA] bg-white px-4 text-base outline-none transition focus:border-[#8B2635]"
                            >
                                <option value="">
                                    {loadingEvents
                                        ? "Loading events..."
                                        : "Select event"}
                                </option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* TITLE + PROMO CODE */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    Voucher Title
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="Early Bird"
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base outline-none transition focus:border-[#8B2635]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    Promo Code
                                </label>
                                <input
                                    type="text"
                                    name="promo_code"
                                    value={form.promo_code}
                                    onChange={handlePromoCodeChange}
                                    placeholder="EARLYBIRD"
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base uppercase outline-none transition focus:border-[#8B2635]"
                                />
                            </div>
                        </div>

                        {/* MINIMUM + QUOTA */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    Minimum Ticket
                                </label>
                                <input
                                    type="number"
                                    name="minimum_ticket"
                                    value={form.minimum_ticket}
                                    onChange={handleChange}
                                    min="1"
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base outline-none transition focus:border-[#8B2635]"
                                />
                                <p className="mt-2 text-xs text-[#9A8585]">
                                    Minimum number of tickets required to use
                                    this voucher.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    Quota
                                </label>
                                <input
                                    type="number"
                                    name="quota"
                                    value={form.quota}
                                    onChange={handleChange}
                                    min="1"
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base outline-none transition focus:border-[#8B2635]"
                                />
                                <p className="mt-2 text-xs text-[#9A8585]">
                                    Number of times this voucher can be used.
                                </p>
                            </div>
                        </div>

                        {/* DISCOUNT */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                Discount
                            </label>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                                <select
                                    name="discount_type"
                                    value={form.discount_type}
                                    onChange={handleChange}
                                    className="h-14 rounded-xl border border-[#E3D3CA] bg-white px-4 text-base outline-none transition focus:border-[#8B2635]"
                                >
                                    <option value="percentage">
                                        Percentage (%)
                                    </option>
                                    <option value="fixed">
                                        Fixed Amount
                                    </option>
                                </select>

                                <div className="relative">
                                    <input
                                        type="number"
                                        name="discount_value"
                                        value={form.discount_value}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder={
                                            form.discount_type === "percentage"
                                                ? "10"
                                                : "50000"
                                        }
                                        required
                                        className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 pr-16 text-base outline-none transition focus:border-[#8B2635]"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8C7777]">
                                        {form.discount_type === "percentage"
                                            ? "%"
                                            : "IDR"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* DATE */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    Start Date
                                </label>
                                <input
                                    type="datetime-local"
                                    name="start_date"
                                    value={form.start_date}
                                    onChange={handleChange}
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base outline-none transition focus:border-[#8B2635]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-[#1E1E1E]">
                                    End Date
                                </label>
                                <input
                                    type="datetime-local"
                                    name="end_date"
                                    value={form.end_date}
                                    onChange={handleChange}
                                    required
                                    className="h-14 w-full rounded-xl border border-[#E3D3CA] px-4 text-base outline-none transition focus:border-[#8B2635]"
                                />
                            </div>
                        </div>

                        {/* ACTION */}
                        <div className="flex flex-col-reverse gap-3 border-t border-[#E6D5C9] pt-6 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => router.push("/admin/vouchers")}
                                disabled={loading}
                                className="h-12 rounded-xl border border-[#E0CFC5] px-6 text-sm font-bold text-[#6F5A5A] transition hover:bg-[#FAF5F1] disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="h-12 rounded-xl bg-[#7E1D2D] px-7 text-sm font-bold text-white transition hover:bg-[#691724] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}