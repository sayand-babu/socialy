import React, { useState } from 'react';
import { ArrowLeftIcon, FilterIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate,useSearchParams} from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';


const Marketplace = () => {
  const navigate = useNavigate();
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



  const { listings } = useSelector((state) => state.listing);

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
      listing.followers < filters.minFollowers
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

      {/* MAIN CONTENT */}
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
              <ListingCard key={index} listing={listing} />
            ))
          ) : (
            <p className="text-gray-500">No listings found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
