import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowUpRightFromSquareIcon,
  CheckCircle2,
  DollarSign,
  Loader2Icon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { getProfileLink } from '../assets/assets';
import { ShoppingBagIcon } from 'lucide-react';

const ListingDetails = () => {
  const { listingId } = useParams();
  const { listings } = useSelector((state) => state.listing);

  const [listing, setListing] = useState(null);
  const [current, setCurrent] = useState(0);

  const currency = import.meta.env.VITE_CURRENCY || '$';

  const purchaseAccount = async () => {
    // purchasne aocuunt logic
  };

  const loadchat = () => {
    // load chat logic
  };
  useEffect(() => {
    if (!listings?.length) return;

    const found = listings.find(
      (item) => String(item.id) === String(listingId)
    );

    if (found) setListing(found);
  }, [listingId, listings]);

  if (!listing) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const images = listing.images || [];
  const profileLink = getProfileLink(listing.platform, listing.username);

  const prevSlide = () => {
    setCurrent((p) => (p === 0 ? images.length - 1 : p - 1));
  };

  const nextSlide = () => {
    setCurrent((p) => (p === images.length - 1 ? 0 : p + 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-6 items-start">
        {/* ================= LEFT: MAIN CONTENT ================= */}
        <div className="flex-1 min-w-0">
          {/* TOP SECTION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gray-100">
                  {listing.platformIcon}
                </div>

                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    {listing.title}
                    {profileLink && (
                      <Link to={profileLink} target="_blank">
                        <ArrowUpRightFromSquareIcon className="size-4 hover:text-indigo-500" />
                      </Link>
                    )}
                  </h2>

                  <p className="text-sm text-gray-500">
                    @{listing.username} ·{' '}
                    {listing.platform?.charAt(0).toUpperCase() +
                      listing.platform?.slice(1)}
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
                        <DollarSign className="w-3 h-3 mr-1" />
                        Monetized
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block bg-indigo-600 text-white text-lg font-semibold px-4 py-2 rounded-lg">
                  {currency}
                  {listing.price}
                </div>
                <p className="text-xs text-gray-400 mt-1">USD</p>
              </div>
            </div>
          </div>

          {/* IMAGE SECTION */}
          {images.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
              <div className="p-4">
                <h4 className="font-semibold text-gray-800">
                  Screenshots & Proof
                </h4>
              </div>

              <div className="relative w-full aspect-video overflow-hidden">
                <div
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${current * 100}%)` }}
                >
                  {images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt="Listing Proof"
                      className="w-full shrink-0 object-cover"
                    />
                  ))}
                </div>

                <button
                  onClick={prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow"
                >
                  <ChevronLeft />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow"
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="flex justify-center gap-2 py-3">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`h-2 w-2 rounded-full ${
                      current === i ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ACCOUNT METRICS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
            <h3 className="font-semibold text-gray-800 mb-4">
              Account Metrics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <Metric label="Followers" value={listing.followers_count} />
              <Metric
                label="Engagement"
                value={`${listing.engagement_rate}%`}
              />
              <Metric label="Monthly Views" value={listing.monthly_views} />
              <Metric
                label="Listed"
                value={new Date(listing.createdAt).toLocaleDateString()}
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
            <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* ADDITIONAL DETAILS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
            <h3 className="font-semibold text-gray-800 mb-4">
              Additional Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <Detail label="Niche" value={listing.niche} />
              <Detail label="Primary Country" value={listing.country} />
              <Detail label="Audience Age" value={listing.age_range} />
              <Detail
                label="Platform Verified"
                value={listing.verified ? 'Yes' : 'No'}
              />
              <Detail
                label="Monetization"
                value={listing.monetized ? 'Enabled' : 'Disabled'}
              />
              <Detail label="Status" value={listing.status} />
            </div>
          </div>

          {/* FOOTER */}
          <div className="text-center text-xs text-gray-400 py-6">
            © {new Date().getFullYear()} Marketplace. All rights reserved.
          </div>
        </div>

        {/* ================= RIGHT: SELLER INFO ================= */}
        <div className="hidden lg:block w-[320px] shrink-0 sticky top-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Seller Information
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={listing.owner?.image}
                alt={listing.owner?.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold text-gray-800">
                  {listing.owner?.name}
                </p>
                <p className="text-sm text-gray-500">{listing.owner?.email}</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Member since{' '}
              {new Date(listing.owner?.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <button className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition">
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>

            {listing.isCredentialChanged && (
              <button className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2">
                <ShoppingBagIcon className="size-4" />
                Purchase
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div>
    <p className="text-lg font-semibold">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const Detail = ({ label, value }) => (
  <div>
    <p className="text-gray-500">{label}</p>
    <p className="font-medium text-gray-800">{value}</p>
  </div>
);

export default ListingDetails;
