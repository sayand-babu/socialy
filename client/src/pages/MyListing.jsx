import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import {
  Plus,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowDownCircle,
  CreditCard,
  Lock,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Trash2 as TrashIcon,
  Pencil,
  Eye,
  EyeOff,
  Star,
  Pin,
  ShieldCheck,
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
} from 'lucide-react';

import CredentialSubmission from '../components/CredentialSubmission';
import WithdrawModal from '../components/WithdrawModal';
import {
  fetchUserListings,
  updateUserListingItem,
  removeUserListingItem,
} from '../app/features/ListingSlice';
import {
  toggleListingStatus,
  deleteListing as deleteListingApi,
  markAsFeatured as markAsFeaturedApi,
  confirmHandover as confirmHandoverApi,
  submitSellerDisputeResponse as submitSellerDisputeResponseApi,
} from '../services/listingService';

/* -------- Platform Icon Helper -------- */
const getPlatformIcon = (platform) => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return <Instagram className="w-5 h-5 text-pink-500" />;
    case 'youtube':
      return <Youtube className="w-5 h-5 text-red-500" />;
    case 'twitter':
      return <Twitter className="w-5 h-5 text-sky-500" />;
    case 'facebook':
      return <Facebook className="w-5 h-5 text-blue-600" />;
    case 'pinterest':
      return <Pin className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
};

