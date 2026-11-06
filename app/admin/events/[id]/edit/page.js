"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus, X, Trash2 } from "lucide-react";

import { getEventById, updateEvent } from "@/services/eventService";
import { getEventTicketCategories, getEventTicketCategoryDetail } from "@/services/eventTicketCategoryService";
import { createTicketArea, deleteTicketArea } from "@/services/eventTicketAreaService";
import { createTicketBenefit, deleteTicketBenefit } from "@/services/eventTicketBenefitService";
import { createTicketRule, deleteTicketRule } from "@/services/eventTicketRuleService";

function toDatetimeLocalValue(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Section area/benefit/aturan untuk SATU kategori tiket yang sudah ada di
// backend. Tambah/hapus langsung memanggil API (live), bukan staging lokal.
function LiveDetailSection({ title, items, fields, onAdd, onDelete }) {
    const [draft, setDraft] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (name, value) => setDraft((c) => ({ ...c, [name]: value }));

    const handleAdd = async () => {
        const requiredField = fields[0].name;
        if (!draft[requiredField]?.trim()) return;
        try {
            setSubmitting(true);
            await onAdd(draft);
            setDraft({});
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border border-[#E5D6D0] p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#7A1F2B]">{title}</h4>

            {items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex items-start justify-between gap-3 rounded-lg bg-[#FCF9F5] p-3 text-xs"
                        >
                            <span className="flex-1">
                                <strong>{item.area_name || item.title}</strong>
                                {item.floor && ` • ${item.floor}`}
                                {item.access_type && ` • ${item.access_type}`}
                                {item.gate_name && ` • ${item.gate_name}`}
                                {item.description && ` — ${item.description}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="text-[#B3261E] shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fields.map((f) => (
                    <input
                        key={f.name}
                        placeholder={f.placeholder}
                        value={draft[f.name] || ""}
                        onChange={(e) => handleChange(f.name, e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5D6D0] text-xs outline-none focus:border-[#7A1F2B]"
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={handleAdd}
                disabled={submitting}
                className="text-xs font-semibold text-[#7A1F2B] disabled:opacity-50"
            >
                {submitting ? "Menyimpan..." : `+ Tambah ${title}`}
            </button>
        </div>
    );
}

export default function EditEventPage() {
    const { id } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        location: "",
        poster: "",
        event_date: "",
        start_time: "",
        status: "draft",
        sales_start_at: "",
    });

    const [newPoster, setNewPoster] = useState(null);
    const [previewPoster, setPreviewPoster] = useState("");

    // Kategori tiket event ini + area/benefit/rule per kategori
    const [ticketCategories, setTicketCategories] = useState([]);
    const [detailsByCategory, setDetailsByCategory] = useState({});
    const [loadingTicketCategories, setLoadingTicketCategories] = useState(true);

    useEffect(() => {
        if (!id) return;

        const loadEvent = async () => {
            try {
                const event = await getEventById(id);

                setForm({
                    title: event.title || "",
                    description: event.description || "",
                    location: event.location || "",
                    poster: event.poster || "",
                    event_date: event.event_date || "",
                    start_time: event.start_time || "",
                    status: event.status || "draft",
                    sales_start_at: toDatetimeLocalValue(event.sales_start_at),
                });

                setPreviewPoster(event.poster || "");
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadEvent();
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const loadTicketCategories = async () => {
            try {
                setLoadingTicketCategories(true);

                const categories = await getEventTicketCategories(id);
                setTicketCategories(categories || []);

                const entries = await Promise.all(
                    (categories || []).map(async (cat) => {
                        const detail = await getEventTicketCategoryDetail(cat.id);
                        return [cat.id, detail];
                    })
                );

                setDetailsByCategory(Object.fromEntries(entries));
            } catch (error) {
                console.error("Failed to load ticket categories:", error);
                setTicketCategories([]);
            } finally {
                setLoadingTicketCategories(false);
            }
        };

        loadTicketCategories();
    }, [id]);

    const handleChange = (e) => {
        setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
    };

    const handlePosterChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setNewPoster(file);
        setPreviewPoster(URL.createObjectURL(file));
    };

    const removeNewPoster = () => {
        setNewPoster(null);
        setPreviewPoster(form.poster || "");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            const formData = new FormData();
            formData.append("title", form.title);
            formData.append("description", form.description);
            formData.append("location", form.location);
            formData.append("event_date", form.event_date);
            formData.append("start_time", form.start_time);
            formData.append("status", form.status);

            if (form.status === "draft" && form.sales_start_at) {
                formData.append("sales_start_at", new Date(form.sales_start_at).toISOString());
            }

            if (newPoster) formData.append("poster", newPoster);

            await updateEvent(id, formData);
            router.push(`/admin/events/${id}`);
        } catch (error) {
            console.error(error);
            alert("Failed to update event");
        } finally {
            setSaving(false);
        }
    };

    // ==== Area ====
    const handleAddArea = async (etcId, draft) => {
        try {
            const created = await createTicketArea({
                event_ticket_category_id: etcId,
                area_name: draft.area_name,
                floor: draft.floor,
                access_type: draft.access_type,
                gate_name: draft.gate_name,
                description: draft.description,
                display_order: detailsByCategory[etcId]?.areas?.length || 0,
            });
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: { ...current[etcId], areas: [...(current[etcId]?.areas || []), created] },
            }));
        } catch (error) {
            alert(error?.response?.data?.message || "Gagal menambah area.");
        }
    };

    const handleDeleteArea = async (etcId, areaId) => {
        if (!confirm("Hapus area ini?")) return;
        try {
            await deleteTicketArea(areaId);
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: {
                    ...current[etcId],
                    areas: current[etcId].areas.filter((a) => a.id !== areaId),
                },
            }));
        } catch (error) {
            alert("Gagal menghapus area.");
        }
    };

    // ==== Benefit ====
    const handleAddBenefit = async (etcId, draft) => {
        try {
            const created = await createTicketBenefit({
                event_ticket_category_id: etcId,
                title: draft.title,
                description: draft.description,
                icon: draft.icon,
                display_order: detailsByCategory[etcId]?.benefits?.length || 0,
            });
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: { ...current[etcId], benefits: [...(current[etcId]?.benefits || []), created] },
            }));
        } catch (error) {
            alert(error?.response?.data?.message || "Gagal menambah benefit.");
        }
    };

    const handleDeleteBenefit = async (etcId, benefitId) => {
        if (!confirm("Hapus benefit ini?")) return;
        try {
            await deleteTicketBenefit(benefitId);
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: {
                    ...current[etcId],
                    benefits: current[etcId].benefits.filter((b) => b.id !== benefitId),
                },
            }));
        } catch (error) {
            alert("Gagal menghapus benefit.");
        }
    };

    // ==== Rule ====
    const handleAddRule = async (etcId, draft) => {
        try {
            const created = await createTicketRule({
                event_ticket_category_id: etcId,
                title: draft.title,
                description: draft.description,
                display_order: detailsByCategory[etcId]?.rules?.length || 0,
            });
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: { ...current[etcId], rules: [...(current[etcId]?.rules || []), created] },
            }));
        } catch (error) {
            alert(error?.response?.data?.message || "Gagal menambah aturan.");
        }
    };

    const handleDeleteRule = async (etcId, ruleId) => {
        if (!confirm("Hapus aturan ini?")) return;
        try {
            await deleteTicketRule(ruleId);
            setDetailsByCategory((current) => ({
                ...current,
                [etcId]: {
                    ...current[etcId],
                    rules: current[etcId].rules.filter((r) => r.id !== ruleId),
                },
            }));
        } catch (error) {
            alert("Gagal menghapus aturan.");
        }
    };

    if (loading) {
        return <div className="p-8">Loading event...</div>;
    }

    return (
        <div className="min-h-screen p-5 lg:p-8">
            <div className="max-w-5xl mx-auto">
                <Link href={`/admin/events/${id}`} className="flex items-center gap-2 text-sm text-[#7A1F2B] mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Link>

                <h1 className="text-3xl font-bold text-black">Edit Event</h1>

                <form
                    onSubmit={handleSubmit}
                    className="mt-7 bg-white border border-[#E5D6D0] rounded-2xl p-6 space-y-5 text-black"
                >
                    <Field label="Title" name="title" value={form.title} onChange={handleChange} />
                    <Field label="Location" name="location" value={form.location} onChange={handleChange} />

                    <div>
                        <label className="text-sm font-semibold">Poster</label>

                        {previewPoster && (
                            <div className="relative mt-2 w-full max-w-sm overflow-hidden rounded-xl border border-[#E5D6D0]">
                                <img src={previewPoster} alt="Event poster" className="w-full aspect-video object-cover" />
                                {newPoster && (
                                    <button
                                        type="button"
                                        onClick={removeNewPoster}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        <label className="mt-3 flex items-center justify-center gap-2 w-full max-w-sm border border-dashed border-[#D8A7A7] rounded-xl px-4 py-4 cursor-pointer hover:bg-[#F8F1E7] transition">
                            <ImagePlus className="w-5 h-5 text-[#7A1F2B]" />
                            <span className="text-sm text-[#7A1F2B] font-medium">
                                {newPoster ? "Ganti Poster" : "Pilih Poster Baru"}
                            </span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePosterChange}
                                className="hidden"
                            />
                        </label>

                        <p className="mt-2 text-xs text-[#8C7777]">Kosongkan jika ingin menggunakan poster lama.</p>
                        {newPoster && (
                            <p className="mt-1 text-xs text-[#5B0F18] font-medium">File baru: {newPoster.name}</p>
                        )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Event Date" type="date" name="event_date" value={form.event_date} onChange={handleChange} />
                        <Field label="Start Time" type="time" name="start_time" value={form.start_time} onChange={handleChange} />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={5}
                            className="mt-2 w-full border border-[#E5D6D0] rounded-xl p-3 outline-none focus:border-[#7A1F2B]"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Status</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="mt-2 w-full border border-[#E5D6D0] rounded-xl p-3"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="finished">Finished</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {form.status === "draft" && (
                        <div>
                            <label className="text-sm font-semibold">Jadwal Dibukanya Penjualan Tiket</label>
                            <input
                                type="datetime-local"
                                name="sales_start_at"
                                value={form.sales_start_at}
                                onChange={handleChange}
                                className="mt-2 w-full border border-[#E5D6D0] rounded-xl p-3 outline-none focus:border-[#7A1F2B]"
                            />
                            <p className="mt-2 text-xs text-[#8C7777]">
                                Opsional. Dipakai untuk menampilkan hitung mundur "Tiket dibuka dalam ..."
                                di dashboard customer selama event masih berstatus draft.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 rounded-xl bg-[#5B0F18] text-[#F8F1E7] font-semibold disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </form>

                {/* AREA / BENEFIT / RULE PER KATEGORI TIKET */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold text-[#1E1E1E]">Area, Benefit & Aturan Tiket</h2>
                    <p className="mt-1 text-sm text-[#8C7777]">
                        Perubahan di sini tersimpan langsung, terpisah dari tombol "Save Changes" di atas.
                    </p>

                    {loadingTicketCategories ? (
                        <div className="mt-4 rounded-xl border border-[#E5D6D0] bg-white p-5 text-sm text-[#8C7777]">
                            Memuat kategori tiket...
                        </div>
                    ) : ticketCategories.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-[#E5D6D0] bg-[#FCF9F5] p-5 text-sm text-[#8C7777]">
                            Event ini belum punya kategori tiket. Tambahkan kategori tiket dulu sebelum
                            mengatur area, benefit, atau aturan.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-5">
                            {ticketCategories.map((cat) => {
                                const detail = detailsByCategory[cat.id] || { areas: [], benefits: [], rules: [] };

                                return (
                                    <div key={cat.id} className="bg-white border border-[#E5D6D0] rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-[#1E1E1E]">{cat.category_name}</h3>
                                            <span className="text-xs text-[#8C7777]">
                                                Sisa stok: {cat.remaining_stock}/{cat.stock}
                                            </span>
                                        </div>

                                        <LiveDetailSection
                                            title="Area / Zona"
                                            items={detail.areas || []}
                                            fields={[
                                                { name: "area_name", placeholder: "Nama area (mis. Lantai 2 VIP)" },
                                                { name: "floor", placeholder: "Lantai (opsional)" },
                                                { name: "access_type", placeholder: "Tipe akses (opsional)" },
                                                { name: "gate_name", placeholder: "Nama gate (opsional)" },
                                                { name: "description", placeholder: "Deskripsi (opsional)" },
                                            ]}
                                            onAdd={(draft) => handleAddArea(cat.id, draft)}
                                            onDelete={(areaId) => handleDeleteArea(cat.id, areaId)}
                                        />

                                        <LiveDetailSection
                                            title="Benefit"
                                            items={detail.benefits || []}
                                            fields={[
                                                { name: "title", placeholder: "Judul benefit (mis. Fast-Track Entry)" },
                                                { name: "description", placeholder: "Deskripsi (opsional)" },
                                                { name: "icon", placeholder: "Nama icon lucide (opsional)" },
                                            ]}
                                            onAdd={(draft) => handleAddBenefit(cat.id, draft)}
                                            onDelete={(benefitId) => handleDeleteBenefit(cat.id, benefitId)}
                                        />

                                        <LiveDetailSection
                                            title="Aturan"
                                            items={detail.rules || []}
                                            fields={[
                                                { name: "title", placeholder: "Judul aturan (mis. Wajib bawa KTP)" },
                                                { name: "description", placeholder: "Deskripsi (opsional)" },
                                            ]}
                                            onAdd={(draft) => handleAddRule(cat.id, draft)}
                                            onDelete={(ruleId) => handleDeleteRule(cat.id, ruleId)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, ...props }) {
    return (
        <div>
            <label className="text-sm font-semibold">{label}</label>
            <input {...props} className="mt-2 w-full border border-[#E5D6D0] rounded-xl p-3 outline-none focus:border-[#7A1F2B]" />
        </div>
    );
}