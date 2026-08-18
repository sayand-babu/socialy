import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@clerk/clerk-react';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createListing, updateListing } from '../services/listingService';
import { fetchUserListings } from '../app/features/ListingSlice';

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
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const { userListings } = useSelector((state) => state.listing);

  const [loadingListing, setLoadingListing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  /* ===================== FORM VALIDATION ===================== */
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Listing title is required');
      return false;
    }
    if (!formData.platform) {
      toast.error('Platform is required');
      return false;
    }
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return false;
    }
    if (!formData.niche) {
      toast.error('Niche is required');
      return false;
    }
    if (!formData.followers_count || isNaN(formData.followers_count)) {
      toast.error('Followers count must be a valid number');
      return false;
    }
    if (!formData.price || isNaN(formData.price)) {
      toast.error('Price must be a valid number');
      return false;
    }
    if (!formData.age_range) {
      toast.error('Age range is required');
      return false;
    }
    if (formData.images.length === 0) {
      toast.error('Please upload at least one image');
      return false;
    }
    return true;
  };

  /* ===================== FORM SUBMISSION ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error('Please sign in before submitting a listing');
      }

      // Build FormData for API
      const formDataToSend = new FormData();

      // Add account details as JSON string
      const accountDetails = {
        title: formData.title,
        platform: formData.platform.toLowerCase(),
        username: formData.username.startsWith('@')
          ? formData.username.slice(1)
          : formData.username,
        niche: formData.niche.toLowerCase(),
        followers_count: parseFloat(formData.followers_count),
        engagement_rate: formData.engagement_rate
          ? parseFloat(formData.engagement_rate)
          : 0,
        monthly_views: formData.monthly_views
          ? parseFloat(formData.monthly_views)
          : 0,
        price: parseFloat(formData.price),
        description: formData.description || '',
        country: formData.country || '',
        age_range: formData.age_range,
        verified: formData.verified,
        monetized: formData.monetized,
      };

      if (isEditing) {
        accountDetails.id = id;
        // Include existing images that are strings (already uploaded)
        accountDetails.images = formData.images.filter(
          (img) => typeof img === 'string'
        );
      }

      formDataToSend.append('accountDetails', JSON.stringify(accountDetails));

      // Add only new image files (File objects, not strings)
      const newImages = formData.images.filter((img) => img instanceof File);
      newImages.forEach((file) => {
        formDataToSend.append('images', file);
      });

      // Call API
      let response;
      if (isEditing) {
        response = await updateListing(formDataToSend, token);
      } else {
        response = await createListing(formDataToSend, token);
      }

      toast.success(
        isEditing ? 'Listing updated successfully!' : 'Listing created successfully!'
      );

      // Refresh user listings
      dispatch(fetchUserListings(token));

      // Navigate to my listings
      setTimeout(() => {
        navigate('/my-listings');
      }, 500);
    } catch (error) {
      console.error('Error submitting listing:', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to submit listing';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
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

        {/* PRICING & LOCATION */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">Pricing & Location</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="label">Price (USD) *</label>
              <input
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 2500"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Country</label>
              <input
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="e.g. USA"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Audience Age Range *</label>
              <select
                name="age_range"
                value={formData.age_range}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select age range</option>
                {ageRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* DESCRIPTION */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">Description</h3>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your account, audience, content type, etc."
            rows="4"
            className="input"
          />
        </section>

        {/* VERIFICATION STATUS */}
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-medium mb-4">Account Status</h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="verified"
                checked={formData.verified}
                onChange={handleChange}
                id="verified"
                className="w-4 h-4"
              />
              <label htmlFor="verified" className="cursor-pointer">
                Platform Verified Account
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="monetized"
                checked={formData.monetized}
                onChange={handleChange}
                id="monetized"
                className="w-4 h-4"
              />
              <label htmlFor="monetized" className="cursor-pointer">
                Monetization Enabled
              </label>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded-lg"
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditing ? 'Update Listing' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManageListing;
