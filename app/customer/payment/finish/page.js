// app/customer/payment/finish/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

import { getMyOrders } from "@/services/orderService";
import { isAuthenticated } from "@/lib/auth";

export default function PaymentFinishPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [notFound, setNotFound] = useState(false);

    const invoiceNumber = searchParams.get("order_id");

    useEffect(() => {
        const redirect = async () => {
            if (!isAuthenticated()) {
                if (typeof window !== "undefined") {
                    localStorage.setItem(
                        "redirectAfterLogin",
                        window.location.pathname + window.location.search
                    );
                }
                router.replace("/login");
                return;
            }

            if (!invoiceNumber) {
                const lastOrderId = localStorage.getItem("lastOrderId");

                if (lastOrderId) {
                    router.replace(`/customer/payment/${lastOrderId}`);
                    return;
                }

                setNotFound(true);
                return;
            }

            try {
                const orders = await getMyOrders();
                console.log("invoiceNumber dari Midtrans:", invoiceNumber);
                console.log("daftar invoice_number di getMyOrders:", orders.map(o => o.invoice_number));

                const order = orders.find(
                    (o) => o.invoice_number === invoiceNumber
                );

                if (order) {
                    router.replace(`/customer/payment/${order.id}`);
                } else {
                    setNotFound(true);
                }
            } catch (err) {
                console.error("Error resolving order after payment:", err);
                setNotFound(true);
            }
        };

        redirect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoiceNumber]);

    if (notFound) {
        return (
            <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
                <CheckCircle2 className="h-14 w-14 text-[#1E7A4C]" />
                <h1 className="text-lg font-bold text-[#1E1E1E]">
                    Pembayaran sedang diproses
                </h1>
                <p className="text-sm text-[#8C7777]">
                    Status pesananmu akan diperbarui otomatis. Cek di riwayat
                    pesanan untuk melihat status terbaru.
                </p>
                <Link
                    href="/customer/orders"
                    className="mt-2 rounded-2xl bg-[#5B0F18] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                >
                    Lihat Riwayat Pesanan
                </Link>
            </div>
        );
    }

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#7A1F2B]" />
            <p className="text-sm text-[#8C7777]">Mengalihkan ke halaman pembayaran...</p>
        </div>
    );
}