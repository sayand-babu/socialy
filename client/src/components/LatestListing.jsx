import React from 'react';
import Title from './Title';
import { useSelector } from 'react-redux';
import ListingCard from './ListingCard';
function LatestListing() {
  const { listings } = useSelector((state) => state.listing);
  return (
    <div className="mt-10">
      <Title
        title="Latest Listings"
        description="Check out the latest listings on our platform."
      />
      <div className="flex flex-col gap-6 px-6 mx-auto max-w-5xl">
        {listings &&
          listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
      </div>
    </div>
  );
}

export default LatestListing;
