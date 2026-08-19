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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getUserOrders } from '../services/listingService';

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

export default function MyOrders() {
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const currency = import.meta.env.VITE_CURRENCY || '₹';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

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

  if (loading) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-gray-500">Loading your orders & credentials...</p>
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
            Access credentials and proof for all social media accounts you've acquired
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
            const { id, listing, credential, amount, createdAt } = order;
            const isExpanded = expandedId === id;

            // Pick available credential fields
            const credentialList =
              credential?.updatedCredential?.length > 0
                ? credential.updatedCredential
                : credential?.originalCredential?.length > 0
                ? credential.originalCredential
                : [];

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

                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={12} /> Paid & Escrow Secured
                        </span>
                        {listing?.verified && (
                          <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                            Platform Verified
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

                {/* ===== CREDENTIALS VAULT ===== */}
                {isExpanded && (
                  <div className="pt-5 space-y-3 animate-in fade-in duration-150">
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                      <ShieldCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Buyer Safety Checklist:</strong> Log into the account immediately, verify follower metrics, update the account password, and bind your own email address and phone number.
                      </div>
                    </div>

                    {credentialList.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                        Credentials will be released by escrow shortly. Contact support if delay persists.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {credentialList.map((cred, idx) => {
                          const fieldKey = `${order.id}-${idx}`;
                          const isPassword = cred.type === 'password' || cred.name?.toLowerCase().includes('password') || cred.name?.toLowerCase().includes('pin');
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
    </div>
  );
}
