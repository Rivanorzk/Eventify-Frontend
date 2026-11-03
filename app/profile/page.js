// app/profile/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    User,
    Mail,
    Phone,
    ShieldCheck,
    CalendarDays,
    Edit3,
    LockKeyhole,
    Camera,
    CheckCircle,
    XCircle,
    ArrowLeft,
    LogOut,
    Image as ImageIcon,
    BadgeCheck,
    Shield,
    Activity,
    QrCode,
    LayoutDashboard,
} from "lucide-react";

import { getProfile, uploadAvatar, uploadCover } from "@/services/userService";
import useAuth from "@/hooks/useAuth";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import EditProfileModal from "@/components/editProfileModal";
import { toast } from "react-hot-toast";

const MONTHS_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatJoinDate(date) {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return `${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFullDate(date) {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ProfilePage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    const [uploadingCover, setUploadingCover] = useState(false);
    const coverInputRef = useRef(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getProfile();
            setProfile(data);
        } catch (err) {
            console.error("Failed to load profile:", err);
            setError(err?.response?.data?.message || "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size must be less than 2MB");
            return;
        }
        try {
            setUploadingAvatar(true);
            const data = await uploadAvatar(file);
            setProfile({ ...profile, profile_image: data.profile_image });
            toast.success("Profile photo updated!");
        } catch (error) {
            console.error("Upload avatar error:", error);
            toast.error(error?.response?.data?.message || "Failed to upload photo");
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };

    const handleCoverUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 4 * 1024 * 1024) {
            toast.error("Image size must be less than 4MB");
            return;
        }
        try {
            setUploadingCover(true);
            const data = await uploadCover(file);
            setProfile({ ...profile, cover_image: data.cover_image });
            toast.success("Cover photo updated!");
        } catch (error) {
            console.error("Upload cover error:", error);
            toast.error(error?.response?.data?.message || "Failed to upload cover photo");
        } finally {
            setUploadingCover(false);
            e.target.value = "";
        }
    };

    const handleUpdateProfile = (updatedData) => {
        setProfile({ ...profile, ...updatedData });
    };

    const getDashboardUrl = () => {
        const role = profile?.role?.toLowerCase();
        switch (role) {
            case "admin": return "/admin/dashboard";
            case "superadmin": return "/superadmin/dashboard";
            default: return "/customer/dashboard";
        }
    };

    const getInitial = () => profile?.username?.charAt(0)?.toUpperCase() || "U";

    const getRoleLabel = (role) => {
        switch (role) {
            case "superadmin": return "Super Admin";
            case "admin": return "Administrator";
            default: return "Customer";
        }
    };

    const getRoleBadgeClasses = (role) => {
        switch (role) {
            case "superadmin": return "bg-[#3A0810] text-[#F3D9A4]";
            case "admin": return "bg-[#5B0F18] text-[#F3D9A4]";
            default: return "bg-[#F3E4E4] text-[#7A1F2B]";
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to logout");
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="mt-8 flex justify-center">
                    <LoadingSpinner text="Loading profile..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="mt-8">
                    <EmptyState title="Something went wrong" description={error} />
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const roleLabel = getRoleLabel(profile.role);
    const roleBadge = getRoleBadgeClasses(profile.role);
    const isOnline = profile.status === "online";

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-12">

            {/* ============ BANNER & PROFILE HEADER ============ */}
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-sm">

            {/* Cover */}
            <div className="group relative h-56 w-full overflow-hidden bg-[#F8F1E7] sm:h-72">
                {profile.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={profile.cover_image}
                        alt="Cover"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                ) : (
                    // Fallback kalau belum ada cover
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F8F1E7] to-[#F3E4E4]">
                        <div className="flex flex-col items-center gap-2 text-[#8C7777]">
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-xs font-semibold">Belum ada cover</span>
                        </div>
                    </div>
                )}

                {/* Action chips — ditambahkan background blur biar tetap terbaca di image apapun */}
                <div className="absolute right-4 top-4 z-10 flex items-center gap-2 md:right-6 md:top-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3D9A4]/95 px-3.5 py-1.5 text-xs font-semibold text-[#5B0F18] shadow-sm backdrop-blur-md">
                        <BadgeCheck className="h-4 w-4" />
                        {profile.is_active ? "Akun Terverifikasi" : "Belum Terverifikasi"}
                    </span>
                    <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#1E1E1E] shadow-sm backdrop-blur-md transition-all hover:bg-white disabled:opacity-60"
                    >
                        {uploadingCover ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#5B0F18] border-t-transparent" />
                        ) : (
                            <ImageIcon className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Ubah Cover</span>
                    </button>
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                    />
                </div>
            </div>
                {/* Profile Intro */}
                <div className="relative bg-white px-6 pb-6">
                    <div className="-mt-16 flex flex-col gap-5 md:flex-row md:items-end md:justify-between sm:-mt-20">

                        <div className="flex min-w-0 flex-1 flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
                            {/* Avatar */}
                            <div className="group relative shrink-0">
                                {profile.profile_image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={profile.profile_image}
                                        alt={profile.username}
                                        className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl sm:h-32 sm:w-32"
                                    />
                                ) : (
                                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-[#F3D9A4] text-4xl font-bold text-[#5B0F18] shadow-xl sm:h-32 sm:w-32 sm:text-5xl">
                                        {getInitial()}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                                >
                                    {uploadingAvatar ? (
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Camera className="h-6 w-6 text-white" />
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* Identity */}
                            <div className="min-w-0 flex-1 pb-1">
                                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                    <h1 className="break-words text-2xl font-bold tracking-tight text-[#1E1E1E] sm:text-3xl">
                                        {profile.username}
                                    </h1>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleBadge}`}>
                                        <Shield className="h-3 w-3" />
                                        {roleLabel.toUpperCase()}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-[#8C7777]">
                                    @{profile.username}
                                    <span className="mx-1.5">•</span>
                                    Bergabung {formatJoinDate(profile.created_at)}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F1E7] px-2.5 py-1 text-[11px] font-semibold text-[#8C7777]">
                                        <ShieldCheck className="h-3.5 w-3.5 text-[#B4841F]" />
                                        {profile.is_active ? "Akun Aktif" : "Akun Nonaktif"}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F1E7] px-2.5 py-1 text-[11px] font-semibold text-[#5B0F18]">
                                        <User className="h-3.5 w-3.5" />
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex w-full shrink-0 flex-col sm:w-auto sm:flex-row md:pb-2">
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(true)}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#7A1F2B] hover:shadow-lg sm:w-auto"
                            >
                                <Edit3 size={18} />
                                Edit Profil
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ STATS TILES ============ */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatTile
                    label="Role Akun"
                    value={roleLabel}
                    sub={profile.role === "admin" ? "Event Organizer" : profile.role === "superadmin" ? "Platform Owner" : "Customer"}
                    icon={Shield}
                    accent="bg-[#F3D9A4] text-[#5B0F18]"
                />
                <StatTile
                    label="Status Akun"
                    value={profile.is_active ? "Aktif" : "Nonaktif"}
                    sub={profile.is_active ? "Dapat bertransaksi" : "Dibatasi"}
                    icon={CheckCircle}
                    accent="bg-[#E4F3EA] text-[#1E7A4C]"
                />
                <StatTile
                    label="Status Sesi"
                    value={isOnline ? "Online" : "Offline"}
                    sub={isOnline ? "Sedang aktif" : "Tidak ada sesi"}
                    icon={Activity}
                    accent="bg-[#F3E4E4] text-[#7A1F2B]"
                />
                <StatTile
                    label="Terdaftar"
                    value={profile.created_at ? new Date(profile.created_at).getFullYear() : "-"}
                    sub={formatJoinDate(profile.created_at)}
                    icon={CalendarDays}
                    accent="bg-[#5B0F18] text-[#F3D9A4]"
                />
            </div>

            {/* ============ MAIN CONTENT ============ */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                {/* LEFT: Account Info */}
                <div className="space-y-6 lg:col-span-8">
                    <div className="rounded-3xl border border-[#E5D6D0] bg-white p-6 shadow-sm sm:p-8">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8F1E7] text-[#5B0F18]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#1E1E1E] sm:text-xl">
                                        Informasi Akun
                                    </h2>
                                    <p className="text-xs text-[#8C7777] sm:text-sm">
                                        Data pengguna yang terdaftar di platform Eventify.
                                    </p>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1 self-start rounded-full bg-[#F3D9A4]/70 px-3 py-1 text-[11px] font-bold text-[#5B0F18] sm:self-auto">
                                <LockKeyhole size={12} />
                                Data Terkunci Aman
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InfoItem icon={User} label="Username" value={profile.username} verified />
                            <InfoItem icon={Mail} label="Alamat Email" value={profile.email} verified />
                            <InfoItem
                                icon={Phone}
                                label="Nomor Telepon"
                                value={profile.phone || "-"}
                                extra="OTP Terverifikasi"
                            />
                            <InfoItem
                                icon={ShieldCheck}
                                label="Role Akun"
                                value={roleLabel}
                                badge={profile.role?.toUpperCase()}
                            />
                            <InfoItem
                                icon={CheckCircle}
                                label="Status Akun"
                                value={profile.is_active ? "Aktif" : "Nonaktif"}
                            />
                            <InfoItem
                                icon={CalendarDays}
                                label="Terdaftar Sejak"
                                value={formatFullDate(profile.created_at)}
                            />
                        </div>

                        {/* Anti-calo note */}
                        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#F8F1E7] p-4">
                            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#5B0F18]" />
                            <div>
                                <p className="text-sm font-bold text-[#1E1E1E]">
                                    Validasi Identitas &amp; Regulasi Tiket Anti-Calo
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-[#8C7777]">
                                    Tiket konser Eventify tertaut secara permanen dengan akun Anda. Pergantian nama tiket hanya dapat diproses melalui formulir surat kuasa resmi maksimal H-3 sebelum konser berlangsung.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="rounded-3xl border border-[#E5D6D0] bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F7E8E4] text-[#7A1F2B]">
                                <LockKeyhole size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-[#1E1E1E]">Keamanan Akun</h3>
                                <p className="mt-1 text-sm leading-relaxed text-[#8C7777]">
                                    Gunakan tombol <span className="font-semibold text-[#5B0F18]">Edit Profil</span> untuk
                                    memperbarui kata sandi dan data pribadi Anda secara aman.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(true)}
                                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#F8F1E7] px-4 text-xs font-bold text-[#5B0F18] transition-colors hover:bg-[#F3E9DD]"
                                >
                                    <Edit3 size={14} />
                                    Kelola Keamanan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Digital Pass, Status, Logout */}
                <div className="space-y-6 lg:col-span-4">

                    {/* Digital Pass */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B0F18] via-[#581825] to-[#3A0810] p-6 text-white shadow-xl">
                        <div className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 rounded-full bg-[#F3D9A4]/10 blur-2xl" />
                        <div className="pointer-events-none absolute right-4 top-4 select-none text-5xl font-bold text-white/10">
                            {profile.role === "superadmin" ? "SA" : profile.role === "admin" ? "EO" : "MEM"}
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3D9A4] text-xs font-bold text-[#5B0F18]">
                                    E
                                </div>
                                <span className="text-sm font-extrabold tracking-wider text-[#F3D9A4]">
                                    EVENTIFY ID
                                </span>
                            </div>
                            <span className="rounded-full bg-[#B4841F] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#F3D9A4]">
                                {profile.role?.toUpperCase() || "MEMBER"}
                            </span>
                        </div>

                        <div className="relative z-10 mt-8 flex items-end justify-between">
                            <div className="min-w-0">
                                <span className="text-[10px] uppercase tracking-wide text-white/60">
                                    ID Pengguna
                                </span>
                                <p className="mt-0.5 truncate font-mono text-base font-bold tracking-widest">
                                    EVT-{String(profile.id || "00000").padStart(5, "0")}
                                </p>
                                <p className="mt-2 truncate text-sm text-[#F3D9A4]">
                                    {profile.username}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-center rounded-xl bg-white p-2 text-[#1E1E1E] shadow-md">
                                <QrCode size={34} />
                                <span className="mt-0.5 font-mono text-[8px] uppercase tracking-tighter">
                                    Fast-Pass
                                </span>
                            </div>
                        </div>

                        <div className="relative my-5">
                            <div className="w-full border-b border-dashed border-white/25" />
                        </div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-white/60">Member Sejak</span>
                                <p className="text-base font-bold text-[#F3D9A4]">
                                    {formatJoinDate(profile.created_at)}
                                </p>
                            </div>
                            <span className="rounded-xl bg-[#F3D9A4] px-3 py-1.5 text-[11px] font-bold text-[#5B0F18]">
                                {roleLabel}
                            </span>
                        </div>
                    </div>

                    {/* Status Overview */}
                    <div className="rounded-3xl border border-[#E5D6D0] bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-base font-bold text-[#1E1E1E]">Ringkasan Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-2xl bg-[#FCF8F4] p-3.5 transition-colors hover:bg-[#F8F1E7]">
                                <span className="text-xs font-semibold text-[#9A8585]">Status Akun</span>
                                <div className="flex items-center gap-2">
                                    {profile.is_active ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="text-xs font-bold text-[#1E1E1E]">
                                        {profile.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-[#FCF8F4] p-3.5 transition-colors hover:bg-[#F8F1E7]">
                                <span className="text-xs font-semibold text-[#9A8585]">Online Status</span>
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${isOnline ? "animate-pulse bg-green-500" : "bg-gray-400"}`} />
                                    <span className="text-xs font-bold capitalize text-[#1E1E1E]">
                                        {profile.status || "-"}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl bg-[#FCF8F4] p-3.5 transition-colors hover:bg-[#F8F1E7]">
                                <span className="text-xs font-semibold text-[#9A8585]">Role</span>
                                <span className="text-xs font-bold text-[#5B0F18]">
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Logout */}
                    <div className="rounded-3xl border border-red-100 bg-[#FFF7F7] p-6 shadow-sm">
                        <h3 className="font-bold text-red-950">Keluar Akun</h3>
                        <p className="mb-4 mt-1 text-xs leading-relaxed text-red-800/80">
                            Akhiri sesi Anda dan keluar dengan aman dari perangkat ini.
                        </p>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow"
                        >
                            <LogOut size={18} />
                            Logout Securely
                        </button>
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                profile={profile}
                onUpdate={handleUpdateProfile}
            />
        </div>
    );
}

// ============================================
// Stat Tile
// ============================================
function StatTile({ label, value, sub, icon: Icon, accent }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-[#E5D6D0] bg-white p-5 shadow-sm">
            <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A8585]">
                    {label}
                </span>
                <span className="mt-1 truncate text-lg font-bold text-[#1E1E1E] sm:text-xl">
                    {value}
                </span>
                <span className="mt-0.5 truncate text-[11px] font-semibold text-[#8C7777]">
                    {sub}
                </span>
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                <Icon size={20} />
            </div>
        </div>
    );
}

// ============================================
// Info Item
// ============================================
function InfoItem({ icon: Icon, label, value, verified, extra, badge }) {
    return (
        <div className="group flex items-start gap-4 rounded-2xl border border-[#EDE1DB] bg-[#FAFAF9] p-4 transition-all hover:border-[#E5D6D0] hover:bg-white hover:shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8F0EB] text-[#7A1F2B] transition-transform group-hover:scale-105">
                <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A8585]">
                    {label}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#1E1E1E]">
                        {value || "-"}
                    </p>
                    {verified && <CheckCircle size={14} className="shrink-0 text-[#1E7A4C]" />}
                    {extra && (
                        <span className="shrink-0 text-[10px] font-bold text-[#B4841F]">
                            {extra}
                        </span>
                    )}
                    {badge && (
                        <span className="shrink-0 rounded bg-[#F8F1E7] px-2 py-0.5 text-[10px] font-bold text-[#8C7777]">
                            {badge}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}