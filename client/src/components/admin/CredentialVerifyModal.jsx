import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRightFromSquareIcon, CopyIcon, Loader2Icon, XIcon, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getProfileLink } from '../../assets/assets';
import { verifyCredential } from '../../services/adminService';

const CredentialVerifyModal = ({ listing, onClose }) => {
    const { getToken } = useAuth();
    const [isVerified, setIsVerified] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const credential = listing?.credential;
    const profileLink = getProfileLink(listing?.platform, listing?.username);

    const copyToClipboard = ({ name, value }) => {
        navigator.clipboard.writeText(value);
        toast.success(`${name} copied to clipboard`);
    };

    const handleVerifyCredential = async () => {
        try {
            setIsSubmitting(true);
            const token = await getToken();
            const res = await verifyCredential(listing.id, token);
            toast.success(res.message || 'Credentials verified successfully!');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to verify credentials');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-xs z-100 flex items-center justify-center p-4'>
            <div className='bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
                {/* Header */}
                <div className='bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                        <h3 className='font-bold text-lg truncate'>{listing?.title}</h3>
                        <p className='text-xs text-indigo-100 truncate'>
                            Verifying Escrow Credentials for <span className='font-semibold text-white'>@{listing?.username}</span> ({listing?.platform})
                        </p>
                    </div>
                    <button onClick={onClose} className='ml-4 p-1 hover:bg-white/20 rounded-lg text-white transition'>
                        <XIcon className='w-5 h-5' />
                    </button>
                </div>

                {/* Preview credentials */}
                <div className='flex flex-col gap-4 p-6 overflow-y-auto max-h-[65vh] text-gray-700'>
                    <div>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-gray-500 mb-2'>Submitted Login Credentials</h4>
                        {credential?.originalCredential?.length > 0 ? (
                            <div className='space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200'>
                                {credential.originalCredential.map((cred, index) => (
                                    <div key={index} className='w-full flex items-center justify-between gap-2 p-1 text-sm'>
                                        <div className='flex items-center gap-2 min-w-0'>
                                            <span className='font-semibold text-gray-800'>{cred.name}:</span>
                                            <code className='bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-mono text-gray-900 truncate'>{cred.value}</code>
                                        </div>
                                        <button
                                            type='button'
                                            onClick={() => copyToClipboard(cred)}
                                            className='p-1 hover:bg-gray-200 text-gray-500 rounded transition cursor-pointer'
                                            title={`Copy ${cred.name}`}
                                        >
                                            <CopyIcon size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='text-sm text-gray-500'>No credential fields available.</p>
                        )}
                    </div>

                    {profileLink && (
                        <div className='text-sm flex gap-1 items-center'>
                            <p className='text-gray-500'>Direct Profile Link:</p>
                            <Link to={profileLink} target='_blank' className='flex gap-1 items-center text-indigo-600 hover:text-indigo-800 font-medium'>
                                Open {listing?.platform} Profile
                                <ArrowUpRightFromSquareIcon size={13} />
                            </Link>
                        </div>
                    )}

                    <div className='flex gap-2.5 items-start mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100'>
                        <input
                            type='checkbox'
                            id='verifyCheck'
                            checked={isVerified}
                            onChange={(e) => setIsVerified(e.target.checked)}
                            className='size-4 mt-0.5 text-indigo-600 rounded cursor-pointer'
                        />
                        <label htmlFor='verifyCheck' className='text-gray-700 text-xs leading-relaxed cursor-pointer'>
                            I have logged in and verified that these credentials are functional, and the followers, engagement, and monetization status match the listing.
                        </label>
                    </div>

                    <div className='pt-2 flex justify-end gap-3'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition cursor-pointer'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleVerifyCredential}
                            disabled={!isVerified || isSubmitting}
                            className='flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-xl transition cursor-pointer shadow-xs'
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2Icon size={14} className='animate-spin' /> Verifying...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} /> Confirm & Verify
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CredentialVerifyModal;
