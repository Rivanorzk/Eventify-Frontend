import api from "@/lib/api";

export const getAreasByCategory = async (eventTicketCategoryId) => {
    const { data } = await api.get(`/event-ticket-areas/category/${eventTicketCategoryId}`);
    return data.data;
};

export const createTicketArea = async (payload) => {
    const { data } = await api.post("/event-ticket-areas", payload);
    return data.data;
};

export const updateTicketArea = async (id, payload) => {
    const { data } = await api.put(`/event-ticket-areas/${id}`, payload);
    return data.data;
};

export const deleteTicketArea = async (id) => {
    const { data } = await api.delete(`/event-ticket-areas/${id}`);
    return data;
};