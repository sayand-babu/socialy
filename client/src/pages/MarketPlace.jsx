import React, { useState, useEffect } from 'react';
import { ArrowLeftIcon, FilterIcon, Loader2Icon, AlertCircle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';
import { fetchPublicListings } from '../app/features/ListingSlice';

const Marketplace = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showFilterPhone, setShowFilterPhone] = useState(false);

  const [searchParams] = useSearchParams();
  const search = searchParams.get("search");

  // ✅ FILTER STATE (REQUIRED)
  const [filters, setFilters] = useState({
    platform: [],
    maxPrice: 100000,
    minFollowers: 0,
    niche: "",
    verified: false,
    monetized: false,
  });

  // Get listings, loading, and error from Redux
  const { listings, loading, error } = useSelector((state) => state.listing);

  // Fetch public listings on component mount
  useEffect(() => {
    dispatch(fetchPublicListings());
  }, [dispatch]);

  const filteredListings = listings.filter((listing) => {

    /* ---------------- SEARCH ---------------- */
    if (search) {
      const trimmed = search.trim().toLowerCase();

      const matchesSearch =
        listing.title?.toLowerCase().includes(trimmed) ||
        listing.username?.toLowerCase().includes(trimmed) ||
        listing.description?.toLowerCase().includes(trimmed) ||
        listing.platform?.toLowerCase().includes(trimmed) ||
        listing.niche?.toLowerCase().includes(trimmed);

      if (!matchesSearch) return false;
    }

    /* ---------------- PLATFORM ---------------- */
    if (
      filters.platform &&
      filters.platform.length > 0 &&
      !filters.platform.includes(listing.platform)
    ) {
      return false;
    }

    /* ---------------- PRICE ---------------- */
    if (filters.maxPrice && listing.price > filters.maxPrice) {
      return false;
    }

    /* ---------------- FOLLOWERS ---------------- */
    if (
      filters.minFollowers &&
      listing.followers_count < filters.minFollowers
    ) {
      return false;
    }

    /* ---------------- NICHE ---------------- */
    if (filters.niche && listing.niche !== filters.niche) {
      return false;
    }

    /* ---------------- VERIFIED ---------------- */
    if (filters.verified && listing.verified !== true) {
      return false;
    }

    /* ---------------- MONETIZED ---------------- */
    if (filters.monetized && listing.monetized !== true) {
      return false;
    }

    return true;
  });

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-32">
      {/* TOP BAR */}
      <div className="flex items-center justify-between text-slate-500">
        <button
          onClick={() => {
            navigate('/');
            window.scrollTo(0, 0);
          }}
          className="flex items-center gap-2 py-5"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Home
        </button>

        {/* MOBILE FILTER BUTTON */}
        <button
          onClick={() => setShowFilterPhone(true)}
          className="flex sm:hidden items-center gap-2 py-5"
        >
          <FilterIcon className="size-4" />
          Filters
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2Icon className="size-8 animate-spin text-indigo-600" />
            <p className="text-gray-600">Loading listings...</p>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-red-600" />
            <div>
              <p className="text-red-600 font-medium">Failed to load listings</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <button
                onClick={() => dispatch(fetchPublicListings())}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {!loading && !error && (
        <div className="relative flex items-start gap-8 pb-8">
          {/* FILTER SIDEBAR */}
          <FilterSidebar
            showFilterPhone={showFilterPhone}
            setShowFilterPhone={setShowFilterPhone}
            filters={filters}
            setFilters={setFilters}
          />

          {/* LISTINGS */}
          <div className="flex-1 grid xl:grid-cols-2 gap-4">
            {filteredListings.length > 0 ? (
              filteredListings.map((listing, index) => (
                <ListingCard key={listing.id || index} listing={listing} />
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center py-20">
                <p className="text-gray-500 text-lg">
                  {listings.length === 0
                    ? 'No listings available'
                    : 'No listings match your filters'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
