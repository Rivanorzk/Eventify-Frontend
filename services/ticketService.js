import api from "@/lib/api";

export const getTickets = async (params = {}) => {
    const response = await api.get("/tickets", {
        params,
    });

    return response.data.data;
};

export const getMyTickets = async (params = {}) => {
    const response = await api.get("/tickets/my", {
        params,
    });

    return response.data.data;
};

export const getTicketById = async (id) => {
    const response = await api.get(`/tickets/${id}`);

    return response.data.data;
};
 
export async function createTicketCategory(payload) {
    // payload: { event_id, name, price, quota, description, is_active }
    const res = await api.post("/event-ticket-categories", payload);
    return res.data.data;
}
 
export async function updateTicketCategory(id, payload) {
    // payload: { name, price, quota, description, is_active }
    const res = await api.put(`/event-ticket-categories/${id}`, payload);
    return res.data.data;
}
 
export async function deleteTicketCategory(id) {
    const res = await api.delete(`/event-ticket-categories/${id}`);
    return res.data;
}