import api from "@/lib/api";

export const getRulesByCategory = async (eventTicketCategoryId) => {
    const { data } = await api.get(`/event-ticket-rules/category/${eventTicketCategoryId}`);
    return data.data;
};

export const createTicketRule = async (payload) => {
    const { data } = await api.post("/event-ticket-rules", payload);
    return data.data;
};

export const updateTicketRule = async (id, payload) => {
    const { data } = await api.put(`/event-ticket-rules/${id}`, payload);
    return data.data;
};

export const deleteTicketRule = async (id) => {
    const { data } = await api.delete(`/event-ticket-rules/${id}`);
    return data;
};