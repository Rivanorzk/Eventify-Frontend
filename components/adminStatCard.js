import {
    CalendarDays,
    ShoppingBag,
    Users,
    Ticket,
    Wallet,
    CheckCircle2,
    ShieldCheck,
} from "lucide-react";

const icons = {
    events: CalendarDays,
    orders: ShoppingBag,
    customers: Users,
    tickets: Ticket,
    revenue: Wallet,
    success: CheckCircle2,
    admins: ShieldCheck,
};

export default function AdminStatCard({
    title,
    value,
    description,
    type,
}) {
    const Icon = icons[type] || CalendarDays;

    return (
        <div className="bg-white border border-[#E5D6D0] rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-[#8C7777]">
                        {title}
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-[#1E1E1E]">
                        {value}
                    </h3>

                    <p className="mt-1 text-xs text-[#8C7777]">
                        {description}
                    </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-[#F8F1E7] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#7A1F2B]" />
                </div>
            </div>
        </div>
    );
}