"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Upload,
    X,
    Ticket,
    Trash2,
} from "lucide-react";

import { createEvent } from "@/services/eventService";
import { getCategories } from "@/services/categoryService";
import { getTicketCategories } from "@/services/ticketCategoryService";
import { createEventTicketCategories } from "@/services/eventTicketCategoryService";
import { createTicketArea } from "@/services/eventTicketAreaService";
import { createTicketBenefit } from "@/services/eventTicketBenefitService";
import { createTicketRule } from "@/services/eventTicketRuleService";

import dynamic from "next/dynamic";

const LocationPicker = dynamic(
    () => import("@/components/eventLocationPicker"),
    { ssr: false }
);

// Input berulang untuk area / benefit / aturan. items disimpan lokal di
// state form (belum tersimpan ke backend sampai event & ticket category
// berhasil dibuat saat submit).
function DetailRepeater({ title, fields, items, onAdd, onRemove, renderItem }) {
    const [draft, setDraft] = useState({});

    const handleChange = (name, value) => {
        setDraft((current) => ({ ...current, [name]: value }));
    };

    const handleAdd = () => {
        const requiredField = fields[0].name;
        if (!draft[requiredField]?.trim()) return;
        onAdd(draft);
        setDraft({});
    };

    return (
        <div className="rounded-xl border border-[#E5D6D0] p-4 space-y-3 bg-[#FCF9F5]">
            <h4 className="text-xs font-bold uppercase text-[#7A1F2B]">{title}</h4>

            {items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((item, idx) => (
                        <li
                            key={idx}
                            className="flex items-start justify-between gap-3 rounded-lg bg-white border border-[#E5D6D0] p-3 text-xs"
                        >
                            <span className="flex-1">{renderItem(item)}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(idx)}
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
                        type={f.type || "text"}
                        placeholder={f.placeholder}
                        value={draft[f.name] || ""}
                        onChange={(e) => handleChange(f.name, e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5D6D0] text-xs outline-none focus:border-[#7A1F2B] bg-white"
                    />
                ))}
            </div>

            <button
                type="button"
                onClick={handleAdd}
                className="text-xs font-semibold text-[#7A1F2B]"
            >
                + Tambah {title}
            </button>
        </div>
    );
}

export default function CreateEventPage() {
    const router = useRouter();

    const [form, setForm] = useState({
        title: "",
        category_id: "",
        description: "",
        location: "",
        latitude: "",
        longitude: "",
        poster: null,
        event_date: "",
        start_time: "",
        status: "draft",
        sales_start_at: "",
    });

    const [categories, setCategories] = useState([]);
    const [ticketCategories, setTicketCategories] = useState([]);
    const [selectedTickets, setSelectedTickets] = useState([]);

    const [preview, setPreview] = useState("");

    const [loading, setLoading] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingTicketCategories, setLoadingTicketCategories] = useState(true);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoadingCategories(true);
                const response = await getCategories();
                setCategories(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error("Failed to load categories:", error);
                setCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };

        loadCategories();
    }, []);

    useEffect(() => {
        const loadTicketCategories = async () => {
            try {
                setLoadingTicketCategories(true);
                const response = await getTicketCategories();
                setTicketCategories(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error("Failed to load ticket categories:", error);
                setTicketCategories([]);
            } finally {
                setLoadingTicketCategories(false);
            }
        };

        loadTicketCategories();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handlePosterChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("File harus berupa gambar.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran gambar maksimal 5MB.");
            return;
        }
        if (preview) URL.revokeObjectURL(preview);

        setForm((current) => ({ ...current, poster: file }));
        setPreview(URL.createObjectURL(file));
    };

    const removePoster = () => {
        if (preview) URL.revokeObjectURL(preview);
        setForm((current) => ({ ...current, poster: null }));
        setPreview("");
    };

    const toggleTicketCategory = (category) => {
        setSelectedTickets((current) => {
            const exists = current.some(
                (item) => item.ticket_category_id === category.id
            );

            if (exists) {
                return current.filter(
                    (item) => item.ticket_category_id !== category.id
                );
            }

            return [
                ...current,
                {
                    ticket_category_id: category.id,
                    category_name: category.category_name,
                    price: "",
                    stock: "",
                    areas: [],
                    benefits: [],
                    rules: [],
                },
            ];
        });
    };

    const updateTicketValue = (categoryId, field, value) => {
        setSelectedTickets((current) =>
            current.map((ticket) =>
                ticket.ticket_category_id === categoryId
                    ? { ...ticket, [field]: value }
                    : ticket
            )
        );
    };

    const addTicketDetail = (categoryId, field, entry) => {
        setSelectedTickets((current) =>
            current.map((ticket) =>
                ticket.ticket_category_id === categoryId
                    ? { ...ticket, [field]: [...ticket[field], entry] }
                    : ticket
            )
        );
    };

    const removeTicketDetail = (categoryId, field, index) => {
        setSelectedTickets((current) =>
            current.map((ticket) =>
                ticket.ticket_category_id === categoryId
                    ? {
                          ...ticket,
                          [field]: ticket[field].filter((_, i) => i !== index),
                      }
                    : ticket
            )
        );
    };

    const validateTickets = () => {
        for (const ticket of selectedTickets) {
            if (
                ticket.price === "" ||
                ticket.price === null ||
                !Number.isFinite(Number(ticket.price)) ||
                Number(ticket.price) < 0
            ) {
                alert(`Harga ticket ${ticket.category_name} belum valid.`);
                return false;
            }

            if (
                ticket.stock === "" ||
                ticket.stock === null ||
                !Number.isInteger(Number(ticket.stock)) ||
                Number(ticket.stock) <= 0
            ) {
                alert(`Stock ticket ${ticket.category_name} harus lebih dari 0.`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title.trim()) {
            alert("Judul event wajib diisi.");
            return;
        }
        if (!form.category_id) {
            alert("Silakan pilih kategori event.");
            return;
        }
        if (!form.location.trim()) {
            alert("Lokasi event wajib diisi.");
            return;
        }
        if (!form.event_date) {
            alert("Tanggal event wajib diisi.");
            return;
        }
        if (!form.start_time) {
            alert("Waktu mulai event wajib diisi.");
            return;
        }
        if (!form.poster) {
            alert("Poster event wajib diupload.");
            return;
        }
        if (!validateTickets()) return;

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("title", form.title.trim());
            formData.append("category_id", form.category_id);
            formData.append("description", form.description.trim());
            formData.append("location", form.location.trim());

            if (form.latitude !== "") formData.append("latitude", form.latitude);
            if (form.longitude !== "") formData.append("longitude", form.longitude);

            formData.append("poster", form.poster);
            formData.append("event_date", form.event_date);
            formData.append("start_time", form.start_time);
            formData.append("status", form.status);

            if (form.status === "draft" && form.sales_start_at) {
                formData.append(
                    "sales_start_at",
                    new Date(form.sales_start_at).toISOString()
                );
            }

            const createdEvent = await createEvent(formData);
            const eventId = createdEvent?.id ?? createdEvent?.data?.id;

            if (!eventId) {
                throw new Error(
                    "Event berhasil dibuat tetapi ID event tidak ditemukan."
                );
            }

            for (const ticket of selectedTickets) {
                const price = Number(ticket.price);
                const stock = Number(ticket.stock);

                const createdCategory = await createEventTicketCategories({
                    event_id: Number(eventId),
                    ticket_category_id: Number(ticket.ticket_category_id),
                    price,
                    stock,
                    remaining_stock: stock,
                });

                const etcId = createdCategory?.id;
                if (!etcId) continue;

                await Promise.all([
                    ...ticket.areas.map((area, idx) =>
                        createTicketArea({
                            event_ticket_category_id: etcId,
                            area_name: area.area_name,
                            floor: area.floor,
                            access_type: area.access_type,
                            gate_name: area.gate_name,
                            description: area.description,
                            display_order: idx,
                        })
                    ),
                    ...ticket.benefits.map((benefit, idx) =>
                        createTicketBenefit({
                            event_ticket_category_id: etcId,
                            title: benefit.title,
                            description: benefit.description,
                            icon: benefit.icon,
                            display_order: idx,
                        })
                    ),
                    ...ticket.rules.map((rule, idx) =>
                        createTicketRule({
                            event_ticket_category_id: etcId,
                            title: rule.title,
                            description: rule.description,
                            display_order: idx,
                        })
                    ),
                ]);
            }

            router.push("/admin/events");
        } catch (error) {
            console.error("Failed to create event:", error);
            alert(
                error?.response?.data?.message ||
                    error?.message ||
                    "Failed to create event."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    return (
        <div className="min-h-screen p-5 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/admin/events"
                    className="inline-flex items-center gap-2 text-sm text-[#7A1F2B] mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Events
                </Link>

                <div className="mb-7">
                    <h1 className="text-3xl font-bold text-[#1E1E1E]">Create Event</h1>
                    <p className="mt-1 text-sm text-[#8C7777]">Add a new event to Eventify.</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-[#E5D6D0] rounded-2xl p-6 space-y-6 text-[#1E1E1E]"
                >
                    <Input
                        label="Event Title"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Enter event title"
                        required
                    />

                    <div>
                        <label className="text-sm font-semibold">Event Category</label>
                        <select
                            name="category_id"
                            value={form.category_id}
                            onChange={handleChange}
                            required
                            disabled={loadingCategories}
                            className="mt-2 w-full rounded-xl border border-[#E5D6D0] p-3 bg-white outline-none focus:border-[#7A1F2B] disabled:bg-[#F8F1E7]"
                        >
                            <option value="">
                                {loadingCategories ? "Loading categories..." : "Select event category"}
                            </option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.category_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-semibold">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            rows={5}
                            placeholder="Describe your event..."
                            className="mt-2 w-full rounded-xl border border-[#E5D6D0] p-3 resize-none outline-none focus:border-[#7A1F2B]"
                        />
                    </div>

                    <div>
                        <LocationPicker
                            location={form.location}
                            latitude={form.latitude}
                            longitude={form.longitude}
                            onChange={({ location, latitude, longitude }) => {
                                setForm((current) => ({ ...current, location, latitude, longitude }));
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                            label="Event Date"
                            name="event_date"
                            type="date"
                            value={form.event_date}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Start Time"
                            name="start_time"
                            type="time"
                            value={form.start_time}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* TICKET CATEGORIES */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Ticket className="w-5 h-5 text-[#7A1F2B]" />
                            <div>
                                <h2 className="text-sm font-semibold">Ticket Categories</h2>
                                <p className="text-xs text-[#8C7777] mt-1">
                                    Select ticket categories available for this event, lalu lengkapi
                                    area/zona, benefit, dan aturan untuk tiap kategori (opsional).
                                </p>
                            </div>
                        </div>

                        {loadingTicketCategories ? (
                            <div className="rounded-xl border border-[#E5D6D0] p-5 text-sm text-[#8C7777]">
                                Loading ticket categories...
                            </div>
                        ) : ticketCategories.length === 0 ? (
                            <div className="rounded-xl border border-[#E5D6D0] bg-[#FCF9F5] p-5">
                                <p className="text-sm text-[#8C7777]">Belum ada ticket category.</p>
                                <Link
                                    href="/admin/ticket-categories/create"
                                    className="inline-block mt-2 text-sm font-semibold text-[#7A1F2B]"
                                >
                                    Create Ticket Category
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {ticketCategories.map((category) => {
                                    const selected = selectedTickets.find(
                                        (ticket) => ticket.ticket_category_id === category.id
                                    );

                                    return (
                                        <div key={category.id} className="rounded-xl border border-[#E5D6D0] p-4">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(selected)}
                                                    onChange={() => toggleTicketCategory(category)}
                                                    className="w-4 h-4 accent-[#7A1F2B]"
                                                />
                                                <span className="font-semibold text-sm">
                                                    {category.category_name}
                                                </span>
                                            </label>

                                            {selected && (
                                                <div className="mt-4 ml-7 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-2">
                                                                Price
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1000"
                                                                value={selected.price}
                                                                onChange={(e) =>
                                                                    updateTicketValue(category.id, "price", e.target.value)
                                                                }
                                                                placeholder="100000"
                                                                className="w-full px-4 py-3 rounded-xl border border-[#E5D6D0] outline-none focus:border-[#7A1F2B]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold mb-2">
                                                                Stock
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                value={selected.stock}
                                                                onChange={(e) =>
                                                                    updateTicketValue(category.id, "stock", e.target.value)
                                                                }
                                                                placeholder="100"
                                                                className="w-full px-4 py-3 rounded-xl border border-[#E5D6D0] outline-none focus:border-[#7A1F2B]"
                                                            />
                                                        </div>
                                                    </div>

                                                    <DetailRepeater
                                                        title="Area / Zona"
                                                        fields={[
                                                            { name: "area_name", placeholder: "Nama area (mis. Lantai 2 VIP)" },
                                                            { name: "floor", placeholder: "Lantai (opsional)" },
                                                            { name: "access_type", placeholder: "Tipe akses (opsional)" },
                                                            { name: "gate_name", placeholder: "Nama gate (opsional)" },
                                                            { name: "description", placeholder: "Deskripsi (opsional)" },
                                                        ]}
                                                        items={selected.areas}
                                                        onAdd={(entry) => addTicketDetail(category.id, "areas", entry)}
                                                        onRemove={(idx) => removeTicketDetail(category.id, "areas", idx)}
                                                        renderItem={(item) => (
                                                            <>
                                                                <strong>{item.area_name}</strong>
                                                                {item.floor && ` • ${item.floor}`}
                                                                {item.access_type && ` • ${item.access_type}`}
                                                                {item.gate_name && ` • ${item.gate_name}`}
                                                            </>
                                                        )}
                                                    />

                                                    <DetailRepeater
                                                        title="Benefit"
                                                        fields={[
                                                            { name: "title", placeholder: "Judul benefit (mis. Fast-Track Entry)" },
                                                            { name: "description", placeholder: "Deskripsi (opsional)" },
                                                            { name: "icon", placeholder: "Nama icon lucide (opsional)" },
                                                        ]}
                                                        items={selected.benefits}
                                                        onAdd={(entry) => addTicketDetail(category.id, "benefits", entry)}
                                                        onRemove={(idx) => removeTicketDetail(category.id, "benefits", idx)}
                                                        renderItem={(item) => (
                                                            <>
                                                                <strong>{item.title}</strong>
                                                                {item.description && ` — ${item.description}`}
                                                            </>
                                                        )}
                                                    />

                                                    <DetailRepeater
                                                        title="Aturan"
                                                        fields={[
                                                            { name: "title", placeholder: "Judul aturan (mis. Wajib bawa KTP)" },
                                                            { name: "description", placeholder: "Deskripsi (opsional)" },
                                                        ]}
                                                        items={selected.rules}
                                                        onAdd={(entry) => addTicketDetail(category.id, "rules", entry)}
                                                        onRemove={(idx) => removeTicketDetail(category.id, "rules", idx)}
                                                        renderItem={(item) => (
                                                            <>
                                                                <strong>{item.title}</strong>
                                                                {item.description && ` — ${item.description}`}
                                                            </>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* POSTER */}
                    <div>
                        <label className="text-sm font-semibold">Event Poster</label>
                        {!preview ? (
                            <label className="mt-2 flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-[#E5D6D0] bg-[#FCF9F5] cursor-pointer hover:border-[#7A1F2B] transition">
                                <Upload className="w-8 h-8 text-[#8C7777]" />
                                <span className="mt-2 text-sm text-[#8C7777]">Upload event poster</span>
                                <span className="mt-1 text-xs text-[#B49C9C]">PNG, JPG, JPEG · Max 5MB</span>
                                <input type="file" accept="image/*" onChange={handlePosterChange} className="hidden" />
                            </label>
                        ) : (
                            <div className="relative mt-2 rounded-xl overflow-hidden border border-[#E5D6D0]">
                                <img src={preview} alt="Event poster preview" className="w-full max-h-[400px] object-cover" />
                                <button
                                    type="button"
                                    onClick={removePoster}
                                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-[#5B0F18] text-white flex items-center justify-center hover:bg-[#7A1F2B]"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* STATUS */}
                    <div>
                        <label className="text-sm font-semibold">Status</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="mt-2 w-full rounded-xl border border-[#E5D6D0] p-3 bg-white outline-none focus:border-[#7A1F2B]"
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                        </select>
                    </div>

                    {form.status === "draft" && (
                        <div>
                            <label className="text-sm font-semibold">
                                Jadwal Dibukanya Penjualan Tiket
                            </label>
                            <input
                                type="datetime-local"
                                name="sales_start_at"
                                value={form.sales_start_at}
                                onChange={handleChange}
                                className="mt-2 w-full rounded-xl border border-[#E5D6D0] p-3 outline-none focus:border-[#7A1F2B]"
                            />
                            <p className="mt-2 text-xs text-[#8C7777]">
                                Opsional. Dipakai untuk menampilkan hitung mundur "Tiket dibuka dalam ..."
                                di dashboard customer selama event masih berstatus draft.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-3">
                        <Link
                            href="/admin/events"
                            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#E5D6D0] text-center text-sm font-semibold text-[#7A1F2B] hover:bg-[#FCF9F5]"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-[#5B0F18] text-[#F8F1E7] text-sm font-semibold hover:bg-[#7A1F2B] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? "Creating Event..." : "Create Event"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Input({ label, name, value, onChange, type = "text", placeholder = "", required = false }) {
    return (
        <div>
            <label htmlFor={name} className="text-sm font-semibold">{label}</label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="mt-2 w-full rounded-xl border border-[#E5D6D0] p-3 outline-none focus:border-[#7A1F2B]"
            />
        </div>
    );
}