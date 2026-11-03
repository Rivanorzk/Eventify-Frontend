import api from "@/lib/api";

export const getTicketCategories = async () => {
    const response = await api.get("/ticket-categories");
    return response.data.data;
};

export const getTicketCategoryById = async (id) => {
    const response = await api.get(`/ticket-categories/${id}`);
    return response.data.data;
};

export const createTicketCategory = async (data) => {
    const response = await api.post("/ticket-categories", data);
    return response.data.data;
};

export const updateTicketCategory = async (id, data) => {
    const response = await api.put(`/ticket-categories/${id}`, data);
    return response.data.data;
};

export const deleteTicketCategory = async (id) => {
    const response = await api.delete(`/ticket-categories/${id}`);
    return response.data.data;
};

