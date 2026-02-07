import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

import CredentialSubmission from '../components/CredentialSubmission';
import WithdrawModal from '../components/WithdrawModal';

/* -------- Platform Icon Helper -------- */
const getPlatformIcon = (platform) => {
  switch (platform) {
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
  const { listings, balance } = useSelector((state) => state.listing);
  const navigate = useNavigate();

  const [showCredentialSubmission, setShowCredentialSubmission] =
    useState(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.status === 'active').length;
  const soldListings = listings.filter((l) => l.status === 'sold').length;

  const totalValue = listings.reduce((acc, l) => acc + (l.price || 0), 0);

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
  // toggle functions
  const toggleStatus = async (listingId) => {};
  const deleteListing = async (listingId) => {};
  const markAsFeatured = async (listingId) => {};

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
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
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
        <Stat title="Total Value" value={`$${totalValue}`} icon={DollarSign} />
      </div>

      {/* Balance Section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 xl:gap-20 mb-10 bg-white rounded-xl border border-gray-200 p-6">
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
            className="flex flex-1 items-center justify-between p-4 rounded-lg border border-gray-100 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-6 h-6 text-gray-500" />
              <span className="font-medium text-gray-600">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-800">
              ${item.value || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <EmptyState onAdd={() => navigate('/create-listing')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition"
            >
              {/* Header */}
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
                  <div className="flex items-center gap-2">
                    {/* Wrapper must be relative + group */}
                    <div className="relative group">
                      {/* Lock Icon */}
                      <Lock
                        size={14}
                        className="text-gray-600 cursor-pointer"
                      />

                      {/* Hover Popover */}
                      <div className="invisible group-hover:visible absolute right-0 top-0 pt-4.5 z-10">
                        <div className="bg-white text-gray-600 text-xs rounded border border-gray-200 p-2 px-3 shadow-sm min-w-max">
                          {/* Add Credentials (only if NOT submitted) */}
                          {!listing.isCredentialSubmitted && (
                            <>
                              <button
                                onClick={() =>
                                  setShowCredentialSubmission(listing)
                                }
                                className="flex items-center gap-2 text-nowrap hover:text-indigo-600"
                              >
                                <ShieldCheck size={14} />
                                Add Credentials
                              </button>

                              <hr className="border-gray-200 my-2" />
                            </>
                          )}

                          {/* Status */}
                          <div className="text-nowrap">
                            Status :{' '}
                            <span
                              className={
                                listing.isCredentialSubmitted
                                  ? listing.isCredentialVerified
                                    ? listing.isCredentialChanged
                                      ? 'text-green-600'
                                      : 'text-indigo-600'
                                    : 'text-yellow-600'
                                  : 'text-red-600'
                              }
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
                  </div>
                  {listing.status === 'active' && (
                    <Star
                      onClick={() => markAsFeatured(listing.id)}
                      size={14}
                      className={`cursor-pointer text-yellow-500 ${
                        listing.featured ? 'fill-yellow-500' : ''
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between items-center">
                <div className=" text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Eye size={14} />
                    <span>
                      {formatNumberShort(listing.followers_count)} followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} />
                    <span>{listing.engagement_rate} % engagement</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle size={14} />
                  {listing.status}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                {/* Price */}
                <span className="text-2xl font-bold text-gray-800">
                  ${listing.price.toLocaleString()}
                </span>

                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  {/* Delete (only if not sold) */}
                  {listing.status !== 'sold' && (
                    <button
                      onClick={() => deleteListing(listing._id)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-red-500"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => navigate(`/edit-listing/${listing.id}`)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-indigo-600"
                  >
                    <Pencil className="size-4" />
                  </button>

                  {/* Toggle Active / Inactive */}
                  <button
                    onClick={() => toggleStatus(listing._id)}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {listing.status === 'active' ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Credentials */}
              {!listing.isCredentialSubmitted && (
                <>
                  <hr className="my-3 border-gray-200" />
                  <button
                    onClick={() => setShowCredentialSubmission(listing)}
                    className="text-sm font-medium text-indigo-600"
                  >
                    Add Credentials
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCredentialSubmission && (
        <CredentialSubmission
          listing={showCredentialSubmission}
          onClose={() => setShowCredentialSubmission(null)}
        />
      )}

      {showWithdrawal && (
        <WithdrawModal onClose={() => setShowWithdrawal(false)} />
      )}

      <p className="py-4 text-center text-sm border-t mt-8 border-slate-200">
        Copyright 2025 © sayand babu All Right Reserved.
      </p>
    </div>
  );
};

/* -------- Helpers -------- */
const Stat = ({ title, value, icon: Icon }) => (
  <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h3 className="text-2xl font-semibold text-gray-800">{value}</h3>
    </div>
    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100">
      <Icon size={20} />
    </div>
  </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="bg-white border rounded-xl p-8 text-center max-w-md mx-auto">
    <p className="text-gray-700 font-medium">No listings yet</p>
    <p className="text-sm text-gray-500 mb-4">
      Create your first listing to start selling.
    </p>
    <button
      onClick={onAdd}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg"
    >
      <Plus size={16} /> Add Listing
    </button>
  </div>
);

export default MyListings;
