import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  CirclePlus,
  Trash2,
} from "lucide-react";

const CredentialSubmission = ({ onClose, listing }) => {
  const [newField, setNewField] = useState("");
  const [credential, setCredential] = useState([
    { id: crypto.randomUUID(), type: "email", name: "Email", value: "" },
    { id: crypto.randomUUID(), type: "password", name: "Password", value: "" },
  ]);

  const handleAddField = () => {
    const name = newField.trim();
    if (!name) return toast.error("Field name is required");

    setCredential((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "text",
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
    setCredential((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (credential.some((c) => !c.value.trim())) {
      return toast.error("All credential fields are required");
    }

    // 🔐 Submit credentials here (API / Redux)
    console.log("Submitted credentials:", credential);

    toast.success("Credentials submitted successfully");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur flex items-center justify-center sm:p-4">
      <div className="bg-white w-full max-w-lg h-screen sm:h-[320px] sm:rounded-lg shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-800">
              {listing?.title}
            </h3>
            <p className="text-sm text-gray-500">
              Adding credentials for {listing?.platform}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {credential.map((cred, index) => (
            <div
              key={cred.id}
              className="grid grid-cols-[2fr_3fr_1fr] items-center gap-2"
            >
              <label className="text-sm font-medium text-gray-700">
                {cred.name}
              </label>

              <input
                type={cred.type}
                value={cred.value}
                onChange={(e) =>
                  handleChange(index, e.target.value)
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-indigo-500"
              />

              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-gray-500 hover:text-red-500 flex justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* Add Field */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              placeholder="Field name..."
              className="flex-1 border-b border-gray-300 text-sm outline-none py-1"
            />
            <button
              type="button"
              onClick={handleAddField}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <CirclePlus size={16} />
              Add
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md text-sm font-medium"
          >
            Submit Credentials
          </button>
        </form>
      </div>
    </div>
  );
};

export default CredentialSubmission;