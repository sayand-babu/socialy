import AdminTitle from '../../components/admin/AdminTitle';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, Loader2Icon, MailCheckIcon, XIcon, ShieldCheck } from 'lucide-react';
import ListingDetailsModal from '../../components/admin/ListingDetailsModal';
import { getAllAdminListings, updateAdminListingStatus } from '../../services/adminService';

const AllListings = () => {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState([]);
    const [showModal, setShowModal] = useState(null);

    const fetchAllListings = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const data = await getAllAdminListings(token);
            setListings(data);
        } catch (error) {
            console.error('Error fetching admin listings:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeListingStatus = async (status, listing) => {
        try {
            const token = await getToken();
            await updateAdminListingStatus(listing.id, status, token);
            setListings((prev) =>
                prev.map((l) => (l.id === listing.id ? { ...l, status } : l))
            );
            toast.success(`Listing status updated to ${status}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update listing status');
        }
    };

    const colorMapCredentials = {
        notSubmit: { bg: 'bg-red-100', text: 'text-red-600', icon: XIcon, label: 'Not Submitted' },
        submitted: { bg: 'bg-amber-100', text: 'text-amber-700', icon: MailCheckIcon, label: 'Submitted' },
        verified: { bg: 'bg-blue-100', text: 'text-blue-700', icon: ShieldCheck, label: 'Verified' },
        changed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircleIcon, label: 'Secured' },
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        fetchAllListings();
    }, [isLoaded, isSignedIn]);

    return loading ? (
        <div className='flex items-center justify-center h-full min-h-[400px]'>
            <Loader2Icon className='animate-spin text-indigo-600 size-8' />
        </div>
    ) : (
        <div>
            <AdminTitle text1='All' text2=' Listings' />

            <div className='mt-8 overflow-x-auto bg-white border border-gray-200 w-full max-w-5xl rounded-xl shadow-xs'>
                {listings.length === 0 ? (
                    <div className='p-8 text-center text-gray-500'>No listings found in the marketplace.</div>
                ) : (
                    <table className='w-full text-sm text-left text-gray-700'>
                        <thead className='text-xs uppercase bg-gray-50/70 border-b border-gray-200 text-gray-500'>
                            <tr>
                                <th className='pl-4 py-3'> # </th>
                                <th className='px-4 py-3'>Title</th>
                                <th className='px-4 py-3'>Niche</th>
                                <th className='px-4 py-3'>Platform</th>
                                <th className='px-4 py-3'>Username</th>
                                <th className='px-4 py-3'>Credentials</th>
                                <th className='px-4 py-3'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listings.map((listing, index) => (
                                <tr onClick={() => setShowModal(listing)} key={listing.id || index} className='border-t border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition'>
                                    <td className='pl-4 py-3 font-medium text-gray-400'>{index + 1}.</td>
                                    <td className='px-4 py-3 font-medium text-gray-900'>{listing.title}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.niche}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.platform}</td>
                                    <td className='px-4 py-3'>@{listing.username}</td>
                                    <td className='px-4 py-3'>
                                        {(() => {
                                            const credentialsStatus = listing.isCredentialChanged
                                                ? 'changed'
                                                : listing.isCredentialVerified
                                                ? 'verified'
                                                : listing.isCredentialSubmitted
                                                ? 'submitted'
                                                : 'notSubmit';
                                            const color = colorMapCredentials[credentialsStatus];
                                            return (
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md ${color.bg} ${color.text}`}>
                                                    <color.icon size={12} /> {color.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div onClick={(e) => e.stopPropagation()} className='flex gap-2'>
                                            {listing.status !== 'deleted' ? (
                                                <select
                                                    value={listing.status}
                                                    onChange={(e) => changeListingStatus(e.target.value, listing)}
                                                    className='px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:border-indigo-500 cursor-pointer'
                                                >
                                                    <option value='active'>Active</option>
                                                    <option value='inactive'>Inactive</option>
                                                    <option value='ban'>Ban</option>
                                                    <option value='sold'>Sold</option>
                                                </select>
                                            ) : (
                                                <span className='text-xs text-red-500 font-semibold'>Deleted</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {showModal && <ListingDetailsModal listing={showModal} onClose={() => setShowModal(null)} />}
        </div>
    );
};

export default AllListings;
