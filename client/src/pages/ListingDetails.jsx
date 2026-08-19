import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useUser, useClerk, useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { setChat } from '../app/features/ChatSlice';
import {
  ArrowUpRightFromSquareIcon,
  CheckCircle2,
  DollarSign,
  Loader2Icon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ArrowLeft,
  AlertCircle,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Pin,
  Globe2,
  ShoppingBag,
  ShieldCheck,
  X,
  Lock,
} from 'lucide-react';
import { getProfileLink } from '../assets/assets';
import { getListingById } from '../services/listingService';
import { loadRazorpayScript } from '../utils/loadRazorpay';
import { createPaymentOrder, verifyPayment } from '../services/paymentService';

/* -------- Platform Icon Helper -------- */
const getPlatformIcon = (platform) => {
  switch (platform?.toLowerCase()) {
    case 'instagram':
      return <Instagram className="w-6 h-6 text-pink-500" />;
    case 'youtube':
      return <Youtube className="w-6 h-6 text-red-500" />;
    case 'twitter':
      return <Twitter className="w-6 h-6 text-sky-500" />;
    case 'facebook':
      return <Facebook className="w-6 h-6 text-blue-600" />;
    case 'pinterest':
      return <Pin className="w-6 h-6 text-red-500" />;
    default:
      return <Globe2 className="w-6 h-6 text-gray-500" />;
  }
};

const ListingDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { listingId } = useParams();
  const { listings } = useSelector((state) => state.listing);
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const { getToken } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);

  const currency = import.meta.env.VITE_CURRENCY || '₹';

  const loadchat = () => {
    if (!user) {
      return openSignIn();
    }
    if (listing) {
      dispatch(setChat({ listing }));
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      return openSignIn();
    }

    if (user.id === listing?.ownerId) {
      return toast.error("You cannot purchase your own listing");
    }

    try {
      setIsPurchasing(true);
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Please check your internet connection.");
        setIsPurchasing(false);
        return;
      }

      const token = await getToken();
      // 1. Create order on backend
      const orderData = await createPaymentOrder(listing.id, token);

      // 2. Configure Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Socialy Escrow Marketplace",
        description: `Purchase of @${listing.username || listing.title} (${listing.platform})`,
        image: listing.images?.[0] || "/logo.svg",
        order_id: orderData.orderId,
        prefill: {
          name: user.fullName || user.username || "Buyer",
          email: user.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response) {
          try {
            await verifyPayment(
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                listingId: listing.id,
              },
              token
            );

            toast.success("🎉 Payment verified! Account credentials unlocked in your Vault.");
            navigate("/my-orders");
          } catch (verifyErr) {
            toast.error(
              verifyErr.response?.data?.message || "Payment verification failed. Please contact support."
            );
          } finally {
            setIsPurchasing(false);
            setShowPurchaseConfirm(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsPurchasing(false);
            toast("Payment window closed", { icon: "ℹ️" });
          },
        },
      };

      const razorpayModal = new window.Razorpay(options);
      razorpayModal.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error?.description || "Transaction declined"}`);
        setIsPurchasing(false);
      });
      razorpayModal.open();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate payment");
      setIsPurchasing(false);
      setShowPurchaseConfirm(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchListing = async () => {
      // Check in Redux listings first
      const foundInState = listings?.find(
        (item) => String(item.id) === String(listingId)
      );

      if (foundInState) {
        setListing(foundInState);
        setLoading(false);
        return;
      }

      // If not in state (direct URL or refresh), fetch from API
      try {
        setLoading(true);
        setError('');
        const data = await getListingById(listingId);
        if (isMounted) {
          setListing(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Listing not found or was removed.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchListing();

    return () => {
      isMounted = false;
    };
  }, [listingId, listings]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-gray-500">Loading listing details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-gray-200 rounded-2xl text-center shadow-xs">
        <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Listing Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">{error || "We couldn't find the listing you requested."}</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition"
        >
          <ArrowLeft size={16} /> Browse Marketplace
        </button>
      </div>
    );
  }

  const images = listing.images || [];
  const profileLink = getProfileLink(listing.platform, listing.username);
  const isOwner = user && user.id === listing.ownerId;
  const isAvailableForPurchase = listing.status === 'active' && !isOwner;

  const prevSlide = () => {
    setCurrent((p) => (p === 0 ? images.length - 1 : p - 1));
  };

  const nextSlide = () => {
    setCurrent((p) => (p === images.length - 1 ? 0 : p + 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Top Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition cursor-pointer"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* ================= LEFT: MAIN CONTENT ================= */}
        <div className="flex-1 min-w-0 w-full">
          {/* TOP SECTION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  {getPlatformIcon(listing.platform)}
                </div>

                <div>
                  <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                    {listing.title}
                    {profileLink && (
                      <Link to={profileLink} target="_blank" rel="noreferrer" title="Open original profile">
                        <ArrowUpRightFromSquareIcon className="size-4 text-gray-400 hover:text-indigo-600 transition" />
                      </Link>
                    )}
                  </h2>

                  <p className="text-sm text-gray-500 mt-0.5">
                    @{listing.username} ·{' '}
                    <span className="capitalize">{listing.platform}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {listing.verified && (
                      <span className="inline-flex items-center text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Platform Verified
                      </span>
                    )}

                    {listing.monetized && (
                      <span className="inline-flex items-center text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-md">
                        <DollarSign className="w-3.5 h-3.5 mr-1 text-green-600" />
                        Monetized
                      </span>
                    )}

                    {listing.featured && (
                      <span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md">
                        ★ Featured
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md uppercase ${
                        listing.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : listing.status === 'sold'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {listing.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-indigo-600 text-white text-xl font-bold px-5 py-2.5 rounded-xl shadow-xs">
                  {currency}
                  {(listing.price || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1 font-medium">INR</p>
              </div>
            </div>
          </div>

          {/* IMAGE SECTION */}
          {images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800">
                  Screenshots & Proof
                </h4>
              </div>

              <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out h-full"
                  style={{ transform: `translateX(-${current * 100}%)` }}
                >
                  {images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Proof ${index + 1}`}
                      className="w-full h-full shrink-0 object-contain"
                    />
                  ))}
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition cursor-pointer"
                    >
                      <ChevronLeft className="size-5 text-gray-800" />
                    </button>

                    <button
                      onClick={nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition cursor-pointer"
                    >
                      <ChevronRight className="size-5 text-gray-800" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex justify-center gap-2 py-3">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`h-2 w-2 rounded-full transition ${
                        current === i ? 'bg-indigo-600 w-4' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT METRICS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-xs">
            <h3 className="font-semibold text-gray-800 mb-4">
              Account Metrics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <Metric label="Followers" value={listing.followers_count} />
              <Metric
                label="Engagement"
                value={listing.engagement_rate ? `${listing.engagement_rate}%` : '--'}
              />
              <Metric
                label="Monthly Views"
                value={listing.monthly_views || '--'}
              />
              <Metric
                label="Listed"
                value={new Date(listing.createdAt).toLocaleDateString()}
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-xs">
            <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* ADDITIONAL DETAILS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-xs">
            <h3 className="font-semibold text-gray-800 mb-4">
              Additional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <Detail label="Niche" value={listing.niche} capitalize />
              <Detail label="Primary Country" value={listing.country || 'Global'} />
              <Detail label="Audience Age" value={listing.age_range || 'Not specified'} />
              <Detail
                label="Platform Verified"
                value={listing.verified ? 'Yes' : 'No'}
              />
              <Detail
                label="Monetization"
                value={listing.monetized ? 'Enabled' : 'Disabled'}
              />
              <Detail label="Listing Status" value={listing.status} capitalize />
            </div>
          </div>
        </div>

        {/* ================= RIGHT: SELLER INFO & ACTIONS ================= */}
        <div className="w-full lg:w-[320px] shrink-0 sticky top-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Seller Information
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={listing.owner?.image || '/placeholder-avatar.png'}
                alt={listing.owner?.name || 'Seller'}
                className="w-12 h-12 rounded-full object-cover border border-gray-100"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 truncate">
                  {listing.owner?.name || 'Verified Seller'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  Member since{' '}
                  {listing.owner?.createdAt
                    ? new Date(listing.owner.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : '2025'}
                </p>
              </div>
            </div>

            {/* Chat button */}
            {!isOwner && (
              <button
                onClick={loadchat}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2.5 rounded-xl transition cursor-pointer mb-3"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Seller
              </button>
            )}

            {/* Buy button */}
            {isAvailableForPurchase && (
              <button
                onClick={() => setShowPurchaseConfirm(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-xs cursor-pointer"
              >
                <ShoppingBag className="size-5" />
                Buy Now (Escrow)
              </button>
            )}

            {listing.status === 'sold' && (
              <div className="w-full text-center py-2.5 bg-purple-50 text-purple-700 rounded-xl font-semibold text-sm border border-purple-100">
                This account has been sold
              </div>
            )}

            {isOwner && (
              <button
                onClick={() => navigate(`/edit-listing/${listing.id}`)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition cursor-pointer"
              >
                Edit Your Listing
              </button>
            )}

            {/* Trust badge */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <ShieldCheck size={16} className="shrink-0" />
                <span>Protected by Socialy Escrow</span>
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Funds are held safely in escrow and only released after you inspect and verify the credentials.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PURCHASE CONFIRMATION MODAL ================= */}
      {showPurchaseConfirm && (
        <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={24} />
                <h3 className="font-bold text-lg">Confirm Escrow Purchase</h3>
              </div>
              <button
                onClick={() => setShowPurchaseConfirm(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{listing.title}</h4>
                  <p className="text-xs text-gray-500">@{listing.username} ({listing.platform})</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-indigo-700">
                    {currency}{(listing.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>Your payment is secured in Socialy's Escrow Vault.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>Account login credentials will be unlocked in your <strong>My Orders</strong> page instantly.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>You have full buyer protection and inspection window.</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm transition cursor-pointer shadow-xs"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2Icon size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>Confirm & Buy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="p-3 bg-gray-50 rounded-xl">
    <p className="text-xl font-bold text-gray-900">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
  </div>
);

const Detail = ({ label, value, capitalize }) => (
  <div className="flex justify-between border-b border-gray-100 pb-2">
    <span className="text-gray-500">{label}</span>
    <span className={`font-semibold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>
      {value}
    </span>
  </div>
);

export default ListingDetails;
