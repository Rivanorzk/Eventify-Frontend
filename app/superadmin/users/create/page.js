// app/superadmin/users/create/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";

import { createUser } from "@/services/userService";

const ROLE_OPTIONS = [
    {
        value: "admin",
        label: "Admin / Organizer",
        hint: "Mengelola event, tiket, dan penjualannya sendiri.",
    },
    {
        value: "superadmin",
        label: "Superadmin",
        hint: "Akses penuh ke seluruh platform. Berikan dengan hati-hati.",
    },
];

const EMPTY_FORM = {
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "admin",
};

function validate(form) {
    const errors = {};

    if (form.username.trim().length < 3) {
        errors.username = "Username minimal 3 karakter";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        errors.email = "Format email tidak valid";
    }
    if (!/^[0-9+\-\s]{8,20}$/.test(form.phone.trim())) {
        errors.phone = "Nomor HP tidak valid (8-20 digit)";
    }
    if (form.password.length < 8) {
        errors.password = "Password minimal 8 karakter";
    }
    if (form.confirmPassword !== form.password) {
        errors.confirmPassword = "Konfirmasi password tidak sama";
    }

    return errors;
}

function Field({ label, error, hint, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#8C7777]">
                {label}
            </label>
            {children}
            {error ? (
                <p className="mt-1 text-xs text-[#B3261E]">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-[#8C7777]">{hint}</p>
            ) : null}
        </div>
    );
}

const inputClass = (hasError) =>
    `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#1E1E1E] outline-none transition placeholder:text-[#B5A5A5] focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/15 ${
        hasError ? "border-[#B3261E]" : "border-[#E5D6D0]"
    }`;

export default function CreateAdminPage() {
    const router = useRouter();

    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const setField = (name) => (e) => {
        setForm((prev) => ({ ...prev, [name]: e.target.value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        try {
            setSubmitting(true);
            await createUser({
                username: form.username.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password,
                role: form.role,
            });
            toast.success("Akun berhasil dibuat");
            router.push("/superadmin/users");
        } catch (err) {
            const message = err.message || "Gagal membuat akun";
            if (/email/i.test(message)) {
                setErrors((prev) => ({ ...prev, email: message }));
            }
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.role);

    return (
        <div className="mx-auto max-w-7xl">
            <Link
                href="/superadmin/users"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7A1F2B] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Users
            </Link>

            <div className="mb-6">
                <h1 className="flex items-center gap-2 text-xl font-bold text-[#1E1E1E]">
                    <UserPlus className="h-5 w-5 text-[#7A1F2B]" />
                    Tambah Admin / Organizer
                </h1>
                <p className="mt-1 text-sm text-[#8C7777]">
                    Buat akun baru untuk organizer atau staf platform. Akun langsung aktif dan bisa
                    login dengan email dan password di bawah.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-5 rounded-2xl border border-[#E5D6D0] bg-white p-6 shadow-sm"
            >
                <Field label="Role" hint={selectedRole?.hint}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {ROLE_OPTIONS.map((role) => {
                            const active = form.role === role.value;
                            return (
                                <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, role: role.value }))}
                                    aria-pressed={active}
                                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                        active
                                            ? "border-[#5B0F18] bg-[#5B0F18] text-white"
                                            : "border-[#E5D6D0] bg-white text-[#1E1E1E] hover:bg-[#F8F1E7]"
                                    }`}
                                >
                                    {role.label}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Username" error={errors.username}>
                        <input
                            type="text"
                            value={form.username}
                            onChange={setField("username")}
                            placeholder="mis. nama organizer"
                            autoComplete="off"
                            className={inputClass(errors.username)}
                        />
                    </Field>

                    <Field label="No. HP" error={errors.phone}>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={setField("phone")}
                            placeholder="08xxxxxxxxxx"
                            autoComplete="off"
                            className={inputClass(errors.phone)}
                        />
                    </Field>
                </div>

                <Field label="Email" error={errors.email}>
                    <input
                        type="email"
                        value={form.email}
                        onChange={setField("email")}
                        placeholder="organizer@email.com"
                        autoComplete="off"
                        className={inputClass(errors.email)}
                    />
                </Field>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Password" error={errors.password} hint="Minimal 8 karakter.">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={form.password}
                                onChange={setField("password")}
                                autoComplete="new-password"
                                className={`${inputClass(errors.password)} pr-11`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7777] hover:text-[#5B0F18]"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </Field>

                    <Field label="Konfirmasi Password" error={errors.confirmPassword}>
                        <input
                            type={showPassword ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={setField("confirmPassword")}
                            autoComplete="new-password"
                            className={inputClass(errors.confirmPassword)}
                        />
                    </Field>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[#E5D6D0] pt-5 sm:flex-row sm:justify-end">
                    <Link
                        href="/superadmin/users"
                        className="rounded-xl bg-[#F8F1E7] px-5 py-2.5 text-center text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD]"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4" />
                                Buat Akun
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
