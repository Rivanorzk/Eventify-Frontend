// services/settingsService.js
import Cookies from "js-cookie";

// Sesuaikan dengan cara userService/dashboardService Anda memanggil API.
// Kalau di sana sudah ada instance axios atau helper fetch, ganti fungsi
// request() di bawah supaya memakai helper itu (isi fungsi lainnya tetap).
const API_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/$/, "");

async function request(path, options = {}) {
    const token = Cookies.get("token");

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        cache: "no-store",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    let body = null;
    try {
        body = await res.json();
    } catch {
        // respons bukan JSON
    }

    if (!res.ok || body?.success === false) {
        throw new Error(body?.message || `Permintaan gagal (${res.status})`);
    }

    return body?.data ?? null;
}

// -> { service_fee_percent, updated_at, updated_by }
export const getServiceFeeSetting = () => request("/settings/service-fee");

// Mengubah biaya layanan (persen dari harga tiket, 0 - 30).
export const updateServiceFeeSetting = (serviceFeePercent) =>
    request("/settings/service-fee", {
        method: "PUT",
        body: JSON.stringify({ service_fee_percent: serviceFeePercent }),
    });