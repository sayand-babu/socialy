import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { X, Wallet, Loader2, ArrowRight, Building } from "lucide-react";
import toast from "react-hot-toast";
import { submitWithdrawal } from "../services/listingService";
import { setUserBalance } from "../app/features/ListingSlice";

const WithdrawModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const { balance } = useSelector((state) => state.listing);

  const availableBalance = balance?.available || 0;
  const currency = import.meta.env.VITE_CURRENCY || "₹";

  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [account, setAccount] = useState([
    { type: "text", name: "Account Holder Name", value: "" },
    { type: "text", name: "Bank Name", value: "" },
    { type: "text", name: "Account Number", value: "" },
    { type: "text", name: "IFSC Code", value: "" },
    { type: "text", name: "Account Type (Savings/Current)", value: "Savings" },
    { type: "text", name: "UPI ID / VPA (Optional)", value: "" },
  ]);

  const handleMaxClick = () => {
    if (availableBalance > 0) {
      setAmount(String(availableBalance));
    }
  };

  const handleSubmission = async (e) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return toast.error("Please enter a valid withdrawal amount");
    }

    if (numericAmount > availableBalance) {
      return toast.error(
        `Insufficient balance. Available: ${currency}${availableBalance.toLocaleString()}`
      );
    }

    // Ensure non-optional fields are filled
    const requiredFields = account.filter((f) => !f.name.includes("Optional"));
    if (requiredFields.some((field) => !field.value.trim())) {
      return toast.error("All required bank details must be filled");
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      const payload = {
        amount: numericAmount,
        account,
      };

      const res = await submitWithdrawal(payload, token);

      if (res?.balance) {
        dispatch(setUserBalance(res.balance));
      } else {
        dispatch(
          setUserBalance({
            earned: balance?.earned || 0,
            withdrawn: (balance?.withdrawn || 0) + numericAmount,
            available: (balance?.earned || 0) - ((balance?.withdrawn || 0) + numericAmount),
          })
        );
      }

      toast.success(
        res?.message || "Withdrawal request submitted! Funds will be transferred via IMPS/NEFT in 24-48h."
      );
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit withdrawal request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Wallet className="size-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Withdraw Funds (Bank Transfer)
              </h3>
              <p className="text-xs text-indigo-100">
                Transfer your verified escrow earnings to your Indian bank account / UPI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Balance Status Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium block">
              Available to Withdraw
            </span>
            <span className="text-xl font-extrabold text-indigo-700">
              {currency}{availableBalance.toLocaleString()}
            </span>
          </div>

          <div className="text-right text-xs text-gray-400">
            <span>Total Earned: {currency}{(balance?.earned || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmission}
          className="flex flex-col gap-4 p-5 max-h-[60vh] overflow-y-auto"
        >
          {/* Amount input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Withdrawal Amount ({currency} INR)
              </label>
              <button
                type="button"
                onClick={handleMaxClick}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Max ({currency}{availableBalance.toLocaleString()})
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                max={availableBalance}
                value={amount}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-base font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1.5">
              <Building size={14} className="text-indigo-600" /> Indian Bank / UPI Payout Details
            </h4>

            {/* Bank details fields */}
            <div className="space-y-2.5">
              {account.map((field, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {field.name}
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    placeholder={`Enter ${field.name.toLowerCase()}...`}
                    onChange={(e) =>
                      setAccount((prev) =>
                        prev.map((c, i) =>
                          i === index ? { ...c, value: e.target.value } : c
                        )
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    required={!field.name.includes("Optional")}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting Payout Request...
                </>
              ) : (
                <>
                  <span>Request Payout</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;