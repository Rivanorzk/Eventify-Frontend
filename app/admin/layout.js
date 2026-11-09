import UserLayout from "@/components/userLayout";
import RoleGuard from "@/components/roleGuard";

export default function CustomerLayout({ children }) {
    return (
        <RoleGuard allow={["admin"]}>
            <UserLayout>{children}</UserLayout>
        </RoleGuard>
    );
}
