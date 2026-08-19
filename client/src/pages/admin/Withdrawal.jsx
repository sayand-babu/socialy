import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Loader2Icon, HandCoins } from 'lucide-react';
import AdminTitle from '../../components/admin/AdminTitle';
import WithdrawalDetail from '../../components/admin/WithdrawalDetail';
import { getAllAdminWithdrawals } from '../../services/adminService';

const Withdrawal = () => {
    const currency = import.meta.env.VITE_CURRENCY || '₹';
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const getRequests = async () => {
        try {
            setIsLoading(true);
            const token = await getToken();
            if (!token) return;
            const data = await getAllAdminWithdrawals(token);
            setRequests(data);
        } catch (error) {
            console.error('Error fetching admin withdrawals:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        getRequests();
    }, [isLoaded, isSignedIn]);

    if (isLoading) {
        return (
            <div className='flex items-center justify-center h-full min-h-[400px]'>
                <Loader2Icon className='size-8 text-indigo-600 animate-spin' />
            </div>
        );
    }

    return (
        <div className='h-full'>
            <AdminTitle text1='Payout' text2='Withdrawals' />

            <div className='mt-8 overflow-x-auto bg-white border border-gray-200 w-full max-w-6xl rounded-xl shadow-xs'>
                <table className='w-full text-sm text-left text-gray-700'>
                    <thead className='text-xs uppercase border-b border-gray-200 bg-gray-50/70 text-gray-500'>
                        <tr>
                            <th className='pl-4 py-3'>#</th>
                            <th className='px-4 py-3'>User</th>
                            <th className='px-4 py-3'>Email</th>
                            <th className='px-4 py-3'>Amount</th>
                            <th className='px-4 py-3'>Status</th>
                            <th className='px-4 py-3 text-center'>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan='6' className='text-center py-12 text-gray-500'>
                                    <div className='flex flex-col items-center justify-center'>
                                        <HandCoins className='size-8 text-gray-400 mb-2' />
                                        <p className='font-semibold text-gray-700'>No withdrawal requests submitted yet.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            requests.map((req, index) => (
                                <tr key={req.id || index} className='border-t border-gray-100 hover:bg-indigo-50/40 transition'>
                                    <td className='pl-4 py-3 font-medium text-gray-400'>{index + 1}.</td>
                                    <td className='px-4 py-3 flex items-center gap-2.5 font-medium text-gray-900'>
                                        <img
                                            src={req.user?.image || '/placeholder-avatar.png'}
                                            alt={req.user?.name}
                                            className='w-8 h-8 rounded-full object-cover border border-gray-100'
                                        />
                                        {req.user?.name || 'Seller'}
                                    </td>
                                    <td className='px-4 py-3 text-gray-500'>{req.user?.email || '—'}</td>
                                    <td className='px-4 py-3 font-bold text-gray-900'>
                                        {currency}{(req.amount || 0).toLocaleString()}
                                    </td>
                                    <td className='px-4 py-3'>
                                        {req.isWithdrawn ? (
                                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700'>
                                                Paid Out
                                            </span>
                                        ) : (
                                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700'>
                                                Pending Review
                                            </span>
                                        )}
                                    </td>
                                    <td className='px-4 py-3 text-center'>
                                        <button
                                            onClick={() => setSelectedRequest(req)}
                                            className='text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer'
                                        >
                                            Review & Pay
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {selectedRequest && (
                    <WithdrawalDetail
                        data={selectedRequest}
                        onClose={() => {
                            getRequests();
                            setSelectedRequest(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Withdrawal;
