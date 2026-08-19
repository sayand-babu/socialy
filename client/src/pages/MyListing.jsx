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
      <div className="flex flex-col sm:flex-row justify-between gap-4 xl:gap-20 mb-10 bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
        {[
          { label: 'Earned', value: balance?.earned, icon: Wallet },
          {
            label: 'Withdrawn',
            value: balance?.withdrawn,
            icon: ArrowDownCircle,
          },
          { label: 'Available', value: balance?.available, icon: CreditCard },
        ].map((item, index) => (
          <div
            key={index}
            onClick={() =>
              item.label === 'Available' && setShowWithdrawal(true)
            }
            className="flex flex-1 items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-indigo-200 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-6 h-6 text-gray-500" />
              <span className="font-medium text-gray-600">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-800">
              {currency}{(item.value || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

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

                    {/* Edit */}
                    <button
                      onClick={() => navigate(`/edit-listing/${listing.id}`)}
                      title="Edit listing details"
                      className="p-2 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      <Pencil className="size-4" />
                    </button>

                    {/* Toggle Active / Inactive */}
                    {listing.status !== 'sold' && listing.status !== 'ban' && (
                      <button
                        onClick={() => handleToggleStatus(listing.id)}
                        disabled={actionLoadingId === listing.id}
                        title={
                          listing.status === 'active'
                            ? 'Hide listing (make inactive)'
                            : 'Publish listing (make active)'
                        }
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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

      <p className="py-4 text-center text-sm border-t mt-12 border-slate-200 text-gray-400">
        Copyright 2025 © Socialy All Rights Reserved.
      </p>
    </div>
  );
};

/* -------- Helpers -------- */
const Stat = ({ title, value, icon: Icon }) => (
  <div className="bg-white rounded-xl border p-5 flex items-center justify-between shadow-xs">
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-semibold text-gray-800 mt-1">{value}</h3>
    </div>
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
      <Icon size={20} />
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
