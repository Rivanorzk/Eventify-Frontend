import api from "@/lib/api";

export const getCustomerDashboard = async () => {
    const response = await api.get("/dashboard/customer");
    return response.data.data;
};

export async function getAdminDashboard(params = {}) {
    const { data } = await api.get("/dashboard/admin", { params });
    return data.data;
}

export async function getSuperadminDashboard(params = {}) {
    const { data } = await api.get("/dashboard/superadmin", { params });
    return data.data;
}

export async function getEventAnalytics(eventId, { range = "all" } = {}) {
    const response = await api.get(`/dashboard/events/${eventId}/analytics`, {
        params: { range },
    });
    return response.data.data;
}

export async function getOrganizerList(params = {}) {
    const { data } = await api.get("/dashboard/organizers", { params });
    return data.data;
}
