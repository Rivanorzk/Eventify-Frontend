import api from "@/lib/api";

export const getBenefitsByCategory = async (eventTicketCategoryId) => {
    const { data } = await api.get(`/event-ticket-benefits/category/${eventTicketCategoryId}`);
    return data.data;
};

export const createTicketBenefit = async (payload) => {
    const { data } = await api.post("/event-ticket-benefits", payload);
    return data.data;
};

export const updateTicketBenefit = async (id, payload) => {
    const { data } = await api.put(`/event-ticket-benefits/${id}`, payload);
    return data.data;
};

export const deleteTicketBenefit = async (id) => {
    const { data } = await api.delete(`/event-ticket-benefits/${id}`);
    return data;
};