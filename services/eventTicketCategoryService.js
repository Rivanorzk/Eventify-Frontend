import api from "@/lib/api";

export const getEventTicketCategories = async (eventId) => {
    const response = await api.get(
        `/event-ticket-categories/event/${eventId}`
    );

    return response.data.data;
};

export const getEventTicketCategoryById = async (id) => {
    const response = await api.get(
        `/event-ticket-categories/${id}`
    );

    return response.data.data;
};

export const createEventTicketCategories = async (data) => {
    const response = await api.post(
        "/event-ticket-categories",
        data
    );

    return response.data.data;
};

export const updateEventTicketCategories = async (id, data) => {
    const response = await api.put(
        `/event-ticket-categories/${id}`,
        data
    );

    return response.data.data;
};

export const deleteEventTicketCategories = async (id) => {
    const response = await api.delete(
        `/event-ticket-categories/${id}`
    );

    return response.data.data;
};

export const getByEvent = async (eventId) => {
    const { data } = await api.get(`/event-ticket-categories/event/${eventId}`);
    return data.data;
};

export const getEventTicketCategoryDetail = async (id) => {
    const { data } = await api.get(`/event-ticket-categories/${id}/detail`);
    return data.data; // { ...category, areas, benefits, rules }
};
