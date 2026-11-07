"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Ticket,
    Plus,
    Search,
    Pencil,
    Trash2,
} from "lucide-react";

import {
    getVouchers,
    deleteVoucher,
} from "@/services/voucherService";

export default function AdminVouchersPage() {
    const [vouchers, setVouchers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const loadVouchers = async () => {
        try {
            const response = await getVouchers();

            setVouchers(
                Array.isArray(response)
                    ? response
                    : []
            );
        } catch (error) {
            console.error("Failed to load vouchers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVouchers();
    }, []);

    const filteredVouchers = vouchers.filter(
        (voucher) =>
            voucher.title
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
            voucher.promo_code
                ?.toLowerCase()
                .includes(search.toLowerCase())
    );

    const formatDiscount = (voucher) => {
        if (voucher.discount_type === "percentage") {
            return `${voucher.discount_value}%`;
        }

        return `Rp ${Number(
            voucher.discount_value || 0
        ).toLocaleString("id-ID")}`;
    };

    // Voucher yang sudah pernah di-redeem hanya bisa dihapus kalau sudah
    // inactive (otomatis saat end_date lewat). Backend tetap memvalidasi.
    const canDelete = (voucher) =>
        Number(voucher.used_quota || 0) === 0 ||
        voucher.status === "inactive";

    const statusBadgeClass = (status) => {
        if (status === "active") return "bg-green-50 text-green-700";
        if (status === "inactive") return "bg-gray-100 text-gray-600";
        return "bg-[#F8F1E7] text-[#7A1F2B]"; // draft / lainnya
    };

    const handleDelete = async (voucher) => {
        if (!window.confirm("Delete this voucher?")) return;

        try {
            await deleteVoucher(voucher.id);

            setVouchers((current) =>
                current.filter((item) => item.id !== voucher.id)
            );
        } catch (error) {
            console.error("Failed to delete voucher:", error);
            alert(
                error?.response?.data?.message ||
                    "Failed to delete voucher."
            );
        }
    };

    return (
        <main className="min-h-screen bg-[#F8F1E7]">
            <div className="max-w-[1600px] mx-auto px-5 py-6 lg:px-8">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
                    <div>
                        <p className="text-sm text-[#8C7777]">
                            Management
                        </p>

                        <h1 className="mt-1 text-3xl font-bold text-[#1E1E1E]">
                            Vouchers
                        </h1>

                        <p className="mt-2 text-sm text-[#8C7777]">
                            Manage promotional vouchers.
                        </p>
                    </div>

                    <Link
                        href="/admin/vouchers/create"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Create Voucher
                    </Link>
                </div>

                <div className="bg-white border border-[#E5D6D0] rounded-2xl overflow-hidden text-black">

                    <div className="p-5 border-b border-[#E5D6D0]">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />

                            <input
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search voucher..."
                                className="w-full rounded-xl border border-[#E5D6D0] bg-[#FCF9F5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#7A1F2B]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-[#FCF9F5] border-b border-[#E5D6D0]">
                                    <th className="px-5 py-4 text-left text-xs uppercase text-[#8C7777]">
                                        Voucher
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs uppercase text-[#8C7777]">
                                        Promo Code
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs uppercase text-[#8C7777]">
                                        Discount
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs uppercase text-[#8C7777]">
                                        Quota
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs uppercase text-[#8C7777]">
                                        Status
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs uppercase text-[#8C7777]">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-[#F0E5DE]">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-sm text-[#8C7777]">
                                            Loading vouchers...
                                        </td>
                                    </tr>
                                ) : filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center">
                                            <Ticket className="w-8 h-8 mx-auto text-[#D8A7A7]" />

                                            <p className="mt-3 text-sm text-[#8C7777]">
                                                No vouchers found
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((voucher) => (
                                        <tr
                                            key={voucher.id}
                                            className="hover:bg-[#FCF9F5]"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#F8F1E7] flex items-center justify-center">
                                                        <Ticket className="w-5 h-5 text-[#7A1F2B]" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-semibold">
                                                            {voucher.title}
                                                        </p>

                                                        <p className="text-xs text-[#8C7777]">
                                                            {voucher.minimum_quantity} minimum
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <code className="rounded-lg bg-[#F8F1E7] px-3 py-1.5 text-xs font-semibold text-[#7A1F2B]">
                                                    {voucher.promo_code || "-"}
                                                </code>
                                            </td>

                                            <td className="px-5 py-4 text-sm font-semibold">
                                                {formatDiscount(voucher)}
                                            </td>

                                            <td className="px-5 py-4 text-sm">
                                                {voucher.used_quota || 0} /{" "}
                                                {voucher.quota || 0}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusBadgeClass(
                                                        voucher.status
                                                    )}`}
                                                >
                                                    {voucher.status || "-"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/vouchers/${voucher.id}/edit`}
                                                        className="w-9 h-9 rounded-lg border border-[#E5D6D0] flex items-center justify-center text-[#7A1F2B]"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(voucher)
                                                        }
                                                        disabled={!canDelete(voucher)}
                                                        title={
                                                            canDelete(voucher)
                                                                ? "Delete voucher"
                                                                : "Voucher sudah di-redeem. Bisa dihapus setelah berstatus inactive."
                                                        }
                                                        className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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