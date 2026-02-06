import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Trash2,
  Edit,
  EyeOff,
  Wallet, 
  ArrowDownCircle, 
  CreditCard,
  Star,
  LockIcon,
} from "lucide-react";

const MyListings = () => {
  const { listings, balance } = useSelector((state) => state.listing);
  // const listings = [];
  // const balance = { earned: 0, withdrawn: 0, available: 0 }; // Mock balance data
  const navigate = useNavigate();

  const totalListings = listings.length;
  const activeListings = listings.filter(
    (listing) => listing.status === "active"
  ).length;
  const soldListings = listings.filter(
    (listing) => listing.status === "sold"
  ).length;

  const totalValue = listings.reduce(
    (acc, listing) => acc + (listing.price || 0),
    0
  );

  return (
    <div className="mx-auto min-h-screen px-6 md:px-16 lg:px-24 xl:px-32 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Listings</h1>
          <p className="text-gray-600">
            Manage your social media account listings
          </p>
        </div>
        <button
          onClick={() => navigate("/create-listing")}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus size={18} /> New Listing
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Listings */}
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Total Listings</p>
            <h3 className="text-2xl font-semibold text-gray-800">
              {totalListings}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
            <Eye size={20} />
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Active Listings</p>
            <h3 className="text-2xl font-semibold text-gray-800">
              {activeListings}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600">
            <CheckCircle size={20} />
          </div>
        </div>

        {/* Sold Listings */}
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Sold</p>
            <h3 className="text-2xl font-semibold text-gray-800">
              {soldListings}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm">Total Value</p>
            <h3 className="text-2xl font-semibold text-gray-800">
              ${totalValue.toLocaleString()}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
  
  {/* Earned */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
      <Wallet size={20} />
    </div> 
      <p className="text-gray-500 text-sm">Earned</p>
      <h3 className="text-lg font-semibold">
        ${balance?.earned || 0}
      </h3>
      
    </div>
    
  </div>

  {/* Withdrawn */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
      <ArrowDownCircle size={20} />
    </div>
      <p className="text-gray-500 text-sm">Withdrawn</p>
      <h3 className="text-lg font-semibold">
        ${balance?.withdrawn || 0}
      </h3>
    </div>
    
  </div>

  {/* Available */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
      <CreditCard size={20} />
    </div>
      <p className="text-gray-500 text-sm">Available</p>
      <h3 className="text-lg font-semibold">
        ${balance?.available || 0}
      </h3>
    </div>
    
  </div>

</div>

      {/* Listings */}
      {listings.length === 0 ? (
  <div className="bg-white border rounded-xl p-8 text-center max-w-md mx-auto">
    <p className="text-gray-700 font-medium mb-1">
      No listings yet
    </p>
    <p className="text-sm text-gray-500 mb-4">
      Create your first listing to start selling.
    </p>

    <button
      onClick={() => navigate("/create-listing")}
      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
    >
      <Plus size={16} />
      Add Listing
    </button>
  </div>
) : (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white border rounded-xl p-5 hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {listing.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {listing.username}
                </p>
              </div>
              <div>
                <Lock size={16} className="text-gray-500" />
              </div>
              <div className="text-sm px-2 py-1 rounded-full bg-green-100 text-green-700">
                {listing.status === "active" && (
                  <Star size={14} className={`text-yellow-500 cursor-pointer ${listing.featured &&'fill-current'}`} />
                )}
              </div>
            </div>

            {/* Info */}
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              <p>{listing.followers}</p>
              <p>{listing.engagement}</p>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                ${listing.price}
              </h3>
              <div className="flex gap-2">
                <button className="p-2 border rounded-lg hover:bg-gray-100">
                  <Edit size={16} />
                </button>
                <button className="p-2 border rounded-lg hover:bg-gray-100">
                  <EyeOff size={16} />
                </button>
                <button className="p-2 border rounded-lg hover:bg-gray-100 text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
)}
    </div>
  );
};

export default MyListings;