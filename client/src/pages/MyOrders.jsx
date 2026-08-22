import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Camera,
  PlaySquare,
  AtSign,
  UsersRound,
  Music,
  Send,
  MessageSquare,
  Globe2,
  Clock,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getUserOrders,
  confirmEscrowRelease,
  raiseEscrowDispute,
  appealDispute as appealDisputeApi,
} from '../services/listingService';

/* ---------- Platform Icon Resolver ---------- */
const getPlatformIcon = (platform) => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return <Camera className="w-5 h-5 text-pink-500" />;
    case 'youtube':
      return <PlaySquare className="w-5 h-5 text-red-500" />;
    case 'twitter':
    case 'x':
      return <AtSign className="w-5 h-5 text-sky-500" />;
    case 'facebook':
      return <UsersRound className="w-5 h-5 text-blue-600" />;
    case 'tiktok':
      return <Music className="w-5 h-5 text-neutral-800" />;
    case 'telegram':
      return <Send className="w-5 h-5 text-sky-500" />;
    case 'whatsapp':
      return <MessageSquare className="w-5 h-5 text-green-600" />;
    default:
      return <Globe2 className="w-5 h-5 text-gray-500" />;
  }
};

/* ---------- Countdown Timer Formatter ---------- */
const formatTimeRemaining = (inspectionEndsAt) => {
  if (!inspectionEndsAt) return null;
  const end = new Date(inspectionEndsAt).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Inspection window expired (Auto-releasing)';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s remaining`;
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const currency = import.meta.env.VITE_CURRENCY || '₹';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Action Loading States
  const [actionLoading, setActionLoading] = useState(false);

  // Dispute Modal State
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [activeDisputeOrder, setActiveDisputeOrder] = useState(null);
  const [disputeReason, setDisputeReason] = useState('Invalid Credentials / Login Failed');
  const [disputeProof, setDisputeProof] = useState('');

  // Appeal Modal State (v3 Single-Shot 24h Appeal for Verified Listings)
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [activeAppealOrder, setActiveAppealOrder] = useState(null);
  const [appealReason, setAppealReason] = useState('New Evidence for Rejected Dispute');
  const [appealEvidence, setAppealEvidence] = useState('');

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const token = await getToken();
      if (!token) return;
      const res = await getUserOrders(token);
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchOrders();
  }, [isLoaded, isSignedIn]);

  const togglePasswordVisibility = (fieldId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label || 'Value'} copied to clipboard!`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  /* ----- Handle Confirm & Release Escrow ----- */
  const handleConfirmRelease = async (orderId) => {
    if (
      !window.confirm(
        'Are you sure you want to confirm account ownership and release escrow payout to the seller? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const token = await getToken();
      const res = await confirmEscrowRelease(orderId, token);
      toast.success(res.message || 'Escrow released successfully!');
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release escrow');
    } finally {
      setActionLoading(false);
    }
  };

  /* ----- Open Dispute Modal ----- */
  const openDisputeModal = (order) => {
    setActiveDisputeOrder(order);
    setDisputeReason('Invalid Credentials / Login Failed');
    setDisputeProof('');
    setDisputeModalOpen(true);
  };

  /* ----- Submit Escrow Dispute ----- */
  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!activeDisputeOrder) return;

    const isMetricsDispute =
      disputeReason.includes('Metrics') ||
      disputeReason.includes('Followers') ||
      disputeReason.includes('Engagement');

    const isVerified =
      activeDisputeOrder.listing?.verified === true ||
      activeDisputeOrder.listing?.verificationStatus === 'VERIFIED';

    if (isMetricsDispute && !isVerified) {
      return toast.error(
        'Metrics disputes are only permitted on platform-verified accounts. For unverified listings, please select a credential/access issue.'
      );
    }

    if (!disputeProof.trim()) {
      return toast.error('Please describe the issue in detail');
    }

    try {
      setActionLoading(true);
      const token = await getToken();
      const res = await raiseEscrowDispute(
        activeDisputeOrder.id,
        { reason: disputeReason, proof: disputeProof },
        token
      );
      toast.success(res.message || 'Dispute submitted. Escrow funds frozen.');
      setDisputeModalOpen(false);
      setActiveDisputeOrder(null);
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit dispute');
    } finally {
      setActionLoading(false);
    }
  };

  /* ----- Open Appeal Modal ----- */
  const openAppealModal = (order) => {
    setActiveAppealOrder(order);
    setAppealReason('New Evidence for Rejected Dispute');
    setAppealEvidence('');
    setAppealModalOpen(true);
  };

  /* ----- Submit Dispute Appeal ----- */
  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!activeAppealOrder) return;

    if (!appealEvidence.trim()) {
      return toast.error('Please provide detailed new evidence for your appeal.');
    }

    try {
      setActionLoading(true);
      const token = await getToken();
      const res = await appealDisputeApi(
        activeAppealOrder.id,
        { appealReason, appealEvidence },
        token
      );
      toast.success(res.message || 'Appeal submitted successfully. Re-opened for Admin Review.');
      setAppealModalOpen(false);
      setActiveAppealOrder(null);
      await fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-gray-500">Loading your orders & escrow vaults...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-gray-200 rounded-2xl text-center shadow-xs">
        <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Orders</h2>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32 py-10 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Purchased Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Access credentials, inspect accounts during the 24h escrow window, and confirm transfers
          </p>
        </div>

        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition cursor-pointer self-start sm:self-auto"
        >
          <ShoppingBag size={16} /> Browse Marketplace
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
          <p className="text-gray-500 text-sm mb-6">
            You haven't purchased any social media accounts yet. Explore the marketplace to find verified accounts.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition cursor-pointer"
          >
            Explore Accounts
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const {
              id,
              listing,
              credential,
              amount,
              escrowStatus,
              inspectionEndsAt,
              disputeReason: orderDisputeReason,
              createdAt,
            } = order;
            const isExpanded = expandedId === id;

            // Pick available credential fields
            const credentialList =
              credential?.updatedCredential?.length > 0
                ? credential.updatedCredential
                : credential?.originalCredential?.length > 0
                ? credential.originalCredential
                : [];

            const isUnderInspection = escrowStatus === 'UNDER_INSPECTION';
            const isCompleted = escrowStatus === 'COMPLETED';
            const isDisputed = escrowStatus === 'DISPUTED';
            const isRefunded = escrowStatus === 'REFUNDED';

            return (
              <div
                key={id}
                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-indigo-200 transition"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                      {getPlatformIcon(listing?.platform)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">
                          {listing?.title || 'Social Account'}
                        </h3>
                        {listing && (
                          <Link
                            to={`/listing/${listing.id}`}
                            className="text-gray-400 hover:text-indigo-600 transition"
                            title="View listing details"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">
                        @{listing?.username || 'user'} · <span className="capitalize">{listing?.platform}</span> · {listing?.niche}
                      </p>

                      {/* Escrow Status Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        {isUnderInspection && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <Clock size={13} className="text-amber-600 animate-pulse" />
                            {formatTimeRemaining(inspectionEndsAt)}
                          </span>
                        )}

                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 size={13} /> Ownership Confirmed & Funds Released
                          </span>
                        )}

                        {isDisputed && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg">
                            <AlertTriangle size={13} />{' '}
                            {order.disputeStatus === 'OPENED'
                              ? 'Dispute Open (Awaiting Seller Response)'
                              : order.disputeStatus === 'UNDER_ADMIN_REVIEW'
                              ? 'Under Admin Arbitration Review'
                              : order.disputeStatus === 'APPEALED'
                              ? 'Final Appeal Under Review'
                              : 'Escrow Frozen (Dispute Active)'}
                          </span>
                        )}

                        {isRefunded && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg">
                            Refunded (Dispute Upheld)
                          </span>
                        )}

                        {listing?.verified ? (
                          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            Platform Verified
                          </span>
                        ) : (
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                            Not Yet Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0">
                    <div>
                      <span className="text-xl font-extrabold text-gray-900">
                        {currency}{(amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400">
                      Purchased on {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    <button
                      onClick={() => setExpandedId((p) => (p === id ? null : id))}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Hide Credentials
                        </>
                      ) : (
                        <>
                          <Lock size={14} /> View Account Login
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* ===== 24-HOUR ESCROW ACTION BAR ===== */}
                {isUnderInspection && (
                  <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-600 text-white rounded-lg">
                        <Clock size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">
                          24-Hour Inspection Window Active
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Check all account details. Once verified, click Confirm to release payout to the seller.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => openDisputeModal(order)}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial text-xs font-semibold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg transition cursor-pointer"
                      >
                        Raise Dispute
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmRelease(order.id)}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition cursor-pointer shadow-xs"
                      >
                        <Check size={14} /> Confirm & Release Escrow
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispute Reason Banner if Disputed */}
                {isDisputed && orderDisputeReason && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold flex items-center gap-1.5">
                        <AlertTriangle size={15} className="text-red-600 shrink-0" />
                        Dispute Claim: {orderDisputeReason}
                      </span>
                      <span className="text-[11px] font-semibold text-red-700 bg-white/80 px-2 py-0.5 rounded border border-red-200">
                        {order.disputeStatus === 'OPENED'
                          ? '24h Seller Response Window'
                          : order.disputeStatus === 'UNDER_ADMIN_REVIEW'
                          ? 'Under Admin Review'
                          : order.disputeStatus === 'APPEALED'
                          ? 'Final Appeal'
                          : 'Under Review'}
                      </span>
                    </div>

                    <p className="text-[11px] text-red-700">
                      {order.sellerResponse
                        ? `Seller Response: "${order.sellerResponse}"`
                        : order.sellerRespondBy && new Date(order.sellerRespondBy) > new Date()
                        ? `The seller has until ${new Date(order.sellerRespondBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to submit counter-evidence before Admin Review.`
                        : 'Admin is auditing credentials and transaction history. Funds are securely frozen in escrow.'}
                    </p>
                  </div>
                )}

                {/* Appeal Option on Rejected Disputes for Verified Listings */}
                {isCompleted &&
                  order.disputeStatus === 'REJECTED' &&
                  order.listing?.verified &&
                  !order.isAppealed && (
                    <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-amber-900">
                          Previous Dispute was Rejected by Admin
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Because this is a Platform-Verified listing, you have a one-time 24-hour window to submit new evidence and appeal this decision.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAppealModal(order)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shrink-0 shadow-xs"
                      >
                        File 24h Appeal →
                      </button>
                    </div>
                  )}

                {/* ===== CREDENTIALS VAULT ===== */}
                {isExpanded && (
                  <div className="pt-5 space-y-3 animate-in fade-in duration-150">
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <ShieldCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Buyer Safety Checklist:</strong> Log into the account immediately, verify subscriber and monetization metrics, update the account password, and bind your own email address and phone number/2FA.
                      </div>
                    </div>

                    {credentialList.length === 0 ? (
                      <div className="p-6 text-center bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-1">
                          <Clock size={20} className="animate-pulse" />
                        </div>
                        <h4 className="text-sm font-bold text-amber-950">
                          Awaiting Seller Handover Verification
                        </h4>
                        <p className="text-xs text-amber-800/90 max-w-md mx-auto leading-relaxed">
                          For your security, login credentials remain encrypted in the vault until the seller confirms they have logged out of all devices, removed their phone from 2FA, and revoked recovery access.
                        </p>
                        <p className="text-[11px] font-semibold text-amber-700">
                          The 24-hour inspection timer will allow you to raise a dispute if the seller delays handover.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {credentialList.map((cred, idx) => {
                          const fieldKey = `${order.id}-${idx}`;
                          const isPassword =
                            cred.type === 'password' ||
                            cred.name?.toLowerCase().includes('password') ||
                            cred.name?.toLowerCase().includes('pin');
                          const isVisible = visiblePasswords[fieldKey];

                          return (
                            <div
                              key={idx}
                              className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  {cred.name}
                                </p>
                                <p className="font-mono text-sm font-semibold text-gray-800 truncate mt-0.5">
                                  {isPassword && !isVisible ? '••••••••••••' : cred.value}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isPassword && (
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(fieldKey)}
                                    title={isVisible ? 'Hide password' : 'Show password'}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition cursor-pointer"
                                  >
                                    {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(cred.value, cred.name)}
                                  title="Copy to clipboard"
                                  className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition cursor-pointer"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== RAISE DISPUTE MODAL ===== */}
      {disputeModalOpen && activeDisputeOrder && (
        <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-5 text-white" />
                <h3 className="font-bold text-base text-white">Raise Escrow Dispute</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="p-5 space-y-4">
              {/* Unverified Listing Dispute Notice */}
              {activeDisputeOrder?.listing?.verified !== true && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                  <strong>Notice:</strong> This account was not admin-verified prior to purchase. Per Socialy Escrow rules, <strong>Metrics disputes (follower count / engagement)</strong> are not permitted on unverified accounts. Only <strong>login, 2FA, password, or account access</strong> issues can be disputed.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Dispute Reason
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition cursor-pointer"
                >
                  <option value="Invalid Credentials / Login Failed">
                    Invalid Credentials / Login Failed
                  </option>
                  <option value="2FA / Recovery Email Locked by Seller">
                    2FA / Recovery Email Locked by Seller
                  </option>
                  {activeDisputeOrder?.listing?.verified && (
                    <option value="Account Metrics / Followers Misrepresented">
                      Account Metrics / Followers Misrepresented (Verified Only)
                    </option>
                  )}
                  <option value="Copyright Strikes / Demonetized Account">
                    Copyright Strikes / Demonetized Account
                  </option>
                  <option value="Seller Attempted Unauthorized Recovery">
                    Seller Attempted Unauthorized Recovery
                  </option>
                  <option value="Other Technical Issue">Other Technical Issue</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Detailed Explanation & Proof
                </label>
                <textarea
                  rows={4}
                  value={disputeProof}
                  onChange={(e) => setDisputeProof(e.target.value)}
                  placeholder="Describe what happened when attempting to log in, what error appeared, or provide screenshot links..."
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  required
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Raising a dispute will immediately <strong>freeze the seller's escrow payout</strong>. The seller will have 24 hours to provide counter-evidence before final Admin arbitration.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Freezing Escrow...
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} /> Submit Escrow Dispute
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== 24-HOUR APPEAL MODAL ===== */}
      {appealModalOpen && activeAppealOrder && (
        <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="size-5 text-white" />
                <div>
                  <h3 className="font-bold text-base text-white">File One-Time Appeal</h3>
                  <p className="text-xs text-amber-100">
                    {activeAppealOrder.listing?.title || 'Verified Listing'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppealModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAppealSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>Final Appeal Window:</strong> You are filing a one-time appeal on a verified purchase. You must provide <strong>new evidence</strong> (such as video recordings or screenshots) not submitted during initial review.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Appeal Reason
                </label>
                <input
                  type="text"
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  New Evidence & Findings
                </label>
                <textarea
                  rows={4}
                  value={appealEvidence}
                  onChange={(e) => setAppealEvidence(e.target.value)}
                  placeholder="Provide new proof, links to unlisted video recordings, or documentation..."
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting Appeal...
                    </>
                  ) : (
                    'Submit Final Appeal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
