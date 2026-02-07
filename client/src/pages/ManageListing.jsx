import React from 'react';
import { Upload } from 'lucide-react';

function ManageListing() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          List Your Account
        </h1>
        <p className="text-sm text-gray-500">
          Create a mock listing to display your account info
        </p>
      </div>

      {/* FORM */}
      <div className="space-y-6">
        {/* ================= Basic Information ================= */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-800 mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Listing Title" className="input" />

            <select className="input">
              <option>Select Platform</option>
            </select>

            <input
              type="text"
              placeholder="Username / Handle"
              className="input"
            />

            <select className="input">
              <option>Select Niche / Category</option>
            </select>
          </div>
        </section>

        {/* ================= Account Metrics ================= */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-800 mb-4">Account Metrics</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              placeholder="Followers Count"
              className="input"
            />

            <input
              type="number"
              placeholder="Engagement Rate (%)"
              className="input"
            />

            <input
              type="number"
              placeholder="Monthly Views / Impressions"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              type="text"
              placeholder="Primary Audience Country"
              className="input"
            />

            <select className="input">
              <option>Primary Audience Age Range</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-4 text-sm text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Account is verified on the platform
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" />
              Account is monetized
            </label>
          </div>
        </section>

        {/* ================= Pricing & Description ================= */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-800 mb-4">
            Pricing & Description
          </h3>

          <input
            type="number"
            placeholder="Asking Price (USD)"
            className="input mb-4"
          />

          <textarea
            rows="4"
            placeholder="Description"
            className="input resize-none"
          />
        </section>

        {/* ================= Screenshots & Proof ================= */}
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-800 mb-4">
            Screenshots & Proof
          </h3>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center text-gray-500">
            <Upload className="mb-2" />
            <button className="text-sm font-medium text-indigo-600">
              Choose Files
            </button>
            <p className="text-xs mt-1">
              Upload screenshots or proof of account analytics
            </p>
          </div>
        </section>

        {/* ================= Actions ================= */}
        <div className="flex justify-end gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            Cancel
          </button>

          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
            Create Listing
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageListing;
