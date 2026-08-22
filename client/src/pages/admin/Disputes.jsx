import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  User,
  ExternalLink,
  DollarSign,
  Filter,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllAdminDisputes, resolveAdminDispute } from '../../services/adminService';

const Disputes = () => {
  const { getToken } = useAuth();
  const currency = import.meta.env.VITE_CURRENCY || '₹';

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('DISPUTED'); // 'ALL' | 'DISPUTED' | 'COMPLETED' | 'REFUNDED'
  const [resolvingId, setResolvingId] = useState(null);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const data = await getAllAdminDisputes(token);
      setDisputes(data || []);
    } catch (err) {
      console.error('Error loading disputes:', err);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (disputeId, decision) => {
    const isRelease = decision === 'RELEASE_TO_SELLER';
    const confirmMessage = isRelease
      ? 'Are you sure you want to resolve this dispute and release escrow funds to the SELLER?'
      : 'Are you sure you want to resolve this dispute and approve a full refund to the BUYER?';

    if (!window.confirm(confirmMessage)) return;

    try {
      setResolvingId(disputeId);
      const token = await getToken();
      const res = await resolveAdminDispute(disputeId, decision, token);
      toast.success(res.message || 'Dispute resolved successfully!');
      await fetchDisputes();
    } catch (err) {
      console.error('Error resolving dispute:', err);
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolvingId(null);
    }
  };

  const filteredDisputes = disputes.filter((d) => {
    if (activeFilter === 'ALL') return true;
    return d.escrowStatus === activeFilter;
  });

  const activeCount = disputes.filter((d) => d.escrowStatus === 'DISPUTED').length;
  const completedCount = disputes.filter((d) => d.escrowStatus === 'COMPLETED').length;
  const refundedCount = disputes.filter((d) => d.escrowStatus === 'REFUNDED').length;
  const totalFrozenValue = disputes
    .filter((d) => d.escrowStatus === 'DISPUTED')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading dispute mediation cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <ShieldAlert className="size-6 text-red-600" /> Escrow Dispute Mediation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Investigate buyer-seller claims, audit credential vaults, and execute binding arbitrations
          </p>
        </div>

        <button
          onClick={fetchDisputes}
          className="text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-xl transition cursor-pointer self-start md:self-auto"
        >
          Refresh Cases
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Active Disputes</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{activeCount}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Frozen Escrow Value</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">
              {currency}{totalFrozenValue.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Released to Seller</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{completedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Refunded to Buyer</p>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">{refundedCount}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'DISPUTED', label: `Active Review (${activeCount})` },
          { key: 'ALL', label: `All Disputes (${disputes.length})` },
          { key: 'COMPLETED', label: `Resolved - Released (${completedCount})` },
          { key: 'REFUNDED', label: `Resolved - Refunded (${refundedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeFilter === tab.key
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dispute Cards List */}
      {filteredDisputes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center">
          <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No disputes found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {activeFilter === 'DISPUTED'
              ? 'All escrow transactions are healthy with zero active complaints.'
              : 'No dispute records matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDisputes.map((dispute) => {
            const {
              id,
              listing,
              amount,
              platformFee,
              sellerPayout,
              escrowStatus,
              disputeReason,
              disputeProof,
              buyer,
              seller,
              createdAt,
              resolvedAt,
            } = dispute;

            const isPending = escrowStatus === 'DISPUTED';
            const isProcessing = resolvingId === id;

            return (
              <div
                key={id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-indigo-200 transition space-y-4"
              >
                {/* Top Row: Listing Details, Verification & Trust Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {listing?.platform || 'Account'}
                      </span>
                      <h3 className="text-base font-bold text-gray-900">
                        {listing?.title || 'Account Title'}
                      </h3>
                      {listing?.verified ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Platform Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Not Verified
                        </span>
                      )}
                      {dispute.isAppealed && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                          One-Time Appeal Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Username: @{listing?.username || 'user'} · Order ID: <span className="font-mono">{id.slice(0, 8)}...</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-extrabold text-gray-900">
                      Total: {currency}{(amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Seller Payout: {currency}{(sellerPayout || amount * 0.95).toLocaleString()} (Fee: {currency}{(platformFee || amount * 0.05).toLocaleString()})
                    </div>
                  </div>
                </div>

                {/* Evidence Grid: Buyer Claim & Seller Counter-Statement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Buyer Claim Block */}
                  <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-red-900 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-red-600 shrink-0" />
                        Buyer Claim: {disputeReason || 'Unspecified Claim'}
                      </span>
                      <span className="text-[10px] font-semibold text-red-700">
                        {new Date(createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-red-100">
                      "{disputeProof || 'No additional proof text provided.'}"
                    </p>
                  </div>

                  {/* Seller Counter-Statement Block */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                        Seller Counter-Evidence
                      </span>
                      {dispute.sellerRespondedAt && (
                        <span className="text-[10px] font-semibold text-blue-700">
                          {new Date(dispute.sellerRespondedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {dispute.sellerResponse ? (
                      <p className="text-xs text-blue-900 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-blue-100">
                        "{dispute.sellerResponse}"
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 italic bg-white/70 p-2.5 rounded-lg border border-gray-100">
                        {dispute.sellerRespondBy && new Date(dispute.sellerRespondBy) > new Date()
                          ? `Awaiting seller response (24h deadline: ${new Date(dispute.sellerRespondBy).toLocaleDateString()})`
                          : 'Seller did not submit counter-evidence before the 24h deadline.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Appeal Evidence (If Appealed) */}
                {dispute.isAppealed && dispute.appealEvidence && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-xs font-bold text-amber-900 block">
                      Buyer New Evidence Submitted for Appeal:
                    </span>
                    <p className="text-xs text-amber-800 bg-white/80 p-2 rounded border border-amber-100">
                      "{dispute.appealEvidence}"
                    </p>
                  </div>
                )}

                {/* Parties Grid (Buyer & Seller) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  <div className="space-y-1">
                    <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">
                      Buyer (Complainant)
                    </span>
                    <p className="font-semibold text-gray-900">{buyer?.name || 'Buyer'}</p>
                    <p className="text-gray-500 font-mono text-[11px]">{buyer?.email || 'email not available'}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-500 uppercase tracking-wider block text-[10px]">
                        Seller (Asset Owner)
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          seller?.trustState === 'BANNED'
                            ? 'bg-red-100 text-red-700'
                            : seller?.trustState === 'FLAGGED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        Trust: {seller?.trustState || 'OK'} · Faults: {seller?.faultCount || 0}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">{seller?.name || 'Seller'}</p>
                    <p className="text-gray-500 font-mono text-[11px]">{seller?.email || 'email not available'}</p>
                  </div>
                </div>

                {/* Bottom Actions / Resolution Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div>
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                        <Clock size={14} className="animate-spin text-amber-600" />
                        Pending Admin Arbitration
                      </span>
                    ) : escrowStatus === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Resolved: Escrow Funds Released to Seller {resolvedAt && `(${new Date(resolvedAt).toLocaleDateString()})`}
                      </span>
                    ) : (
                      <div className="inline-flex flex-wrap items-center gap-2 text-xs font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
                        <span className="flex items-center gap-1">
                          <XCircle size={14} className="text-purple-600" />
                          Resolved: Buyer Refunded {resolvedAt && `(${new Date(resolvedAt).toLocaleDateString()})`}
                        </span>
                        {dispute.razorpayRefundId && (
                          <span className="font-mono font-normal text-[11px] bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-900">
                            Refund ID: {dispute.razorpayRefundId}
                          </span>
                        )}
                        {dispute.refundStatus && (
                          <span className="capitalize font-semibold text-[10px] bg-purple-200/60 text-purple-900 px-1.5 py-0.5 rounded">
                            {dispute.refundStatus}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Arbitration Buttons */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleResolve(id, 'REFUND_BUYER')}
                        className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-2 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? 'Processing...' : '💸 Refund Buyer'}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleResolve(id, 'RELEASE_TO_SELLER')}
                        className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isProcessing ? 'Processing...' : '✅ Release to Seller'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Disputes;
