// app/superadmin/users/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import {
    deleteUser,
    getUsers,
    updateUserRole,
    updateStatus,
} from "@/services/userService";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";

const ROLE_OPTIONS = ["customer", "admin", "superadmin"];

const ROLE_BADGES = {
    customer: "bg-[#EDEDED] text-[#737373]",
    admin: "bg-[#FDF3D8] text-[#B4841F]",
    superadmin: "bg-[#F3E4E4] text-[#B3261E]",
};

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            toast.error(err.message || "Gagal memuat user");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleRoleChange = async (user, newRole) => {
        if (newRole === user.role) return;

        if (!confirm(`Ubah role "${user.username}" dari ${user.role} menjadi ${newRole}?`)) {
            return;
        }

        try {
            setUpdatingId(user.id);
            await updateUserRole(user.id, newRole);
            toast.success("Role berhasil diperbarui");
            setUsers((prev) =>
                prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
            );
        } catch (err) {
            toast.error(err.message || "Gagal mengubah role");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleToggleActive = async (user) => {
        const nextActive = !user.is_active;

        try {
            setUpdatingId(user.id);
            await updateStatus(
                user.id,
                nextActive ? "active" : "inactive",
                nextActive
            );
            toast.success(
                nextActive ? "User diaktifkan kembali" : "User dinonaktifkan"
            );
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === user.id
                        ? { ...u, is_active: nextActive, status: nextActive ? "active" : "inactive" }
                        : u
                )
            );
        } catch (err) {
            toast.error(err.message || "Gagal mengubah status user");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Hapus user "${user.username}"? Aksi ini permanen.`)) return;

        try {
            await deleteUser(user.id);
            toast.success("User berhasil dihapus");
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err) {
            toast.error(err.message || "Gagal menghapus user");
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-bold text-[#1E1E1E]">
                        <ShieldCheck className="h-5 w-5 text-[#7A1F2B]" />
                        Users
                    </h1>
                    <p className="mt-1 text-sm text-[#8C7777]">
                        {users.length} user terdaftar. Ubah role, aktif/nonaktifkan, atau hapus akun.
                    </p>
                </div>
                <Link
                    href="/superadmin/users/create"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5B0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                >
                    <Plus className="h-4 w-4" />
                    Tambah Admin
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner text="Memuat user..." />
                </div>
            ) : users.length === 0 ? (
                <EmptyState title="Belum ada user" description="Belum ada user yang terdaftar." />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E5D6D0] bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#F8F1E7] text-xs uppercase tracking-wide text-[#8C7777]">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">User</th>
                                    <th className="px-5 py-3 font-semibold">Role</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 text-right font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5D6D0]">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-5 py-3">
                                            <p className="font-medium text-[#1E1E1E]">{user.username}</p>
                                            <p className="text-xs text-[#8C7777]">{user.email}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <select
                                                value={user.role}
                                                disabled={updatingId === user.id}
                                                onChange={(e) => handleRoleChange(user, e.target.value)}
                                                className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none disabled:opacity-60 ${
                                                    ROLE_BADGES[user.role] || "bg-[#F8F1E7] text-[#8C7777]"
                                                }`}
                                            >
                                                {ROLE_OPTIONS.map((role) => (
                                                    <option key={role} value={role}>
                                                        {role}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                disabled={updatingId === user.id}
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                                                    user.is_active
                                                        ? "bg-[#E4F3EA] text-[#1E7A4C] hover:bg-[#d5ecdf]"
                                                        : "bg-[#F3E4E4] text-[#B3261E] hover:bg-[#efd6d6]"
                                                }`}
                                            >
                                                {user.is_active ? "Aktif" : "Nonaktif"}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8C7777] transition hover:bg-[#F3E4E4] hover:text-[#B3261E]"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}