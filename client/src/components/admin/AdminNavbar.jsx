import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { assets } from "../../assets/assets";

const AdminNavbar = () => {
  return (
    <div className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-200 bg-white">
      {/* Left: Logo & Admin Badge */}
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <img className="w-28 h-auto" src={assets.logo} alt="Socialy logo" />
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
          Backoffice Suite
        </span>
      </div>

      {/* Right: Exit to Marketplace & User Profile */}
      <div className="flex items-center gap-4">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition"
        >
          <ArrowLeft size={14} /> Back to Marketplace
        </Link>
        <UserButton />
      </div>
    </div>
  );
};

export default AdminNavbar;