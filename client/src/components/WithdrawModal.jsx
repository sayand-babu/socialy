import React, { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

const WithdrawModal = ({ onClose }) => {
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState([
    { type: "text", name: "Account Holder Name", value: "" },
    { type: "text", name: "Bank Name", value: "" },
    { type: "number", name: "Account Number", value: "" },
    { type: "text", name: "Account Type", value: "" },
    { type: "text", name: "SWIFT", value: "" },
    { type: "text", name: "Branch", value: "" },
  ]);

  const handleSubmission = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      return toast.error("Enter a valid withdrawal amount");
    }

    if (account.some((field) => !field.value.trim())) {
      return toast.error("All bank details are required");
    }

    const payload = {
      amount,
      account,
    };

    console.log("Withdraw request:", payload);

    toast.success("Withdrawal request submitted");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur bg-opacity-50 flex items-center justify-center sm:p-4">
      <div className="bg-white sm:rounded-lg shadow-2xl w-full max-w-lg h-screen sm:h-auto flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 text-white p-4 sm:rounded-t-lg flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              Withdraw Funds
            </h3>
          </div>

          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmission}
          className="flex flex-col items-start gap-4 p-4 overflow-y-scroll"
        >
          {/* Amount */}
          <div className="grid grid-cols-[2fr_3fr_1fr] items-center gap-2 w-full">
            <label className="text-sm font-medium text-gray-800">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-indigo-400"
              required
            />
          </div>

          {/* Bank Details */}
          {account.map((field, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_3fr_1fr] items-center gap-2 w-full"
            >
              <label className="text-sm font-medium text-gray-800">
                {field.name}
              </label>

              <input
                type={field.type}
                value={field.value}
                onChange={(e) =>
                  setAccount((prev) =>
                    prev.map((c, i) =>
                      i === index
                        ? { ...c, value: e.target.value }
                        : c
                    )
                  )
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-indigo-400"
                required
              />
            </div>
          ))}

          {/* Submit */}
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 mt-4 rounded-md text-sm font-medium"
          >
            Apply for Withdrawal
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;