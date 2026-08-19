import "dotenv/config";
import Razorpay from "razorpay";

export const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
  return new Razorpay({
    key_id,
    key_secret,
  });
};

export const razorpayInstance = getRazorpayInstance();
export const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key";
export const getRazorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";
