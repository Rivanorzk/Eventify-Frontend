// app/superadmin/settings/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
    ArrowLeft,
    CheckCircle2,
    Info,
    Loader2,
    Percent,
    RotateCcw,
    Save,
    Shield,
} from "lucide-react";

import { getProfile } from "@/services/userService";
import {
    getServiceFeeSetting,
    updateServiceFeeSetting,
} from "@/services/settingService";

// Harus sama dengan batas di backend (settingsService.MAX_SERVICE_FEE_PERCENT).
const MAX_PERCENT = 30;
const PRESETS = [0, 2.5, 5, 7.5, 10];

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ---------- Formatter ----------
function formatRupiah(value) {
    const n = Number(value);
    if (value === null || value === undefined || Number.isNaN(n)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR", minimumFractionDigits: 0,
    }).format(n);
}

function formatPercent(value) {
    return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value) || 0)}%`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm}`;
}

// Angka dari input teks; kosong dianggap 0 (dipakai simulator).
function toNumber(raw) {
    const n = Number(String(raw ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

// ---------- Validasi persentase ----------
function validatePercent(raw) {
    const text = String(raw ?? "").trim().replace(",", ".");

    if (text === "") return { ok: false, message: "Persentase wajib diisi" };
    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        return { ok: false, message: "Isi angka 0 - 30, maksimal 2 angka di belakang koma" };
    }

    const value = Number(text);
    if (value > MAX_PERCENT) {
        return { ok: false, message: `Biaya layanan maksimal ${MAX_PERCENT}%` };
    }

    return { ok: true, value };
}

// Rumus sama dengan backend: dari harga tiket setelah voucher, dibulatkan ke rupiah.
function calculateFee(ticketPrice, discount, percent) {
    const base = Math.max(0, ticketPrice - Math.min(discount, ticketPrice));
    const fee = Math.round((base * percent) / 100);
    return { base, fee, total: base + fee };
}

function Skeleton({ className }) {
    return <div className={`animate-pulse rounded-2xl bg-white/60 ${className}`} />;
}

export default function SuperadminSettingsPage() {
    const router = useRouter();

    const [profile, setProfile] = useState(null);
    const [setting, setSetting] = useState(null); // data dari server

    const [input, setInput] = useState("");
    const [confirming, setConfirming] = useState(false);

    const [samplePrice, setSamplePrice] = useState("100000");
    const [sampleDiscount, setSampleDiscount] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    // ---------- Muat data + pastikan role superadmin ----------
    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);

                const [profileRes, settingRes] = await Promise.all([
                    getProfile(),
                    getServiceFeeSetting(),
                ]);

                if (cancelled) return;

                const role = (profileRes?.role || "").toLowerCase();
                if (role !== "superadmin") {
                    router.replace("/admin/dashboard");
                    return;
                }

                setProfile(profileRes);
                setSetting(settingRes);
                setInput(String(Number(settingRes?.service_fee_percent ?? 0)));
            } catch (err) {
                if (!cancelled) setError(err.message || "Gagal memuat pengaturan");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [router]);

    // Banner sukses hilang otomatis.
    useEffect(() => {
        if (!notice) return;
        const id = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(id);
    }, [notice]);

    const savedPercent = Number(setting?.service_fee_percent ?? 0);
    const validation = useMemo(() => validatePercent(input), [input]);
    const dirty = validation.ok && validation.value !== savedPercent;

    // Persentase untuk simulator: pakai yang sedang diketik kalau valid.
    const previewPercent = validation.ok ? validation.value : savedPercent;
    const preview = calculateFee(
        toNumber(samplePrice),
        toNumber(sampleDiscount),
        previewPercent
    );

    // ---------- Aksi ----------
    function handleSubmit(e) {
        e.preventDefault();
        if (!validation.ok || !dirty || saving) return;
        setError(null);
        setConfirming(true);
    }

    function handleReset() {
        setInput(String(savedPercent));
        setConfirming(false);
        setError(null);
    }

    async function handleSave() {
        if (!validation.ok || saving) return;

        try {
            setSaving(true);
            setError(null);

            const updated = await updateServiceFeeSetting(validation.value);

            setSetting(updated);
            setInput(String(Number(updated?.service_fee_percent ?? validation.value)));
            setConfirming(false);
            setNotice(
                `Biaya layanan diperbarui menjadi ${formatPercent(updated?.service_fee_percent ?? validation.value)}.`
            );
        } catch (err) {
            setConfirming(false);
            setError(err.message || "Gagal menyimpan pengaturan");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <div className="mx-auto max-w-5xl px-6 py-6">
                {error && (
                    <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        {error}
                    </div>
                )}

                {notice && (
                    <div className="mb-6 flex items-center gap-2 rounded-2xl border border-[#BFE3CF] bg-[#E4F3EA] px-4 py-3 text-sm font-semibold text-[#1E7A4C]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {notice}
                    </div>
                )}

                {/* Hero */}
                <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#3A0810] via-[#5B0F18] to-[#7A1F2B] p-8 text-white">
                    <Link
                        href="/superadmin/dashboard"
                        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Kembali ke dashboard
                    </Link>
                    <div>
                        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#F3D9A4]">
                            <Shield className="h-3.5 w-3.5" />
                            {loading && !profile ? "Memuat..." : `${profile?.username || "-"} • Superadmin`}
                        </span>
                        <h1 className="text-2xl font-bold sm:text-3xl">Pengaturan Platform</h1>
                        <p className="mt-2 max-w-lg text-sm text-white/70">
                            Atur biaya layanan yang dibebankan ke customer di atas harga tiket.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-6 lg:grid-cols-5">
                        <Skeleton className="h-96 lg:col-span-3" />
                        <Skeleton className="h-96 lg:col-span-2" />
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-5">
                        {/* Form biaya layanan */}
                        <form
                            onSubmit={handleSubmit}
                            className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-3"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                    <Percent className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#1E1E1E]">Biaya Layanan</p>
                                    <p className="mt-1 text-xs text-[#8C7777]">
                                        Persentase dari harga tiket yang ditanggung customer saat membeli.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <label
                                    htmlFor="service-fee-percent"
                                    className="text-xs font-bold uppercase tracking-wide text-[#8C7777]"
                                >
                                    Persentase biaya layanan
                                </label>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="relative w-40">
                                        <input
                                            id="service-fee-percent"
                                            type="text"
                                            inputMode="decimal"
                                            value={input}
                                            onChange={(e) => {
                                                setInput(e.target.value);
                                                setConfirming(false);
                                            }}
                                            disabled={saving}
                                            className={`w-full rounded-xl border bg-[#F8F1E7] py-3 pl-4 pr-10 text-lg font-bold text-[#1E1E1E] outline-none transition focus:border-[#5B0F18] ${
                                                validation.ok ? "border-transparent" : "border-[#B3261E]"
                                            }`}
                                        />
                                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8C7777]">
                                            %
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESETS.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                disabled={saving}
                                                onClick={() => {
                                                    setInput(String(p));
                                                    setConfirming(false);
                                                }}
                                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                                    validation.ok && validation.value === p
                                                        ? "bg-[#5B0F18] text-white"
                                                        : "bg-[#F8F1E7] text-[#5B0F18] hover:bg-[#F3D9A4]"
                                                }`}
                                            >
                                                {formatPercent(p)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {!validation.ok ? (
                                    <p className="mt-2 text-xs font-semibold text-[#B3261E]">{validation.message}</p>
                                ) : (
                                    <p className="mt-2 text-xs text-[#8C7777]">
                                        Isi 0 untuk menonaktifkan biaya layanan. Maksimal {MAX_PERCENT}%.
                                    </p>
                                )}
                            </div>

                            <div className="mt-6 rounded-xl bg-[#F8F1E7] p-4 text-xs text-[#8C7777]">
                                <p>
                                    Nilai saat ini:{" "}
                                    <span className="font-bold text-[#1E1E1E]">{formatPercent(savedPercent)}</span>
                                </p>
                                <p className="mt-1">
                                    Terakhir diubah:{" "}
                                    <span className="font-semibold text-[#1E1E1E]">
                                        {setting?.updated_at
                                            ? `${formatDateTime(setting.updated_at)}${setting.updated_by ? ` oleh ${setting.updated_by}` : ""}`
                                            : "Belum pernah diubah"}
                                    </span>
                                </p>
                            </div>

                            {confirming && dirty && (
                                <div className="mt-6 rounded-xl border border-[#F3D9A4] bg-[#FDF3D8] p-4 text-sm text-[#7A5A12]">
                                    <p className="font-bold">Konfirmasi perubahan</p>
                                    <p className="mt-1 text-xs">
                                        Biaya layanan akan berubah dari{" "}
                                        <span className="font-bold">{formatPercent(savedPercent)}</span> menjadi{" "}
                                        <span className="font-bold">{formatPercent(validation.value)}</span>. Berlaku
                                        untuk order baru; order yang sudah dibuat tidak berubah.
                                    </p>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#5B0F18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B] disabled:opacity-60"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                            Ya, simpan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirming(false)}
                                            disabled={saving}
                                            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#5B0F18] transition hover:bg-[#F8F1E7]"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!confirming && (
                                <div className="mt-6 flex flex-wrap items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={!validation.ok || !dirty || saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#5B0F18] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Save className="h-4 w-4" />
                                        Simpan Perubahan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        disabled={!dirty || saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#F8F1E7] px-4 py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Batalkan
                                    </button>
                                </div>
                            )}
                        </form>

                        {/* Simulator */}
                        <div className="space-y-6 lg:col-span-2">
                            <div className="rounded-2xl bg-white p-6 shadow-sm">
                                <p className="font-bold text-[#1E1E1E]">Simulasi Harga</p>
                                <p className="mt-1 text-xs text-[#8C7777]">
                                    Lihat berapa yang dibayar customer dengan persentase{" "}
                                    <span className="font-bold text-[#5B0F18]">{formatPercent(previewPercent)}</span>.
                                </p>

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label htmlFor="sample-price" className="text-[10px] font-bold uppercase tracking-wide text-[#8C7777]">
                                            Harga tiket (Rp)
                                        </label>
                                        <input
                                            id="sample-price"
                                            type="text"
                                            inputMode="numeric"
                                            value={samplePrice}
                                            onChange={(e) => setSamplePrice(e.target.value.replace(/[^\d]/g, ""))}
                                            className="mt-1 w-full rounded-xl bg-[#F8F1E7] px-4 py-2.5 text-sm font-semibold text-[#1E1E1E] outline-none focus:ring-2 focus:ring-[#5B0F18]/30"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="sample-discount" className="text-[10px] font-bold uppercase tracking-wide text-[#8C7777]">
                                            Diskon voucher (Rp, opsional)
                                        </label>
                                        <input
                                            id="sample-discount"
                                            type="text"
                                            inputMode="numeric"
                                            value={sampleDiscount}
                                            onChange={(e) => setSampleDiscount(e.target.value.replace(/[^\d]/g, ""))}
                                            placeholder="0"
                                            className="mt-1 w-full rounded-xl bg-[#F8F1E7] px-4 py-2.5 text-sm font-semibold text-[#1E1E1E] outline-none placeholder:text-[#8C7777]/60 focus:ring-2 focus:ring-[#5B0F18]/30"
                                        />
                                    </div>
                                </div>

                                <dl className="mt-5 space-y-2 border-t border-[#F0EDED] pt-4 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-[#8C7777]">Harga tiket (setelah voucher)</dt>
                                        <dd className="font-semibold text-[#1E1E1E]">{formatRupiah(preview.base)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-[#8C7777]">Biaya layanan ({formatPercent(previewPercent)})</dt>
                                        <dd className="font-semibold text-[#B4841F]">{formatRupiah(preview.fee)}</dd>
                                    </div>
                                    <div className="flex justify-between border-t border-[#F0EDED] pt-2">
                                        <dt className="font-bold text-[#1E1E1E]">Total dibayar customer</dt>
                                        <dd className="font-bold text-[#5B0F18]">{formatRupiah(preview.total)}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="rounded-2xl bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 text-[#5B0F18]">
                                    <Info className="h-4 w-4" />
                                    <p className="text-sm font-bold">Cara kerja</p>
                                </div>
                                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-[#8C7777]">
                                    <li>Berlaku untuk order baru; order lama tetap memakai persentase saat dibuat.</li>
                                    <li>Dihitung dari harga tiket setelah diskon voucher.</li>
                                    <li>Hasilnya dibulatkan ke rupiah terdekat.</li>
                                    <li>Seluruh biaya layanan tercatat sebagai pendapatan platform di dashboard.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}