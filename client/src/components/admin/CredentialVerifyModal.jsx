import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRightFromSquareIcon,
  CopyIcon,
  Loader2Icon,
  XIcon,
  ShieldCheck,
  AlertTriangle,
  Flag,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getProfileLink } from '../../assets/assets';
import {
  verifyCredential,
  rejectListingCredential,
  flagListingFraud,
} from '../../services/adminService';

const CredentialVerifyModal = ({ listing, onClose }) => {
  const { getToken } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-action views: 'NORMAL' | 'REPORT_BUG' | 'FLAG_FRAUD'
  const [actionView, setActionView] = useState('NORMAL');
  const [rejectReason, setRejectReason] = useState(
    'Invalid password or 2FA credentials. Please update with working login details.'
  );
  const [flagReason, setFlagReason] = useState(
    'Account metrics misrepresentation or fraudulent credentials.'
  );

  const credential = listing?.credential;
  const profileLink = getProfileLink(listing?.platform, listing?.username);

  const copyToClipboard = ({ name, value }) => {
    navigator.clipboard.writeText(value);
    toast.success(`${name} copied to clipboard`);
  };

  // 1. Verify Credentials & Mark Platform Verified
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

  // 2. Report Bug / Request Fix from Seller
  const handleRejectCredential = async (e) => {
    e?.preventDefault();
    try {
      setIsSubmitting(true);
      const token = await getToken();
      const res = await rejectListingCredential(listing.id, rejectReason, token);
      toast.success(res.message || 'Issue reported to seller for credential correction.');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to report credential issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Flag Malicious Listing & Penalize Seller
  const handleFlagListing = async (e) => {
    e?.preventDefault();
    if (!window.confirm('Are you sure you want to flag and permanently delist this listing?')) return;
    try {
      setIsSubmitting(true);
      const token = await getToken();
      const res = await flagListingFraud(listing.id, flagReason, token);
      toast.success(res.message || 'Listing delisted and seller penalized.');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to flag listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg truncate">{listing?.title}</h3>
            <p className="text-xs text-indigo-100 truncate">
              Verifying Escrow Credentials for{' '}
              <span className="font-semibold text-white">@{listing?.username}</span> ({listing?.platform})
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-white/20 rounded-lg text-white transition cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col gap-4 p-6 overflow-y-auto max-h-[65vh] text-gray-700">
          {/* Credentials Display */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Submitted Login Credentials
            </h4>
            {credential?.originalCredential?.length > 0 ? (
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                {credential.originalCredential.map((cred, index) => (
                  <div key={index} className="w-full flex items-center justify-between gap-2 p-1 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-800">{cred.name}:</span>
                      <code className="bg-white px-2 py-0.5 rounded border border-gray-200 text-xs font-mono text-gray-900 truncate">
                        {cred.value}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cred)}
                      className="p-1 hover:bg-gray-200 text-gray-500 rounded transition cursor-pointer"
                      title={`Copy ${cred.name}`}
                    >
                      <CopyIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No credential fields available.</p>
            )}
          </div>

          {profileLink && (
            <div className="text-sm flex gap-1 items-center">
              <p className="text-gray-500">Direct Profile Link:</p>
              <Link
                to={profileLink}
                target="_blank"
                className="flex gap-1 items-center text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Open {listing?.platform} Profile
                <ArrowUpRightFromSquareIcon size={13} />
              </Link>
            </div>
          )}

          {/* View 1: REPORT BUG / REQUEST FIX TO SELLER */}
          {actionView === 'REPORT_BUG' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-600" />
                  Report Issue to Seller (Request Resubmission)
                </span>
                <button
                  type="button"
                  onClick={() => setActionView('NORMAL')}
                  className="text-xs text-amber-800 underline hover:text-amber-950 cursor-pointer"
                >
                  Back to Verify
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                This will mark the listing as <strong>faulty_resubmit_allowed</strong>. The seller will be prompted on their dashboard to fix and resubmit credentials.
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe the issue found (e.g. Password incorrect, 2FA code missing)..."
                className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionView('NORMAL')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !rejectReason.trim()}
                  onClick={handleRejectCredential}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Fix Request to Seller'}
                </button>
              </div>
            </div>
          )}

          {/* View 2: FLAG FRAUDULENT LISTING */}
          {actionView === 'FLAG_FRAUD' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <Flag size={15} className="text-red-600" />
                  Flag Malicious Listing & Delist
                </span>
                <button
                  type="button"
                  onClick={() => setActionView('NORMAL')}
                  className="text-xs text-red-800 underline hover:text-red-950 cursor-pointer"
                >
                  Back to Verify
                </button>
              </div>
              <p className="text-[11px] text-red-800">
                This will permanently <strong>delist</strong> this account and record a strike (+1 fault) against the seller. If the seller reaches 3 faults, their account is permanently banned.
              </p>
              <textarea
                rows={3}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Reason for flagging (e.g. Stolen account, fake followers, bot activity)..."
                className="w-full p-2.5 text-xs bg-white border border-red-300 rounded-lg outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActionView('NORMAL')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !flagReason.trim()}
                  onClick={handleFlagListing}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Flagging...' : 'Confirm Flag & Delist'}
                </button>
              </div>
            </div>
          )}

          {/* View 0: NORMAL VERIFICATION VIEW */}
          {actionView === 'NORMAL' && (
            <>
              <div className="flex gap-2.5 items-start mt-1 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                <input
                  type="checkbox"
                  id="verifyCheck"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="size-4 mt-0.5 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="verifyCheck" className="text-gray-700 text-xs leading-relaxed cursor-pointer select-none">
                  I have logged in and verified that these credentials are functional, and the followers, engagement, and monetization status match the listing.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {(listing?.resubmitCount || 0) < 1 ? (
                    <button
                      type="button"
                      onClick={() => setActionView('REPORT_BUG')}
                      className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-2 rounded-xl transition cursor-pointer"
                    >
                      <AlertTriangle size={13} />
                      Report Issue to Seller (1/1)
                    </button>
                  ) : (
                    <span
                      title="This listing already had 1 credential correction attempt. Further issues must be flagged."
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-xl cursor-not-allowed"
                    >
                      <AlertTriangle size={12} className="text-gray-400" />
                      Correction Limit Reached (1/1 Used)
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActionView('FLAG_FRAUD')}
                    className="flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Flag size={13} />
                    Flag Fraud & Delist
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-gray-600 hover:bg-gray-100 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyCredential}
                    disabled={!isVerified || isSubmitting}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon size={14} className="animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} /> Confirm & Verify
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialVerifyModal;
