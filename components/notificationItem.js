// components/NotificationItem.js
import { 
    Bell, 
    ShoppingBag, 
    CreditCard, 
    Calendar, 
    Gift,
    CheckCircle,
    XCircle,
    Ticket
} from "lucide-react";
import Link from "next/link";

const iconMap = {
    order: ShoppingBag,
    payment: CreditCard,
    event: Calendar,
    promo: Gift,
    ticket: Ticket,
    system: Bell
};

const typeColors = {
    order: "bg-blue-50 text-blue-600",
    payment: "bg-green-50 text-green-600",
    event: "bg-purple-50 text-purple-600",
    promo: "bg-orange-50 text-orange-600",
    ticket: "bg-purple-50 text-purple-600",
    system: "bg-gray-50 text-gray-600"
};

export default function NotificationItem({ 
    notification, 
    onMarkAsRead, 
    onDelete 
}) {
    const Icon = iconMap[notification.type] || Bell;
    const colorClass = typeColors[notification.type] || typeColors.system;
    
    const getStatusIcon = () => {
        if (notification.is_read) return null;
        return (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#7A1F2B] rounded-full" />
        );
    };

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    const handleMarkAsRead = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!notification.is_read) {
            onMarkAsRead?.(notification.id);
        }
    };

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(notification.id);
    };

    // Saat customer membuka link notifikasi, tandai terbaca tanpa toast
    // (toast akan muncul tiba-tiba di halaman tujuan).
    const handleOpen = () => {
        if (!notification.is_read) {
            onMarkAsRead?.(notification.id, { silent: true });
        }
    };

    // Area ikon + isi menjadi satu link besar kalau notifikasi punya link.
    const Wrapper = notification.link ? Link : "div";
    const wrapperProps = notification.link
        ? { href: notification.link, onClick: handleOpen }
        : {};

    return (
        <div 
            className={`
                relative bg-white border border-[#E5D6D0] rounded-2xl p-4 
                hover:shadow-md transition hover:-translate-y-0.5
                ${!notification.is_read ? 'border-l-4 border-l-[#7A1F2B] bg-[#FDF8F5]' : ''}
            `}
        >
            <div className="flex gap-4">
                {/* Area yang bisa diklik: ikon + isi */}
                <Wrapper
                    {...wrapperProps}
                    className="flex flex-1 min-w-0 gap-4 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B]/40"
                >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-[#1E1E1E] text-sm">
                                    {notification.title}
                                </p>
                                {/* Pesan promo tidak dipotong agar kode voucher terbaca penuh */}
                                <p
                                    className={`text-sm text-[#737373] mt-1 ${
                                        notification.type === "promo" ? "" : "line-clamp-2"
                                    }`}
                                >
                                    {notification.message}
                                </p>
                            </div>
                            {getStatusIcon()}
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-[#A68C8C]">
                                {formatTime(notification.created_at)}
                            </span>

                            {notification.link && (
                                <span className="text-xs font-medium text-[#7A1F2B]">
                                    View Details →
                                </span>
                            )}
                        </div>
                    </div>
                </Wrapper>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                    {!notification.is_read && (
                        <button
                            onClick={handleMarkAsRead}
                            className="p-1.5 rounded-lg hover:bg-[#F8F1E7] transition"
                            title="Mark as read"
                        >
                            <CheckCircle className="w-4 h-4 text-[#7A1F2B]" />
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-lg hover:bg-[#F8F1E7] transition"
                        title="Delete"
                    >
                        <XCircle className="w-4 h-4 text-[#A68C8C] hover:text-[#7A1F2B]" />
                    </button>
                </div>
            </div>
        </div>
    );
}