import React, { useEffect } from 'react';
import Title from './Title';
import { useDispatch, useSelector } from 'react-redux';
import ListingCard from './ListingCard';
import { fetchPublicListings } from '../app/features/ListingSlice';

function LatestListing() {
  const dispatch = useDispatch();
  const { listings, loading, error } = useSelector((state) => state.listing);

  useEffect(() => {
    dispatch(fetchPublicListings());
  }, [dispatch]);

  const latestListings = listings.slice(0, 3);

  return (
    <div className="mt-10">
      <Title
        title="Latest Listings"
        description="Check out the latest listings on our platform."
      />
      <div className="flex flex-col gap-6 px-6 mx-auto max-w-5xl">
        {loading && <p className="text-center text-gray-600">Loading listings...</p>}

        {error && !loading && (
          <div className="text-center">
            <p className="text-red-600">Failed to load listings.</p>
            <button
              type="button"
              onClick={() => dispatch(fetchPublicListings())}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && latestListings.length === 0 && (
          <p className="text-center text-gray-600">No listings available yet.</p>
        )}

        {!loading && !error &&
          latestListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
      </div>
    </div>
  );
}

export default LatestListing;
