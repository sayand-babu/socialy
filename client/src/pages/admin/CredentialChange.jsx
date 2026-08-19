import AdminTitle from '../../components/admin/AdminTitle';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Loader2Icon, KeyRound } from 'lucide-react';
import CredentialChangeModal from '../../components/admin/CredentialChangeModal';
import { getPendingCredentialChanges } from '../../services/adminService';

const CredentialChange = () => {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(null);

    const fetchAllUnchangedListings = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const data = await getPendingCredentialChanges(token);
            setListings(data);
        } catch (error) {
            console.error('Error fetching listings for credential change:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        fetchAllUnchangedListings();
    }, [isLoaded, isSignedIn]);

    return loading ? (
        <div className='flex items-center justify-center h-full min-h-[400px]'>
            <Loader2Icon className='animate-spin text-indigo-600 size-8' />
        </div>
    ) : (
        <div className='h-full'>
            <AdminTitle text1='Change' text2=' Credentials' />

            {listings.length === 0 ? (
                <div className='flex flex-col items-center justify-center text-center text-gray-500 py-20'>
                    <div className='w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <KeyRound className='size-8' />
                    </div>
                    <h3 className='text-xl font-bold text-gray-800 mb-1'>All Credentials Secured</h3>
                    <p className='text-sm text-gray-500'>No verified listings pending escrow password changes.</p>
                </div>
            ) : (
                <div className='mt-8 overflow-x-auto bg-white border border-gray-200 w-full max-w-5xl rounded-xl shadow-xs'>
                    <table className='w-full text-sm text-left text-gray-700'>
                        <thead className='text-xs uppercase bg-gray-50/70 border-b border-gray-200 text-gray-500'>
                            <tr>
                                <th className='pl-4 py-3'> # </th>
                                <th className='px-4 py-3'>Title</th>
                                <th className='px-4 py-3'>Niche</th>
                                <th className='px-4 py-3'>Platform</th>
                                <th className='px-4 py-3'>Username</th>
                                <th className='px-4 py-3'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listings.map((listing, index) => (
                                <tr key={listing.id || index} className='border-t border-gray-100 hover:bg-indigo-50/40 transition'>
                                    <td className='pl-4 py-3 font-medium text-gray-400'>{index + 1}.</td>
                                    <td className='px-4 py-3 font-medium text-gray-900'>{listing.title}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.niche}</td>
                                    <td className='px-4 py-3 capitalize'>{listing.platform}</td>
                                    <td className='px-4 py-3'>@{listing.username}</td>
                                    <td className='px-4 py-3'>
                                        <button
                                            onClick={() => setShowModal(listing)}
                                            className='text-purple-600 hover:text-purple-800 font-semibold px-3 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg transition cursor-pointer'
                                        >
                                            Change & Secure
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <CredentialChangeModal
                    listing={showModal}
                    onClose={() => {
                        fetchAllUnchangedListings();
                        setShowModal(null);
                    }}
                />
            )}
        </div>
    );
};

export default CredentialChange;
