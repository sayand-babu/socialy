import { Outlet, Link } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminNavbar from "../../components/admin/AdminNavbar";
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { ArrowRightIcon, Loader2Icon, ShieldAlert, Lock } from "lucide-react";
import { checkAdminRole } from "../../services/adminService";

const Layout = () => {
    const { user, isLoaded: isUserLoaded } = useUser();
    const { getToken } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyRole = async () => {
            if (!isUserLoaded) return;

            if (!user) {
                setIsAdmin(false);
                setIsLoading(false);
                return;
            }

            // Fast-check client metadata first
            if (user.publicMetadata?.role === "admin") {
                setIsAdmin(true);
                setIsLoading(false);
                return;
            }

            // Fallback: Verify with backend
            try {
                const token = await getToken();
                const res = await checkAdminRole(token);
                if (res?.isAdmin || res?.role === "admin") {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch {
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };

        verifyRole();
    }, [user, isUserLoaded, getToken]);

    if (isLoading || !isUserLoaded) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
                <Loader2Icon className="size-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-gray-500">Verifying administrator credentials...</p>
            </div>
        );
    }

    return isAdmin ? (
        <>
            <AdminNavbar />
            <div className="flex">
                <AdminSidebar />
                <div className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] bg-slate-50 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </>
    ) : (
        <div className="flex flex-col items-center justify-center h-screen text-center p-6 bg-slate-50">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-4 border border-red-100 shadow-xs">
                <ShieldAlert size={40} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Administrator Access Required
            </h2>
            <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
                You do not have administrative privileges to view the Socialy backoffice. Please sign in with an authorized administrator account.
            </p>
            <div className="flex items-center gap-3">
                <Link
                    to="/"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-xs"
                >
                    Return Home <ArrowRightIcon className="ml-2 size-4" />
                </Link>
                <Link
                    to="/marketplace"
                    className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all shadow-xs"
                >
                    Marketplace
                </Link>
            </div>
        </div>
    );
};

export default Layout;
