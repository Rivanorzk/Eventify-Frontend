// services/redemptionService.js
//
// Mengikuti pola yang sama dengan services/userService.js dan
// services/dashboardService.js yang sudah ada di project ini.
//
// CATATAN: ganti "@/lib/axios" di bawah ini sesuai nama file instance
// axios yang sebenarnya kamu pakai di userService.js / dashboardService.js
// (kalau instance-nya sudah otomatis mengirim header Authorization dari
// cookie "token", tidak perlu diubah apa-apa lagi).
import api from "@/lib/api";

/**
 * Validasi & tandai satu tiket sebagai "used" berdasarkan kode
 * yang dibaca dari QR code pelanggan.
 * @param {string} ticketCode
 * @param {string} [notes]
 */
export async function redeemTicket(ticketCode, notes = "") {
    const res = await api.post("/redemptions", {
        ticket_code: ticketCode,
        notes,
    });
    return res.data.data;
}

/**
 * Ambil riwayat check-in terbaru (untuk panel "Riwayat Scan Terbaru").
 */
export async function getRedemptions() {
    const res = await api.get("/redemptions");
    return res.data.data;
}

export async function getRedemptionById(id) {
    const res = await api.get(`/redemptions/${id}`);
    return res.data.data;
}