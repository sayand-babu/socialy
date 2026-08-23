import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../Controllers/paymentController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { paymentRateLimiter } from "../Middlewares/securityMiddleware.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", protect, paymentRateLimiter, createRazorpayOrder);
paymentRouter.post("/verify-payment", protect, paymentRateLimiter, verifyRazorpayPayment);

export default paymentRouter;
