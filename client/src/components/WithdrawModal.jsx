import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@clerk/clerk-react";
import { X, Wallet, Loader2, ArrowRight, Building, Smartphone, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { submitWithdrawal } from "../services/listingService";
import { setUserBalance } from "../app/features/ListingSlice";

const WithdrawModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { getToken } = useAuth();
  const { balance } = useSelector((state) => state.listing);

  const availableBalance = balance?.available || 0;
  const currency = import.meta.env.VITE_CURRENCY || "₹";

  const [payoutMethod, setPayoutMethod] = useState("bank"); // "bank" | "upi"
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank Form State
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("Savings");

  // UPI Form State
  const [upiId, setUpiId] = useState("");

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

    if (!holderName.trim()) {
      return toast.error("Account holder name is required");
    }

    let accountPayload = [];

    if (payoutMethod === "bank") {
      if (!accountNumber.trim()) {
        return toast.error("Bank account number is required");
      }
      if (accountNumber !== confirmAccountNumber) {
        return toast.error("Account numbers do not match");
      }
      if (!ifscCode.trim() || ifscCode.trim().length !== 11) {
        return toast.error("Please enter a valid 11-character IFSC code");
      }

      accountPayload = [
        { type: "text", name: "Payout Method", value: "Bank Transfer (NEFT/IMPS)" },
        { type: "text", name: "Account Holder Name", value: holderName.trim() },
        { type: "text", name: "Account Number", value: accountNumber.trim() },
        { type: "text", name: "IFSC Code", value: ifscCode.trim().toUpperCase() },
        { type: "select", name: "Account Type", value: accountType },
      ];
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        return toast.error("Please enter a valid UPI ID (e.g. yourname@okhdfcbank)");
      }

      accountPayload = [
        { type: "text", name: "Payout Method", value: "UPI Transfer" },
        { type: "text", name: "Account Holder Name", value: holderName.trim() },
        { type: "text", name: "UPI ID / VPA", value: upiId.trim() },
      ];
    }

    try {
      setIsSubmitting(true);
      const token = await getToken();
      const payload = {
        amount: numericAmount,
        account: accountPayload,
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
        res?.message || "Withdrawal request submitted! Payout will be processed within 24-48 hours."
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
                Withdraw Escrow Funds
              </h3>
              <p className="text-xs text-indigo-100">
                Transfer your verified balance to your bank account or UPI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Balance Status Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-medium block">
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

        {/* Method Toggle */}
        <div className="p-5 pb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2 block">
            Choose Payout Method
          </label>
          <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPayoutMethod("bank")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs transition cursor-pointer ${
                payoutMethod === "bank"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Building size={14} />
              <span>Bank Transfer (IMPS)</span>
            </button>
            <button
              type="button"
              onClick={() => setPayoutMethod("upi")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-semibold text-xs transition cursor-pointer ${
                payoutMethod === "upi"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Smartphone size={14} />
              <span>Instant UPI</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmission}
          className="flex flex-col gap-3.5 px-5 pb-5 max-h-[60vh] overflow-y-auto"
        >
          {/* Amount input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Amount ({currency})
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
                className="w-full pl-8 pr-4 py-2 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
              />
            </div>
          </div>

          {/* Account Holder Name (Shared) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Account Holder Full Name
            </label>
            <input
              type="text"
              value={holderName}
              placeholder="e.g. John Doe (as registered in bank)"
              onChange={(e) => setHolderName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>

          {/* BANK TRANSFER FIELDS */}
          {payoutMethod === "bank" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    placeholder="Enter account number"
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Re-enter Account Number
                  </label>
                  <input
                    type="password"
                    value={confirmAccountNumber}
                    placeholder="Confirm account number"
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifscCode}
                    placeholder="e.g. HDFC0000128"
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none uppercase tracking-wide focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Current">Current Account</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* UPI FIELDS */
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                UPI ID / VPA
              </label>
              <input
                type="text"
                value={upiId}
                placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                required
              />
              <p className="text-[11px] text-gray-500">
                Ensure this UPI ID is linked to your primary bank account.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Payout Request...</span>
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