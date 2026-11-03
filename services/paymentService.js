// services/paymentService.js
import api from "@/lib/api";

export const createPayment = async (orderId) => {
    const { data } = await api.post("/payments", { order_id: orderId });
    return data.data;
};

export const getPayment = async (orderId) => {
    const { data } = await api.get(`/payments/order/${orderId}`);
    return data.data;
};

export const checkPaymentStatus = async (orderId) => {
    const { data } = await api.get(`/payments/order/${orderId}/check-status`);
    return data.data;
};