// app/customer/notifications/page.js
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

const PAGE_SIZE = 20;

export default function NotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [unreadCount, setUnreadCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    // Check auth
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (user.role?.toLowerCase() !== "customer") {
            router.replace("/admin/dashboard");
        }
    }, [user, authLoading, router]);

    // Load notifications (halaman pertama / refresh)
    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await getNotifications({
                limit: PAGE_SIZE,
                offset: 0
            });

            setNotifications(result.data || []);
            setTotal(result.meta?.total || 0);

            // Get unread count
            const unread = await getUnreadCount();
            setUnreadCount(unread);

        } catch (err) {
            console.error('Error loading notifications:', err);
            setError('Gagal memuat notifikasi. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            loadNotifications();
        }
    }, [authLoading, user, loadNotifications]);

    // Filter notifications
    useEffect(() => {
        let filtered = [...notifications];

        if (activeFilter === 'unread') {
            filtered = filtered.filter(n => !n.is_read);
        } else if (activeFilter !== 'all') {
            filtered = filtered.filter(n => n.type === activeFilter);
        }

        setFilteredNotifications(filtered);
    }, [notifications, activeFilter]);

    // Handle load more: tambahkan ke daftar, bukan menimpa
    const handleLoadMore = async () => {
        try {
            setLoadingMore(true);

            const result = await getNotifications({
                limit: PAGE_SIZE,
                offset: notifications.length
            });

            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const fresh = (result.data || []).filter(n => !existingIds.has(n.id));
                return [...prev, ...fresh];
            });
            setTotal(result.meta?.total ?? total);

        } catch (err) {
            console.error('Error loading more notifications:', err);
            toast.error('Gagal memuat notifikasi berikutnya');
        } finally {
            setLoadingMore(false);
        }
    };

    // Handle mark as read
    // silent = true dipakai saat customer membuka link notifikasi (tanpa toast)
    const handleMarkAsRead = async (id, { silent = false } = {}) => {
        try {
            await markAsRead(id);
            setNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (!silent) toast.success('Notification marked as read');
        } catch (error) {
            if (!silent) toast.error('Failed to mark as read');
        }
    };

    // Handle mark all as read
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

    // Handle delete
    const handleDelete = async (id) => {
        try {
            const wasUnread = !notifications.find(n => n.id === id)?.is_read;

            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    // Handle clear all
    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete all notifications?')) return;
        
        try {
            await deleteAllNotifications();
            setNotifications([]);
            setTotal(0);
            setUnreadCount(0);
            toast.success('All notifications cleared');
        } catch (error) {
            toast.error('Failed to clear notifications');
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        loadNotifications();
        toast.success('Refreshed');
    };

    // Auth loading
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-[#D8A7A7] border-t-[#5B0F18] animate-spin" />
                    <p className="text-sm text-[#7A1F2B]">Loading...</p>
                </div>
            </div>
        );
    }

    // Wrong role
    if (user?.role?.toLowerCase() !== "customer") {
        return null;
    }

    // Loading
    if (loading) {
        return (
            <div className="py-10">
                <LoadingSpinner text="Loading notifications..." />
            </div>
        );
    }

    // Error
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
        <div className="">
            <div className="">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
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
                    </div>
                    
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-xl hover:bg-[#F8F1E7] transition"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5 text-[#7A1F2B]" />
                    </button>
                </div>

                {/* Filters */}
                <NotificationFilters
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    unreadCount={unreadCount}
                    onMarkAllRead={handleMarkAllAsRead}
                    onClearAll={handleClearAll}
                />

                {/* Notifications List */}
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

                {/* Load More */}
                {notifications.length < total && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="px-6 py-2.5 bg-[#5B0F18] text-[#F8F1E7] rounded-xl text-sm font-semibold hover:bg-[#7A1F2B] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loadingMore ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}