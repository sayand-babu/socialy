import { ChartLineIcon, CircleDollarSignIcon, ListIcon, Loader2Icon, UsersIcon } from 'lucide-react';
import AdminTitle from '../../components/admin/AdminTitle';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import ListingDetailsModal from '../../components/admin/ListingDetailsModal';
import { getAdminDashboard } from '../../services/adminService';

const Dashboard = () => {
    const currency = import.meta.env.VITE_CURRENCY || '₹';
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        totalListings: 0,
        totalRevenue: 0,
        activeListings: 0,
        totalUsers: 0,
        recentListings: [],
    });
    const [showModal, setShowModal] = useState(null);

    const dashboardCards = [
        { title: 'Total Listings', value: (dashboardData.totalListings || 0).toString(), icon: ChartLineIcon },
        { title: 'Total Revenue', value: `${currency}${(dashboardData.totalRevenue || 0).toLocaleString()}`, icon: CircleDollarSignIcon },
        { title: 'Active Listings', value: (dashboardData.activeListings || 0).toString(), icon: ListIcon },
        { title: 'Total Users', value: (dashboardData.totalUsers || 0).toString(), icon: UsersIcon },
    ];

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const data = await getAdminDashboard(token);
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching admin dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        fetchDashboardData();
    }, [isLoaded, isSignedIn]);

    return loading ? (
        <div className='flex items-center justify-center h-full min-h-[400px]'>
            <Loader2Icon className='animate-spin text-indigo-600 size-8' />
        </div>
    ) : (
        <>
            <AdminTitle text1='Admin' text2='Dashboard' />

            <div className='relative flex flex-wrap gap-4 mt-6 text-gray-600'>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                    {dashboardCards.map((card, index) => (
                        <div key={index} className='flex items-center justify-between p-4 bg-white ring-1 ring-gray-200 rounded-xl shadow-xs'>
                            <div>
                                <h1 className='text-xs font-semibold uppercase text-gray-500 tracking-wider'>{card.title}</h1>
                                <p className='text-2xl font-bold text-gray-900 mt-1'>{card.value}</p>
                            </div>
                            <div className='p-2.5 bg-indigo-50 text-indigo-600 rounded-xl'>
                                <card.icon size={22} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className='mt-10 text-lg font-bold text-gray-800'>Recent Platform Listings</p>
            <div className='mt-4 overflow-x-auto bg-white border border-gray-200 w-full max-w-5xl rounded-xl shadow-xs'>
                {dashboardData.recentListings.length === 0 ? (
                    <div className='p-8 text-center text-gray-500'>No active listings created yet.</div>
                ) : (
                    <table className='w-full text-sm text-left text-gray-700'>
                        <thead className='text-xs uppercase bg-gray-50/70 border-b border-gray-200 text-gray-500'>
                            <tr>
                                <th className='pl-4 py-3'> # </th>
                                <th className='px-4 py-3'>Title</th>
                                <th className='px-4 py-3'>Niche</th>
                                <th className='px-4 py-3'>Platform</th>
                                <th className='px-4 py-3'>Username</th>
                                <th className='px-4 py-3'>Price</th>
                                <th className='px-4 py-3'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.recentListings.map((listing, index) => (
                                <tr onClick={() => setShowModal(listing)} key={listing.id || index} className='border-t border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition'>
                                    <td className='pl-4 py-3 font-medium text-gray-400'>{index + 1}.</td>
                                    <td className='px-4 py-3 font-medium text-gray-900'>{listing.title}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.niche}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.platform}</td>
                                    <td className='px-4 py-3'>@{listing.username}</td>
                                    <td className='px-4 py-3 font-semibold text-gray-900'>{currency}{(listing.price || 0).toLocaleString()}</td>
                                    <td className='px-4 py-3'>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                                            listing.status === 'active' ? 'bg-green-100 text-green-700' :
                                            listing.status === 'sold' ? 'bg-purple-100 text-purple-700' :
                                            listing.status === 'ban' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {listing.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {showModal && <ListingDetailsModal listing={showModal} onClose={() => setShowModal(null)} />}
            </div>
        </>
    );
};

export default Dashboard;
