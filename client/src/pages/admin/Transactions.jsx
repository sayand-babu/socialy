import AdminTitle from '../../components/admin/AdminTitle';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import ListingDetailsModal from '../../components/admin/ListingDetailsModal';
import { Loader2Icon, Receipt } from 'lucide-react';
import { getAllAdminTransactions } from '../../services/adminService';

const Transactions = () => {
    const currency = import.meta.env.VITE_CURRENCY || '₹';
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(null);

    const getTransactions = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;
            const data = await getAllAdminTransactions(token);
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching admin transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        getTransactions();
    }, [isLoaded, isSignedIn]);

    return loading ? (
        <div className='flex items-center justify-center h-full min-h-[400px]'>
            <Loader2Icon className='animate-spin text-indigo-600 size-8' />
        </div>
    ) : (
        <div>
            <AdminTitle text1='Platform' text2=' Transactions' />

            <div className='mt-8 overflow-x-auto bg-white border border-gray-200 w-full max-w-5xl rounded-xl shadow-xs'>
                {transactions.length === 0 ? (
                    <div className='flex flex-col items-center justify-center text-center text-gray-500 py-16'>
                        <div className='w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3'>
                            <Receipt className='size-7' />
                        </div>
                        <h3 className='text-lg font-bold text-gray-800 mb-1'>No Transactions Recorded</h3>
                        <p className='text-xs text-gray-500'>Completed escrow sales will appear in this financial ledger.</p>
                    </div>
                ) : (
                    <table className='w-full text-sm text-left text-gray-700'>
                        <thead className='text-xs uppercase bg-gray-50/70 border-b border-gray-200 text-gray-500'>
                            <tr>
                                <th className='pl-4 py-3'> # </th>
                                <th className='px-4 py-3'>Buyer</th>
                                <th className='px-4 py-3'>Account Username</th>
                                <th className='px-4 py-3'>Platform</th>
                                <th className='px-4 py-3'>Amount</th>
                                <th className='px-4 py-3'>Purchase Date</th>
                                <th className='px-4 py-3'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t, index) => (
                                <tr key={t.id || index} className='border-t border-gray-100 hover:bg-indigo-50/40 transition'>
                                    <td className='pl-4 py-3 font-medium text-gray-400'>{index + 1}.</td>
                                    <td className='px-4 py-3'>
                                        <p className='font-semibold text-gray-900'>{t.user?.name || 'Buyer'}</p>
                                        <p className='text-xs text-gray-400'>{t.user?.email || '—'}</p>
                                    </td>
                                    <td className='px-4 py-3 font-medium text-gray-900'>@{t.listing?.username || 'user'}</td>
                                    <td className='px-4 py-3 capitalize'>{t.listing?.platform || '—'}</td>
                                    <td className='px-4 py-3 font-bold text-indigo-700'>
                                        {currency}{(t.amount || 0).toLocaleString()}
                                    </td>
                                    <td className='px-4 py-3 text-gray-500 text-xs'>{new Date(t.createdAt).toLocaleString()}</td>
                                    <td className='px-4 py-3'>
                                        {t.listing && (
                                            <button
                                                onClick={() => setShowModal(t.listing)}
                                                className='text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer'
                                            >
                                                Details
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {showModal && (
                <ListingDetailsModal listing={showModal} onClose={() => { setShowModal(null); }} />
            )}
        </div>
    );
};

export default Transactions;
