// app/admin/notification/page.js
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";

import NotificationItem from "@/components/notificationItem";
import NotificationFilters from "@/components/notificationFilter";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";

import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from "@/services/notificationService";

import useAuth from "@/hooks/useAuth";
import { toast } from "react-hot-toast";

// Sama seperti /customer/notification, tapi untuk role admin/superadmin
// (PRD 26 & 27: menu "Notifikasi" / "Notifications" untuk Admin & Superadmin).
export default function AdminNotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        limit: 20,
        offset: 0,
        total: 0
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        const role = user.role?.toLowerCase();
        if (role !== "admin" && role !== "superadmin") {
            router.replace("/customer/dashboard");
        }
    }, [user, authLoading, router]);

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getNotifications({
                limit: pagination.limit,
                offset: pagination.offset
            });

            setNotifications(result.data || []);
            setPagination(prev => ({
                ...prev,
                total: result.meta?.total || 0
            }));

            const unread = await getUnreadCount();
            setUnreadCount(unread);

        } catch (err) {
            console.error('Error loading notifications:', err);
            setError('Gagal memuat notifikasi. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }, [pagination.limit, pagination.offset]);

    useEffect(() => {
        const role = user?.role?.toLowerCase();
        if (!authLoading && user && (role === "admin" || role === "superadmin")) {
            loadNotifications();
        }
    }, [authLoading, user, loadNotifications]);

    useEffect(() => {
        let filtered = [...notifications];

        if (activeFilter === 'unread') {
            filtered = filtered.filter(n => !n.is_read);
        } else if (activeFilter !== 'all') {
            filtered = filtered.filter(n => n.type === activeFilter);
        }

        setFilteredNotifications(filtered);
    }, [notifications, activeFilter]);

    const handleMarkAsRead = async (id) => {
        try {
            await markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success('Notification marked as read');
        } catch (error) {
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (!notifications.find(n => n.id === id)?.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete all notifications?')) return;

        try {
            await deleteAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
            toast.success('All notifications cleared');
        } catch (error) {
            toast.error('Failed to clear notifications');
        }
    };

    const handleRefresh = () => {
        loadNotifications();
        toast.success('Refreshed');
    };

    if (authLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#D8A7A7] border-t-[#5B0F18] animate-spin" />
                    <p className="text-sm text-[#7A1F2B]">Loading...</p>
                </div>
            </div>
        );
    }

    const role = user?.role?.toLowerCase();
    if (role !== "admin" && role !== "superadmin") {
        return null;
    }

    if (loading) {
        return (
            <div className="py-10">
                <LoadingSpinner text="Loading notifications..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-10">
                <EmptyState
                    title="Something went wrong"
                    description={error}
                />
                <button
                    onClick={handleRefresh}
                    className="mt-4 px-4 py-2 bg-[#5B0F18] text-white rounded-lg"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-5 py-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E1E1E]">
                        Notifications
                    </h1>
                    <p className="text-sm text-[#737373]">
                        {unreadCount > 0
                            ? `${unreadCount} unread notifications`
                            : 'No unread notifications'
                        }
                    </p>
                </div>

                <button
                    onClick={handleRefresh}
                    className="p-2 rounded-xl hover:bg-[#F8F1E7] transition"
                    title="Refresh"
                >
                    <RefreshCw className="w-5 h-5 text-[#7A1F2B]" />
                </button>
            </div>

            <NotificationFilters
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllAsRead}
                onClearAll={handleClearAll}
            />

            {filteredNotifications.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title="No notifications"
                    description={activeFilter === 'unread'
                        ? "You've read all your notifications"
                        : "You don't have any notifications yet"
                    }
                />
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {filteredNotifications.length < pagination.total && (
                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setPagination(prev => ({
                                ...prev,
                                offset: prev.offset + prev.limit
                            }));
                            loadNotifications();
                        }}
                        className="px-6 py-2.5 bg-[#5B0F18] text-[#F8F1E7] rounded-xl text-sm font-semibold hover:bg-[#7A1F2B] transition"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
}
