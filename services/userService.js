// services/userService.js
import api from "@/lib/api";

// ================================
// ADMIN / SUPERADMIN
// ================================

/** [ADMIN/SUPERADMIN] */
export const getUsers = async () => {
    const { data } = await api.get("/users");
    return data.data;
};
 
export const getUserById = async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data.data;
};
 
/** [SUPERADMIN only] */
export const updateRole = async (id, role) => {
    const { data } = await api.put(`/users/${id}/role`, { role });
    return data.data;
};
 
/** [ADMIN/SUPERADMIN] */
export const updateStatus = async (id, status, isActive) => {
    const { data } = await api.put(`/users/${id}/status`, {
        status,
        is_active: isActive,
    });
    return data.data;
};
 
/** [SUPERADMIN only] */
export const deleteUser = async (id) => {
    const { data } = await api.delete(`/users/${id}`);
    return data.data;
};

// ================================
// PROFILE (CURRENT USER)
// ================================

export const getProfile = async () => {
    const response = await api.get("/users/me");
    return response.data.data;
};

export const updateProfile = async (data) => {
    const response = await api.put("/users/me", data);
    return response.data.data;
};

export const changePassword = async (data) => {
    const response = await api.put("/users/me/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
    });
    return response.data.data;
};

export const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await api.post("/users/me/avatar", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data.data; 
};

export const uploadCover = async (file) => {
    const formData = new FormData();
    formData.append("cover", file);

    const response = await api.post("/users/me/cover", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data.data; 
};
