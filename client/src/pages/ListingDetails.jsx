import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowUpRightFromSquareIcon,
  CheckCircle2,
  DollarSign,
  Loader2Icon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getProfileLink } from "../assets/assets";

const ListingDetails = () => {
  const { listingId } = useParams();
  const { listings } = useSelector((state) => state.listing);

  const [listing, setListing] = useState(null);
  const [current, setCurrent] = useState(0);

  const currency = import.meta.env.VITE_CURRENCY || "$";

  useEffect(() => {
    if (!listings?.length) return;

    const found = listings.find(
      (item) => String(item.id) === String(listingId)
    );

    if (found) setListing(found);
  }, [listingId, listings]);

  /* ---------------- Loading ---------------- */
  if (!listing) {
    return (
      <div className="h-screen flex justify-center items-center">
        <Loader2Icon className="size-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  /* ---------------- Image Slider ---------------- */
  const images = listing.images || [];

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const profileLink = getProfileLink(
    listing.platform,
    listing.username
  );

  return (
    <div className="mx-auto min-h-screen px-6 md:px-16 lg:px-24 xl:px-32 py-6">

      {/* ================= TOP SECTION ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex items-center justify-between gap-4">

          {/* Left */}
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
                @{listing.username} ·{" "}
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

          {/* Right – Price */}
          <div className="text-right">
            <div className="inline-block bg-indigo-600 text-white text-lg font-semibold px-4 py-2 rounded-lg">
              {currency}
              {listing.price}
            </div>
            <p className="text-xs text-gray-400 mt-1">USD</p>
          </div>

        </div>
      </div>

      {/* ================= IMAGE SECTION ================= */}
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

            {/* Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 py-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-2 w-2 rounded-full ${
                  current === index
                    ? "bg-indigo-600"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ================= DESCRIPTION ================= */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Description
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          {listing.description || "No description provided."}
        </p>
      </div>
    </div>
  );
};

export default ListingDetails;
