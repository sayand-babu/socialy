import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

/* ===================== CONSTANTS ===================== */
const platforms = [
  'youtube',
  'instagram',
  'tiktok',
  'facebook',
  'twitter',
  'linkedin',
  'pinterest',
  'snapchat',
  'twitch',
  'discord',
];

const niches = [
  'lifestyle',
  'fitness',
  'food',
  'travel',
  'tech',
  'gaming',
  'fashion',
  'beauty',
  'business',
  'education',
  'entertainment',
  'music',
  'art',
  'sports',
  'health',
  'finance',
  'other',
];

const ageRanges = [
  '13-17 years',
  '18-24 years',
  '25-34 years',
  '35-44 years',
  '45-54 years',
  '55+ years',
  'Mixed ages',
];

/* ===================== COMPONENT ===================== */
const ManageListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userListings } = useSelector((state) => state.listing);

  const [loadingListing, setLoadingListing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    platform: '',
    username: '',
    niche: '',
    followers_count: '',
    engagement_rate: '',
    monthly_views: '',
    country: '',
    age_range: '',
    verified: false,
    monetized: false,
    price: '',
    description: '',
    images: [],
  });

  /* ===================== EDIT MODE ===================== */
  useEffect(() => {
    if (!id) return;

    setIsEditing(true);
    setLoadingListing(true);

    const listing = userListings.find((l) => l.id === id);

    if (!listing) {
      toast.error('Listing not found');
      navigate('/my-listings');
      return;
    }

    setFormData({
      ...listing,
      images: listing.images || [],
    });

    setLoadingListing(false);
  }, [id, userListings, navigate]);

  /* ===================== HANDLERS ===================== */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /* ✅ FINAL IMAGE UPLOAD LOGIC */
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remainingSlots = 5 - formData.images.length;

    if (remainingSlots <= 0) {
      toast.error('You can upload only 5 images');
      return;
    }

    if (files.length > remainingSlots) {
      toast.error('You can upload only 5 images');
    }

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files.slice(0, remainingSlots)],
    }));

    // Reset input so same file selection triggers again
    e.target.value = '';
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(isEditing ? 'UPDATE LISTING' : 'CREATE LISTING', formData);
  };

  /* ===================== UI ===================== */
  if (loadingListing) {
    return <div className="p-6">Loading listing...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {isEditing ? 'Edit Listing' : 'List Your Account'}
        </h1>
        <p className="text-sm text-gray-500">
          {isEditing
            ? 'Update your listing details'
            : 'Create a mock listing to display your account info'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BASIC INFORMATION */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">Basic Information</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="label">Listing Title *</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Premium Travel Instagram Account"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Platform *</label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select platform</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Username / Handle *</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="e.g. @travelwithme"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Niche / Category *</label>
              <select
                name="niche"
                value={formData.niche}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select niche</option>
                {niches.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ACCOUNT METRICS */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">Account Metrics</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="label">Followers Count *</label>
              <input
                name="followers_count"
                value={formData.followers_count}
                onChange={handleChange}
                placeholder="e.g. 25,000"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Engagement Rate (%)</label>
              <input
                name="engagement_rate"
                value={formData.engagement_rate}
                onChange={handleChange}
                placeholder="e.g. 4.2"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Monthly Views / Impressions</label>
              <input
                name="monthly_views"
                value={formData.monthly_views}
                onChange={handleChange}
                placeholder="e.g. 120,000"
                className="input"
              />
            </div>
          </div>
        </section>

        {/* IMAGES */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">
            Screenshots & Proof ({formData.images.length}/5)
          </h3>

          <label
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center cursor-pointer text-gray-500
              ${formData.images.length >= 5 ? 'opacity-50' : ''}
            `}
          >
            <Upload />
            <span className="text-sm mt-1">Choose Files</span>
            <input type="file" multiple hidden onChange={handleImageUpload} />
          </label>

          {formData.images.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {formData.images.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={
                      typeof img === 'string' ? img : URL.createObjectURL(img)
                    }
                    alt=""
                    className="w-20 h-20 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            {isEditing ? 'Update Listing' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManageListing;
