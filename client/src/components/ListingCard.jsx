import React from 'react';
import { platformIcons } from '../assets/assets';
import { BadgeCheck, Users, TrendingUp, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
function ListingCard({ listing }) {
  const navigate = useNavigate();
  return (
    <div className="relative bg-white rounded-xl shadow-md overflow-hidden border">
      {/* FEATURED RIBBON */}
      {listing.featured && (
        <div
          className="
          absolute top-0 left-0 w-full
          bg-gradient-to-r from-pink-500 to-purple-500
          text-white text-center text-xs font-semibold
          py-1 tracking-wide uppercase z-10
        "
        >
          Featured
        </div>
      )}

      {/* CARD CONTENT */}
      <div className="p-4 pt-8">
        {/* HEADER */}
        <div className="flex items-start gap-3">
          <div className="mt-1">{platformIcons[listing.platform]}</div>

          <div className="flex-1">
            <h2 className="font-semibold text-sm">{listing.title}</h2>

            <p className="text-xs text-gray-500">
              @{listing.username} ·{' '}
              <span className="capitalize">{listing.platform}</span>
            </p>
          </div>

          {(listing.platformAssured || listing.isCredentialVerified) && (
            <BadgeCheck className="text-emerald-500 mt-1" size={18} title="Verified by Socialy Admin" />
          )}
        </div>

        {/* STATS */}
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{listing.followers_count.toLocaleString()} followers</span>
          </div>
          {listing.engagement_rate && (
            <div className="flex items-center gap-1">
              <TrendingUp size={16} />
              <span>{listing.engagement_rate}% engagement</span>
            </div>
          )}
        </div>

        {/* TAGS & BADGES */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 capitalize font-medium">
            {listing.niche}
          </span>

          {listing.country && (
            <span className="flex items-center gap-1 text-gray-500">
              <MapPin size={13} />
              {listing.country}
            </span>
          )}

          {listing.platformAssured ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100">
              🛡️ Platform Assured
            </span>
          ) : listing.isCredentialSubmitted ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100">
              🔒 Escrow Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium text-[11px] border border-amber-100">
              💬 Chat to Buy
            </span>
          )}
        </div>

        {/* DESCRIPTION */}
        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
          {listing.description}
        </p>
        <hr className="my-5 border-gray-200" />

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-3 ">
          <p className="text-lg font-bold text-gray-900">
            {import.meta.env.VITE_CURRENCY || '₹'}{listing.price.toLocaleString()}
          </p>

          <button
            onClick={() => {
              navigate(`/listing/${listing.id}`);
            }}
            className="
            px-4 py-2 text-sm font-medium
            text-white rounded-lg
            bg-indigo-600 hover:bg-indigo-700
          "
          >
            More Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default ListingCard;