const MyListings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const currency = import.meta.env.VITE_CURRENCY || '₹';

  const { userListings = [], balance, loading } = useSelector(
    (state) => state.listing
  );

  const [showCredentialSubmission, setShowCredentialSubmission] =
    useState(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Handover Checklist Modal State
  const [handoverListing, setHandoverListing] = useState(null);
  const [handoverChecklist, setHandoverChecklist] = useState({
    loggedOut: false,
    removed2FA: false,
    removedEmail: false,
    revokedApps: false,
  });
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  // Seller Dispute Counter-Evidence Modal State
  const [disputeResponseTx, setDisputeResponseTx] = useState(null);
  const [sellerResponseText, setSellerResponseText] = useState('');
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  // Fetch authenticated user's listings on mount
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const loadListings = async () => {
      try {
        const token = await getToken();
        if (token) {
          dispatch(fetchUserListings(token));
        }
      } catch (err) {
        console.error('Error fetching user listings:', err);
      }
    };
    loadListings();
  }, [isLoaded, isSignedIn, dispatch, getToken]);

  const totalListings = userListings.length;
  const activeListings = userListings.filter((l) => l.status === 'active').length;
  const soldListings = userListings.filter((l) => l.status === 'sold').length;
  const totalValue = userListings.reduce((acc, l) => acc + (l.price || 0), 0);

  // follower count formatting
  const formatNumberShort = (value) => {
    if (value === null || value === undefined) return '0';

    const absValue = Math.abs(value);

    if (absValue >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }

    if (absValue >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }

    if (absValue >= 1_000) {
      return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    }

    return value.toString();
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (listingId) => {
    try {
      setActionLoadingId(listingId);
      const token = await getToken();
      const res = await toggleListingStatus(listingId, token);
      if (res?.listing) {
        dispatch(updateUserListingItem(res.listing));
      } else {
        // reload listings if partial payload returned
        dispatch(fetchUserListings(token));
      }
      toast.success(res.message || 'Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete listing
  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;

    try {
      setActionLoadingId(listingId);
      const token = await getToken();
      const res = await deleteListingApi(listingId, token);
      dispatch(removeUserListingItem(listingId));
      toast.success(res.message || 'Listing deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete listing');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark as featured
  const handleMarkAsFeatured = async (listingId) => {
    try {
      setActionLoadingId(listingId);
      const token = await getToken();
      const res = await markAsFeaturedApi(listingId, token);
      if (res?.listing) {
        dispatch(updateUserListingItem(res.listing));
      } else {
        dispatch(fetchUserListings(token));
      }
      toast.success(res.message || 'Listing marked as featured');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as featured');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open handover modal
  const handleOpenHandoverModal = (listing) => {
    setHandoverListing(listing);
    setHandoverChecklist({
      loggedOut: false,
      removed2FA: false,
      removedEmail: false,
      revokedApps: false,
    });
  };

  // Submit handover checklist confirmation
  const handleConfirmHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!handoverListing) return;

    const { loggedOut, removed2FA, removedEmail, revokedApps } = handoverChecklist;
    if (!loggedOut || !removed2FA || !removedEmail || !revokedApps) {
      return toast.error('Please complete all 4 checklist items before confirming handover.');
    }

    try {
      setHandoverSubmitting(true);
      const token = await getToken();
      const res = await confirmHandoverApi(handoverListing.id, token);
      toast.success(res.message || 'Handover confirmed! Buyer can now access credentials.');
      setHandoverListing(null);
      if (token) {
        dispatch(fetchUserListings(token));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm handover');
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // Submit counter-evidence for an open dispute
  const handleSellerDisputeResponseSubmit = async (e) => {
    e.preventDefault();
    if (!disputeResponseTx || !sellerResponseText.trim()) {
      return toast.error('Please enter your counter-statement / evidence.');
    }

    try {
      setResponseSubmitting(true);
      const token = await getToken();
      const res = await submitSellerDisputeResponseApi(
        disputeResponseTx.id,
        { response: sellerResponseText.trim() },
        token
      );
      toast.success(res.message || 'Counter-evidence submitted for Admin Review!');
      setDisputeResponseTx(null);
      setSellerResponseText('');
      if (token) {
        dispatch(fetchUserListings(token));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit counter-evidence');
    } finally {
      setResponseSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen px-6 md:px-16 lg:px-24 xl:px-32 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Listings</h1>
          <p className="text-gray-600">
            Manage your social media account listings
          </p>
        </div>
        <button
          onClick={() => navigate('/create-listing')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={18} /> New Listing
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Stat title="Total Listings" value={totalListings} icon={Eye} />
        <Stat
          title="Active Listings"
          value={activeListings}
          icon={CheckCircle}
        />
        <Stat title="Sold" value={soldListings} icon={TrendingUp} />
        <Stat
          title="Total Value"
          value={`${currency}${totalValue.toLocaleString()}`}
          icon={DollarSign}
        />
      </div>

      {/* Balance Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
        {[
          { label: 'Settled Earned', value: balance?.earned, icon: Wallet, color: 'text-gray-600' },
          {
            label: 'In Escrow Hold',
            value: balance?.escrowHold,
            icon: Clock,
            color: 'text-amber-600',
            badge: 'Locked (24h)',
          },
          {
            label: 'Withdrawn',
            value: balance?.withdrawn,
            icon: ArrowDownCircle,
            color: 'text-gray-500',
          },
          {
            label: 'Available to Payout',
            value: balance?.available,
            icon: CreditCard,
            color: 'text-indigo-600',
            canWithdraw: true,
          },
        ].map((item, index) => (
          <div
            key={index}
            onClick={() =>
              item.canWithdraw && (balance?.available > 0 ? setShowWithdrawal(true) : toast('No available balance to withdraw', { icon: 'ℹ️' }))
            }
            className={`flex items-center justify-between p-4 rounded-xl border transition ${
              item.canWithdraw
                ? 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50/80 cursor-pointer shadow-2xs'
                : item.badge
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <item.icon className={`w-5 h-5 shrink-0 ${item.color}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-500 block text-xs truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="font-bold text-gray-900 text-base sm:text-lg block truncate">
                  {currency}{(item.value || 0).toLocaleString()}
                </span>
              </div>
            </div>
            {item.canWithdraw && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  balance?.available > 0
                    ? setShowWithdrawal(true)
                    : toast('No available balance to withdraw', { icon: 'ℹ️' });
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer shrink-0 ml-2"
              >
                Withdraw
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Escrow Hold Info Banner */}
      {(balance?.escrowHold || 0) > 0 && (
        <div className="mb-8 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">
                You have {currency}{balance.escrowHold.toLocaleString()} held in 24-Hour Escrow Inspection
              </p>
              <p className="text-amber-800 text-xs mt-0.5">
                Once the buyer verifies credentials (or 24 hours expire with no dispute), funds automatically transfer to your Available to Payout balance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && userListings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-gray-500">Loading your listings...</p>
        </div>
      ) : userListings.length === 0 ? (
        <EmptyState onAdd={() => navigate('/create-listing')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {userListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition relative flex flex-col justify-between"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {getPlatformIcon(listing.platform)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 leading-tight">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-gray-500">@{listing.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Credentials status popover */}
                    <div className="relative group">
                      <Lock
                        size={16}
                        className={`cursor-pointer ${
                          listing.isCredentialSubmitted
                            ? 'text-green-600'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      />

                      <div className="invisible group-hover:visible absolute right-0 top-0 pt-5 z-20">
                        <div className="bg-white text-gray-600 text-xs rounded-lg border border-gray-200 p-3 shadow-lg min-w-[160px]">
                          {!listing.isCredentialSubmitted && (
                            <>
                              <button
                                onClick={() =>
                                  setShowCredentialSubmission(listing)
                                }
                                className="flex items-center gap-2 text-nowrap hover:text-indigo-600 font-medium pb-2 border-b border-gray-100 w-full text-left"
                              >
                                <ShieldCheck size={14} />
                                Add Credentials
                              </button>
                            </>
                          )}

                          <div className="pt-2 text-nowrap">
                            Status:{' '}
                            <span
                              className={`font-semibold ${
                                listing.isCredentialSubmitted
                                  ? listing.isCredentialVerified
                                    ? listing.isCredentialChanged
                                      ? 'text-green-600'
                                      : 'text-indigo-600'
                                    : 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {listing.isCredentialSubmitted
                                ? listing.isCredentialVerified
                                  ? listing.isCredentialChanged
                                    ? 'Updated'
                                    : 'Verified'
                                  : 'Pending'
                                : 'Not Submitted'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Featured star */}
                    {listing.status === 'active' && (
                      <button
                        onClick={() => handleMarkAsFeatured(listing.id)}
                        title={
                          listing.featured
                            ? 'Featured listing'
                            : 'Click to feature listing (Premium)'
                        }
                        className="p-1 hover:bg-yellow-50 rounded transition"
                      >
                        <Star
                          size={16}
                          className={`text-yellow-500 ${
                            listing.featured ? 'fill-yellow-500' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center my-4">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Eye size={14} />
                      <span>
                        {formatNumberShort(listing.followers_count)} followers
                      </span>
                    </div>
                    {listing.engagement_rate && (
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp size={14} />
                        <span>{listing.engagement_rate}% engagement</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full uppercase ${
                      listing.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : listing.status === 'sold'
                        ? 'bg-purple-100 text-purple-700'
                        : listing.status === 'ban'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <CheckCircle size={12} />
                    {listing.status}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  {/* Price */}
                  <span className="text-xl font-bold text-gray-800">
                    {currency}{(listing.price || 0).toLocaleString()}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Delete (only if not sold) */}
                    {listing.status !== 'sold' && (
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        disabled={actionLoadingId === listing.id}
                        title="Delete listing"
                        className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    )}

                    {/* Edit (only if not sold/banned/delisted and credentials not yet locked in escrow) */}
                    {listing.status !== 'sold' &&
                      listing.status !== 'ban' &&
                      listing.status !== 'delisted' &&
                      !listing.isCredentialSubmitted && (
                        <button
                          onClick={() => navigate(`/edit-listing/${listing.id}`)}
                          title="Edit listing details"
                          className="p-2 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}

                    {/* Toggle Active / Inactive */}
                    {listing.status !== 'sold' &&
                      listing.status !== 'ban' &&
                      listing.status !== 'delisted' && (
                        <button
                          onClick={() => handleToggleStatus(listing.id)}
                          disabled={actionLoadingId === listing.id}
                          title={
                            listing.status === 'active'
                              ? 'Hide listing (make inactive)'
                              : 'Publish listing (make active)'
                          }
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        >
                          {listing.status === 'active' ? (
                            <Eye className="size-4 text-green-600" />
                          ) : (
                            <EyeOff className="size-4 text-gray-400" />
                          )}
                        </button>
                      )}
                  </div>
                </div>

                {/* Credentials reminder */}
                {!listing.isCredentialSubmitted && (
                  <>
                    <hr className="my-3 border-gray-200" />
                    <button
                      onClick={() => setShowCredentialSubmission(listing)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition"
                    >
                      <ShieldCheck size={16} /> Submit Credentials
                    </button>
                  </>
                )}

                {/* Sold Listing Handover Action & Badges */}
                {listing.status === 'sold' && !listing.isHandoverConfirmed && (
                  <>
                    <hr className="my-3 border-amber-200" />
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>Action Required: Confirm Handover</span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Your account was purchased! The buyer cannot view credentials until you confirm that you have disconnected and revoked personal access.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenHandoverModal(listing)}
                        className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer shadow-xs"
                      >
                        Complete Handover Checklist →
                      </button>
                    </div>
                  </>
                )}

                {/* Faulty Resubmit Allowed Banner */}
                {listing.status === 'faulty_resubmit_allowed' && (
                  <>
                    <hr className="my-3 border-amber-200" />
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                      <p className="font-bold text-amber-900 flex items-center gap-1">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        Credential Correction Requested
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Admin investigated a credential dispute and approved you to update the login credentials for manual verification.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCredentialSubmission(listing)}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                      >
                        Resubmit Fixed Credentials →
                      </button>
                    </div>
                  </>
                )}

                {/* Delisted Notice */}
                {listing.status === 'delisted' && (
                  <>
                    <hr className="my-3 border-red-200" />
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-1.5">
                      <X size={14} className="text-red-600 shrink-0" />
                      Listing Delisted by Administration
                    </div>
                  </>
                )}

                {/* Buyer Dispute Open Alert on this Sold Listing */}
                {(() => {
                  const disputedTx = listing.transactions?.find(
                    (t) => t.escrowStatus === 'DISPUTED'
                  );
                  if (!disputedTx) return null;

                  return (
                    <>
                      <hr className="my-3 border-red-200" />
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-red-900 flex items-center gap-1.5">
                            <AlertTriangle size={14} className="text-red-600 shrink-0" />
                            Buyer Dispute Open
                          </span>
                          <span className="text-[10px] font-semibold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            {disputedTx.disputeReason}
                          </span>
                        </div>
                        <p className="text-[11px] text-red-800 bg-white/70 p-2 rounded border border-red-100">
                          "{disputedTx.disputeProof || 'No proof text provided.'}"
                        </p>

                        {disputedTx.sellerResponse ? (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
                            <strong>Your Counter-Evidence:</strong> "{disputedTx.sellerResponse}"
                            <span className="block text-[10px] text-blue-700 mt-0.5 font-semibold">
                              (Under Admin Review)
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeResponseTx(disputedTx);
                              setSellerResponseText('');
                            }}
                            className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
                          >
                            Submit Counter-Evidence →
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}

                {listing.status === 'sold' && listing.isHandoverConfirmed && !listing.transactions?.some(t => t.escrowStatus === 'DISPUTED') && (
                  <>
                    <hr className="my-3 border-gray-100" />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span>Handover Confirmed (Credentials Released)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCredentialSubmission && (
        <CredentialSubmission
          listing={showCredentialSubmission}
          onClose={() => {
            setShowCredentialSubmission(null);
            const tokenPromise = getToken();
            tokenPromise.then((t) => t && dispatch(fetchUserListings(t)));
          }}
        />
      )}

      {showWithdrawal && (
        <WithdrawModal
          onClose={() => {
            setShowWithdrawal(false);
            const tokenPromise = getToken();
            tokenPromise.then((t) => t && dispatch(fetchUserListings(t)));
          }}
        />
      )}

      {/* Handover Checklist Modal */}
      {handoverListing && (
        <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="size-6 text-white" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    Account Handover Verification
                  </h3>
                  <p className="text-xs text-amber-100">
                    {handoverListing.title} (@{handoverListing.username || 'account'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHandoverListing(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmHandoverSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>Mandatory Safety Protocol:</strong> To protect escrow funds and avoid dispute chargebacks, you must confirm that you have completely disconnected your personal identity from this account.
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'loggedOut',
                    label: 'Active Sessions Revocation',
                    desc: 'I have logged out of all active devices and sessions on the platform (Settings > Security > Logged in Devices).',
                  },
                  {
                    key: 'removed2FA',
                    label: '2-Factor Authentication (2FA)',
                    desc: 'I have removed my personal phone number and authenticator app codes from this account.',
                  },
                  {
                    key: 'removedEmail',
                    label: 'Recovery Email & Phone',
                    desc: 'I have removed my personal recovery email and phone number to prevent unauthorized password resets.',
                  },
                  {
                    key: 'revokedApps',
                    label: 'Connected 3rd-Party Apps',
                    desc: 'I have revoked access for all third-party management tools, bots, and linked integrations.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                      handoverChecklist[item.key]
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={handoverChecklist[item.key]}
                      onChange={(e) =>
                        setHandoverChecklist((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="mt-1 size-4 rounded text-amber-600 focus:ring-amber-500 border-gray-300 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-gray-600 leading-relaxed block mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setHandoverListing(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    handoverSubmitting ||
                    !handoverChecklist.loggedOut ||
                    !handoverChecklist.removed2FA ||
                    !handoverChecklist.removedEmail ||
                    !handoverChecklist.revokedApps
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-xs"
                >
                  {handoverSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Confirm Handover & Release Credentials
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seller Counter-Evidence Submission Modal */}
      {disputeResponseTx && (
        <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-6 text-white" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    Submit Dispute Counter-Evidence
                  </h3>
                  <p className="text-xs text-red-100">
                    Dispute: {disputeResponseTx.disputeReason}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisputeResponseTx(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSellerDisputeResponseSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                <strong>Buyer's Reported Claim:</strong>
                <p className="text-red-800 bg-white/80 p-2 rounded border border-red-100">
                  "{disputeResponseTx.disputeProof || 'No proof text provided.'}"
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Your Explanation & Counter-Evidence
                </label>
                <textarea
                  rows={4}
                  value={sellerResponseText}
                  onChange={(e) => setSellerResponseText(e.target.value)}
                  placeholder="Explain why the credentials/account are valid, clarify 2FA details, or provide verification links/screenshots..."
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                  required
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Your statement will be directly presented to Socialy Administration alongside the buyer's claim for binding escrow arbitration.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDisputeResponseTx(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={responseSubmitting || !sellerResponseText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-xs cursor-pointer"
                >
                  {responseSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit to Admin Arbitration'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="py-4 text-center text-sm border-t mt-12 border-slate-200 text-gray-400">
        Copyright 2025 © Socialy All Rights Reserved.
      </p>
    </div>
  );
};

/* -------- Helpers -------- */
const Stat = ({ title, value, icon: IconComponent }) => (
  <div className="bg-white rounded-xl border p-5 flex items-center justify-between shadow-xs">
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-semibold text-gray-800 mt-1">{value}</h3>
    </div>
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
      {IconComponent && <IconComponent size={20} />}
    </div>
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="bg-white border rounded-xl p-12 text-center max-w-md mx-auto shadow-xs">
    <p className="text-gray-700 font-semibold text-lg">No listings yet</p>
    <p className="text-sm text-gray-500 my-3">
      Create your first listing to start selling your social media accounts.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
    >
      <Plus size={16} /> Add Listing
    </button>
  </div>
);

export default MyListings;
