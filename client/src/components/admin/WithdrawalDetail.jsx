import { useState } from 'react';
import toast from 'react-hot-toast';
import { XIcon, CopyIcon, Loader2Icon, CheckCircle2, Building, User } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { approveWithdrawal } from '../../services/adminService';

const WithdrawalDetail = ({ data, onClose }) => {
    const { getToken } = useAuth();
    const currency = import.meta.env.VITE_CURRENCY || '$';
    const [isSubmitting, setIsSubmitting] = useState(false);

    const copyToClipboard = ({ name, value }) => {
        navigator.clipboard.writeText(value || '');
        toast.success(`${name} copied to clipboard`);
    };

    const markAsWithdrawn = async () => {
        try {
            setIsSubmitting(true);
            const token = await getToken();
            const res = await approveWithdrawal(data.id, token);
            toast.success(res.message || 'Withdrawal approved and marked as paid out!');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to approve withdrawal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const accountFields = Array.isArray(data.account) ? data.account : [];

    return (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-xs z-100 flex items-center justify-center p-4'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
                {/* Header */}
                <div className='bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                        <h3 className='font-bold text-lg truncate'>Withdrawal Payout Request</h3>
                        <p className='text-xs text-indigo-100 truncate'>
                            Request ID: <span className='font-mono'>{data.id}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className='ml-4 p-1 hover:bg-white/20 rounded-lg text-white transition'>
                        <XIcon className='w-5 h-5' />
                    </button>
                </div>

                {/* Body */}
                <div className='flex-1 overflow-y-auto p-6 text-gray-700 max-h-[65vh] space-y-4'>
                    {/* Amount & Date Card */}
                    <div className='grid grid-cols-2 gap-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl'>
                        <div>
                            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Payout Amount</p>
                            <p className='font-extrabold text-2xl text-indigo-700 mt-0.5'>
                                {currency}{(data.amount || 0).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Requested Date</p>
                            <p className='font-medium text-sm text-gray-800 mt-1'>
                                {new Date(data.createdAt).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5'>
                            <Building size={14} className='text-indigo-600' /> Seller Bank Details
                        </h4>
                        <div className='space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200'>
                            {accountFields.length > 0 ? (
                                accountFields.map((field, index) => (
                                    <div key={index} className='w-full flex items-center justify-between gap-3 p-1 text-sm'>
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-xs text-gray-400 font-medium'>{field.name}</p>
                                            <p className='font-semibold text-gray-800 truncate'>{field.value || '—'}</p>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() => copyToClipboard(field)}
                                            className='p-1.5 hover:bg-gray-200 text-gray-500 rounded-lg transition cursor-pointer'
                                            title={`Copy ${field.name}`}
                                        >
                                            <CopyIcon className='w-4 h-4' />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className='text-xs text-gray-500'>No bank details provided.</p>
                            )}
                        </div>
                    </div>

                    {/* User Summary */}
                    <div>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5'>
                            <User size={14} className='text-indigo-600' /> Seller Profile
                        </h4>
                        <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200'>
                            <img
                                src={data.user?.image || '/placeholder-avatar.png'}
                                alt={data.user?.name}
                                className='w-10 h-10 rounded-full object-cover border border-gray-100'
                            />
                            <div className='min-w-0'>
                                <p className='font-bold text-gray-800 text-sm truncate'>{data.user?.name || 'Seller'}</p>
                                <p className='truncate text-xs text-gray-500'>{data.user?.email || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {data.isWithdrawn && (
                        <div className='p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2'>
                            <CheckCircle2 size={16} className='text-emerald-600 shrink-0' />
                            <span>This withdrawal has been approved and marked as paid out.</span>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                {!data.isWithdrawn && (
                    <div className='p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-white transition cursor-pointer'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={markAsWithdrawn}
                            disabled={isSubmitting}
                            className='flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-xl transition cursor-pointer shadow-xs'
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2Icon size={14} className='animate-spin' /> Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} /> Mark as Paid Out
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WithdrawalDetail;
