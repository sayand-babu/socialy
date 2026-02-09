import React, { useEffect, useState } from 'react';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,

  // Platform icons (lucide-safe)
  PlaySquare,
  Camera,
  UsersRound,
  AtSign,
  Send,
  MessageSquare,
  Music,
  Globe2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dummyOrders } from '../assets/assets';

/* ---------- Platform → Icon Resolver (YOUR FUNCTION, FIXED) ---------- */
const getPlatformIcon = (platform) => {
  const p = platform?.toLowerCase();

  switch (p) {
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
  const currency = import.meta.env.VITE_CURRENCY || '$';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setOrders(dummyOrders);
    setLoading(false);
  }, []);

  const mask = (val, type) => {
    if (!val && val !== 0) return '--';
    return type === 'password' ? '••••••••' : val;
  };

  const copy = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="size-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-16 lg:px-24 xl:px-32 py-6">
      <h2 className="text-2xl font-semibold mb-6">My Orders</h2>

      <div className="space-y-4">
        {orders.map((order) => {
          const { id, listing, credential, amount, createdAt } = order;
          const isExpanded = expandedId === id;

          return (
            <div
              key={id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4"
            >
              {/* ===== TOP SECTION ===== */}
              <div className="flex items-start justify-between gap-6">
                {/* LEFT */}
                <div className="flex-1">
                  <h3 className="font-semibold">{listing.title}</h3>
                  <p className="text-sm text-gray-500">
                    {listing.handle} · {listing.platform}
                  </p>

                  <div className="flex gap-2 mt-2">
                    {listing.verified && (
                      <span className="flex items-center text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </span>
                    )}
                    {listing.monetized && (
                      <span className="flex items-center text-xs bg-green-50 text-green-600 px-2 py-1 rounded-md">
                        $<span className="ml-1 font-medium">Monetized</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col items-end gap-2">
                  {/* ✅ CORRECT USAGE */}
                  {getPlatformIcon(listing.platform)}

                  <p className="text-lg font-semibold">
                    {currency}
                    {amount.toLocaleString()}
                  </p>

                  <p className="text-xs text-gray-400">
                    {new Date(createdAt).toLocaleDateString()}
                  </p>

                  <button
                    onClick={() => setExpandedId((p) => (p === id ? null : id))}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded text-sm hover:shadow"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="size-4" />
                        Hide Credentials
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4" />
                        View Credentials
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ===== CREDENTIALS ===== */}
              {isExpanded && (
                <div className="border-t pt-4 space-y-3">
                  {credential.updatedCredential.map((cred, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {cred.name}
                        </p>
                        <p className="text-xs text-gray-500">{cred.type}</p>
                      </div>

                      <code className="text-sm font-mono">
                        {mask(cred.value, cred.type)}
                      </code>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(cred.value);
                        }}
                        className="px-2 py-1 bg-white border border-gray-200 rounded hover:shadow"
                      >
                        <Copy className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
