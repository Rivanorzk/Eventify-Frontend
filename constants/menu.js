import roles from "@/constants/roles";

export const menus = {
    [roles.CUSTOMER]: [
        {
            title: "Dashboard",
            href: "/customer/dashboard",
            icon: "LayoutDashboard",
        },
        {
            title: "Event",
            href: "/customer/event",
            icon: "CalendarDays",
        },
        {
            title: "Notifikasi",
            href: "/customer/notification",
            icon: "Bell",
        },
        {
            title: "Riwayat Pesanan",
            href: "/customer/orders",
            icon: "Receipt",
        },
        {
            title: "Tiket Saya",
            href: "/customer/tickets",
            icon: "Ticket",
        },
        {
            title: "Voucher",
            href: "/customer/voucher",
            icon: "Gift",
        },
        {
            title: "Profile",
            href: "/profile",
            icon: "User",
        },
    ],

    [roles.ADMIN]: [
        {
            title: "Dashboard",
            href: "/admin/dashboard",
            icon: "LayoutDashboard",
        },
        {
            title: "Management Event",
            href: "/admin/events",
            icon: "CalendarDays",
        },
        {
            title: "Kelola Kategori",
            href: "/admin/categories",
            icon: "Tags",
        },
        {
            title: "Kelola Pesanan",
            href: "/admin/orders",
            icon: "Receipt",
        },
        {
            title: "Kelola Tiket",
            href: "/admin/tickets",
            icon: "Ticket",
        },
        {
            title: "Kelola Tiket Kategori",
            href: "/admin/ticket-categories",
            icon: "Ticket",
        },
        {
            title: "Kelola Voucher",
            href: "/admin/vouchers",
            icon: "Gift",
        },
        {
            title: "Profile",
            href: "/profile",
            icon: "User",
        },
    ],

    [roles.SUPERADMIN]: [
        {
            title: "Dashboard",
            href: "/superadmin/dashboard",
            icon: "LayoutDashboard",
        },
        {
            title: "Event",
            href: "/superadmin/events",
            icon: "CalendarDays",
        },
        {
            title: "Pesanan",
            href: "/superadmin/orders",
            icon: "ShoppingBag",
        },
        {
            title: "Users",
            href: "/superadmin/users",
            icon: "ShieldCheck",
        },
        {
            title: "auditLog",
            href: "/superadmin/audit-log",
            icon: "ShieldCheck",
        },
        {
            title: "Profile",
            href: "/profile",
            icon: "User",
        },
    ],
};