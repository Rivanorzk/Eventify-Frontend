// services/voucherService.js
import api from "@/lib/api";

// =====================================================================
// Customer
// =====================================================================

// Voucher yang dimiliki customer (halaman "Voucher Saya").
// Tiap item punya `id` = user_voucher_id dan `state`:
// available | upcoming | used | expired | inactive
export const getMyVouchers = async () => {
    const response = await api.get("/vouchers/my");
    return response.data.data;
};

// Voucher yang boleh dipilih di checkout untuk satu event:
// milik customer, belum terpakai, masih berlaku, dan event-nya sama.
export const getAvailableVouchers = async (eventId) => {
    const response = await api.get("/vouchers/available", {
        params: { event_id: eventId },
    });

    return response.data.data;
};

// Tukar kode voucher (1 kode hanya bisa di-redeem 1 kali per customer).
export const redeemVoucher = async (promoCode) => {
    const response = await api.post("/vouchers/redeem", {
        promo_code: promoCode,
    });

    return response.data.data;
};

export const validateVoucher = async ({
    userVoucherId,
    eventId,
    totalTicket = 1,
}) => {
    const response = await api.post("/vouchers/validate", {
        user_voucher_id: userVoucherId,
        event_id: eventId,
        total_ticket: totalTicket,
    });

    return response.data.data;
};

// =====================================================================
// Admin
// =====================================================================

export const getVouchers = async () => {
    const response = await api.get("/vouchers");
    return response.data.data;
};

export const getVoucherById = async (id) => {
    const response = await api.get(`/vouchers/${id}`);
    return response.data.data;
};

// Daftar customer yang sudah meredeem voucher tertentu.
export const getVoucherRedemptions = async (id) => {
    const response = await api.get(`/vouchers/${id}/redemptions`);
    return response.data.data;
};

export const createVoucher = async (data) => {
    const response = await api.post("/vouchers", data);
    return response.data.data;
};

export const updateVoucher = async (id, data) => {
    const response = await api.put(`/vouchers/${id}`, data);
    return response.data.data;
};

export const deleteVoucher = async (id) => {
    const response = await api.delete(`/vouchers/${id}`);
    return response.data.data;
};