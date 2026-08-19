import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import {
  X,
  CirclePlus,
  Trash2,
  ShieldCheck,
  Loader2,
  Lock,
} from "lucide-react";
import { addCredential } from "../services/listingService";
import { updateUserListingItem } from "../app/features/ListingSlice";

const CredentialSubmission = ({ onClose, listing }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();

  const [newField, setNewField] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credential, setCredential] = useState([
    { id: crypto.randomUUID(), type: "email", name: "Account Email / Username", value: "" },
    { id: crypto.randomUUID(), type: "password", name: "Account Password", value: "" },
  ]);

  const handleAddField = () => {
    const name = newField.trim();
    if (!name) return toast.error("Field name is required");

    setCredential((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: name.toLowerCase().includes("password") || name.toLowerCase().includes("pin") ? "password" : "text",
        name,
        value: "",
      },
    ]);

    setNewField("");
  };

  const handleChange = (index, value) => {
    setCredential((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, value } : c
      )
    );
  };

  const handleRemove = (index) => {
    if (credential.length <= 1) {
      return toast.error("At least one credential field is required");
    }
    setCredential((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (credential.some((c) => !c.value.trim())) {
      return toast.error("All credential fields are required");
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      const res = await addCredential(listing.id, credential, token);

      if (res?.listing) {
        dispatch(updateUserListingItem(res.listing));
      } else {
        dispatch(updateUserListingItem({ ...listing, isCredentialSubmitted: true }));
      }

      toast.success(res?.message || "Credentials submitted for escrow verification!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">
                Escrow Credential Vault
              </h3>
              <p className="text-xs text-gray-500">
                Secure login details for {listing?.title || listing?.platform}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Alert */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex items-start gap-2.5 text-xs text-amber-800">
          <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <span>
            Credentials are <strong>AES-256 encrypted at rest</strong>. They will only be verified by platform escrow admins and safely transferred to the buyer upon confirmed payment.
          </span>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 p-5 space-y-3.5 max-h-[60vh] overflow-y-auto"
        >
          {credential.map((cred, index) => (
            <div
              key={cred.id}
              className="flex items-center gap-3 p-2.5 bg-gray-50/60 rounded-xl border border-gray-200/80"
            >
              <div className="w-1/3 min-w-0">
                <label className="text-xs font-semibold text-gray-700 block truncate">
                  {cred.name}
                </label>
              </div>

              <div className="flex-1">
                <input
                  type={cred.type}
                  value={cred.value}
                  placeholder={`Enter ${cred.name.toLowerCase()}...`}
                  onChange={(e) =>
                    handleChange(index, e.target.value)
                  }
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemove(index)}
                title="Remove field"
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add Additional Field */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddField();
                }
              }}
              placeholder="Add extra field (e.g. 2FA Backup Code, Recovery Email)..."
              className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs bg-gray-50/50 outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              type="button"
              onClick={handleAddField}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <CirclePlus size={14} />
              Add
            </button>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Encrypting & Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Submit to Escrow Vault
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CredentialSubmission;