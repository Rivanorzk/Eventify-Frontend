// services/systemService.js
import Cookies from "js-cookie";

// Sesuaikan dengan variabel env base URL API yang sudah kamu pakai di project.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getSystemStatus() {
    if (!API_URL) {
        throw new Error("NEXT_PUBLIC_API_URL belum diatur di environment frontend");
    }

    const res = await fetch(`${API_URL.replace(/\/$/, "")}/dashboard/system`, {
        headers: { Authorization: `Bearer ${Cookies.get("token") || ""}` },
        cache: "no-store",
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.success) {
        throw new Error(body?.message || `Gagal memuat status sistem (${res.status})`);
    }

    return body.data;
}