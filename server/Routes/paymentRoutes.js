import express from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../Controllers/paymentController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const paymentRouter = express.Router();

paymentRouter.post("/create-order", protect, createRazorpayOrder);
paymentRouter.post("/verify-payment", protect, verifyRazorpayPayment);

export default paymentRouter;
