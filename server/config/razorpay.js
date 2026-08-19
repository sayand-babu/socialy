import "dotenv/config";
import Razorpay from "razorpay";

const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key";
const key_secret = process.env.RAZORPAY_KEY_SECRET || "placeholder_secret";

export const razorpayInstance = new Razorpay({
  key_id,
  key_secret,
});

export const RAZORPAY_KEY_ID = key_id;
export const RAZORPAY_KEY_SECRET = key_secret;
