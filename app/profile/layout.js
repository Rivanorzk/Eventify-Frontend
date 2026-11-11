"use client";

import UserLayout from "@/components/userLayout";
import { Toaster } from "react-hot-toast";

export default function ProfileLayout({ children }) {
    return (
        <UserLayout>
             <Toaster position="top-right" />
            {children}
        </UserLayout>
    );
}