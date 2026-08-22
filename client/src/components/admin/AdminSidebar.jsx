import { NavLink } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  BanknoteIcon,
  CheckIcon,
  LayoutDashboardIcon,
  ListIcon,
  Settings2Icon,
  WalletIcon,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { assets } from '../../assets/assets';

const AdminSidebar = () => {
  const { user } = useUser();

  const adminName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    'Administrator';

  const adminNavlinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboardIcon },
    { name: 'Verify', path: '/admin/verify-credentials', icon: CheckIcon },
    { name: 'Change', path: '/admin/change-credentials', icon: Settings2Icon },
    { name: 'Listings', path: '/admin/list-listings', icon: ListIcon },
    { name: 'Transactions', path: '/admin/transactions', icon: BanknoteIcon },
    { name: 'Disputes', path: '/admin/disputes', icon: ShieldAlert },
    { name: 'Withdrawal', path: '/admin/withdrawal', icon: WalletIcon },
  ];

  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 max-w-14 md:max-w-64 w-full border-r border-gray-200 bg-white text-sm shrink-0">
      {/* Admin Profile Details */}
      <div className="flex flex-col items-center px-4 w-full text-center">
        <img
          className="size-10 md:size-14 rounded-full mx-auto object-cover border-2 border-indigo-100 shadow-xs"
          src={user?.imageUrl || assets.user_profile}
          alt={adminName}
        />
        <div className="mt-2.5 max-md:hidden w-full px-2">
          <p className="text-sm font-bold text-gray-900 truncate">
            {adminName}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-1">
            <ShieldCheck size={12} /> Admin
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="w-full mt-6">
        {adminNavlinks.map((link, index) => (
          <NavLink
            key={index}
            to={link.path}
            end
            className={({ isActive }) =>
              `relative flex items-center max-md:justify-center gap-3 w-full py-3 min-md:pl-8 text-gray-600 font-medium transition ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-700 font-semibold'
                  : 'hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <link.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                <p className="max-md:hidden text-sm">{link.name}</p>
                <span
                  className={`w-1.5 h-full rounded-l-md right-0 absolute transition-all ${
                    isActive ? 'bg-indigo-600' : 'bg-transparent'
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default AdminSidebar;