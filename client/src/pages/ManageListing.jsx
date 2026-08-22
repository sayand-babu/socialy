import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@clerk/clerk-react';
import { Upload, X, Loader2, Sparkles, Wand2, Lightbulb, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createListing, updateListing } from '../services/listingService';
import { generateAIDescription } from '../services/aiService';
import { uploadAllListingImages } from '../services/uploadService';
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

  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAIPromptBox, setShowAIPromptBox] = useState(false);
  const MAX_PROMPT_CHARS = 250;

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

  /* ===================== AI GENERATOR ===================== */
  const handleGenerateDescription = async () => {
    if (!formData.platform) {
      toast.error('Please select a Platform first (YouTube, Instagram, etc.)');
      return;
    }
    if (!formData.niche) {
      toast.error('Please select a Niche first');
      return;
    }

    try {
      setIsGeneratingAI(true);
      const token = await getToken();
      const payload = {
        title: formData.title,
        platform: formData.platform,
        username: formData.username,
        niche: formData.niche,
        followers_count: formData.followers_count,
        engagement_rate: formData.engagement_rate,
        monthly_views: formData.monthly_views,
        monetized: formData.monetized,
        verified: formData.verified,
        country: formData.country,
        age_range: formData.age_range,
        customPrompt: customPrompt.trim(),
      };

      const res = await generateAIDescription(payload, token);
      if (res?.description) {
        setFormData((prev) => ({ ...prev, description: res.description }));
        toast.success('AI description generated! Feel free to edit or refine.', { icon: '✨' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI description. Try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePromptPillClick = (text) => {
    if (customPrompt.includes(text)) return;
    const combined = customPrompt ? `${customPrompt.trim()}, ${text}` : text;
    if (combined.length <= MAX_PROMPT_CHARS) {
      setCustomPrompt(combined);
    } else {
      toast.error(`Custom prompt limit is ${MAX_PROMPT_CHARS} characters`);
    }
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

      // 1. Upload any new Image files first via decoupled upload pipeline
      toast.loading('Uploading and optimizing listing images...', { id: 'upload-progress' });
      const uploadedImageUrls = await uploadAllListingImages(
        formData.images,
        token,
        (curr, tot) => toast.loading(`Uploading image ${curr}/${tot}...`, { id: 'upload-progress' })
      );
      toast.dismiss('upload-progress');

      if (uploadedImageUrls.length === 0) {
        throw new Error('Please upload at least one valid image');
      }

      // 2. Build lightweight JSON payload (0 MB server RAM consumption)
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
        verified: Boolean(formData.verified),
        monetized: Boolean(formData.monetized),
        images: uploadedImageUrls,
      };

      if (isEditing) {
        accountDetails.id = id;
      }

      // 3. Call API with clean JSON
      if (isEditing) {
        await updateListing({ accountDetails }, token);
      } else {
        await createListing({ accountDetails }, token);
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
      toast.dismiss('upload-progress');
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
              <label className="label">Price (₹ INR) *</label>
              <input
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 25000"
                className="input"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label">Country</label>
              <input
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="e.g. India"
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

        {/* DESCRIPTION & AI COPYWRITER */}
        <section className="bg-white border rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-medium text-gray-900">Description</h3>
              <p className="text-xs text-gray-500">Provide an overview of your audience, reach, and transfer details.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAIPromptBox(!showAIPromptBox)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition shadow-2xs cursor-pointer w-fit"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {showAIPromptBox ? 'Hide AI Assistant' : '✨ AI Copywriter Assistant'}
            </button>
          </div>

          {/* AI PROMPT BUILDER CARD */}
          {showAIPromptBox && (
            <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white border border-indigo-100 rounded-xl p-4 mb-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">AI Sales Pitch Generator</h4>
                  <p className="text-xs text-gray-500">Tailored using your platform, follower count, and custom focus points.</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Custom Focus / Selling Points <span className="text-gray-400">(Optional)</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      customPrompt.length >= MAX_PROMPT_CHARS ? 'text-red-600 font-bold' : 'text-gray-500'
                    }`}
                  >
                    {customPrompt.length} / {MAX_PROMPT_CHARS} chars
                  </span>
                </div>

                <input
                  type="text"
                  value={customPrompt}
                  maxLength={MAX_PROMPT_CHARS}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Highlight active youth audience, clean strike history, and high sponsorship value"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                />

                {/* QUICK SUGGESTIONS PILLS */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-500" /> Ideas:
                  </span>
                  {[
                    'High Sponsorship Potential',
                    'Organic Indian Audience',
                    'Monetization Ready',
                    'Clean Copyright History',
                    'High Engagement & Viral Reels',
                  ].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => handlePromptPillClick(pill)}
                      className="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full transition cursor-pointer"
                    >
                      + {pill}
                    </button>
                  ))}
                </div>

                {/* GENERATE ACTION BUTTON */}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingAI}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Sales Pitch...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your account, audience demographics, growth history, and any included bonuses..."
            rows="6"
            className="input w-full"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Tip: A detailed, transparent description helps accounts sell 3x faster with fewer buyer questions.
          </p>
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
