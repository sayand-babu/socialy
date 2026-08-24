import crypto from "crypto";
import prisma from "../config/prisma.js";
import {
  getRazorpayInstance,
  getRazorpayKeyId,
  getRazorpayKeySecret,
} from "../config/razorpay.js";
import { ensureUserExists, getAuthData } from "../utils/userHelper.js";
import { delCache, delCachePattern } from "../config/redis.js";
import { inngest } from "../src/inngest/index.js";

/**
 * Creates a Razorpay Order for purchasing a marketplace listing
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.userId || (await getAuthData(req))?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await ensureUserExists(userId);

    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== "active") {
      return res.status(400).json({ message: "This listing is no longer available for purchase" });
    }

    if (listing.ownerId === userId) {
      return res.status(400).json({ message: "You cannot purchase your own listing" });
    }

    if (!listing.isCredentialSubmitted) {
      return res.status(400).json({
        message:
          "This account cannot be purchased yet because the seller has not submitted credentials to the Escrow Vault. Please chat with the seller to request credential submission.",
      });
    }

    const keyId = getRazorpayKeyId();
    const keySecret = getRazorpayKeySecret();
    const razorpay = getRazorpayInstance();

    // Razorpay amount is in the smallest currency unit (paise / cents)
    const amountInPaise = Math.round(Number(listing.price) * 100);

    const options = {
      amount: amountInPaise,
      currency: process.env.RAZORPAY_CURRENCY || "INR",
      receipt: `rcpt_${listing.id.replace(/-/g, "").slice(0, 20)}`,
      notes: {
        listingId: listing.id,
        buyerId: userId,
        sellerId: listing.ownerId,
        listingTitle: listing.title,
      },
    };

    let order;
    try {
      order = await razorpay.orders.create(options);
    } catch (rzpError) {
      console.error("Razorpay order creation failed:", rzpError);

      const isAuthError =
        rzpError?.statusCode === 401 ||
        rzpError?.error?.description?.toLowerCase().includes("auth") ||
        keySecret?.includes("*");

      if (isAuthError) {
        return res.status(500).json({
          message: "Razorpay Authentication Failed",
          details:
            "Your RAZORPAY_KEY_SECRET in server/.env is invalid or contains asterisks. Please verify the active Key ID and Secret.",
        });
      }

      return res.status(500).json({
        message: "Failed to initialize payment gateway order",
        details: rzpError.message || rzpError.error?.description,
      });
    }

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
      listing: {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        platform: listing.platform,
        username: listing.username,
      },
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);
    return res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Verifies the cryptographic HMAC-SHA256 signature from Razorpay and executes atomic escrow purchase
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.userId || (await getAuthData(req))?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await ensureUserExists(userId);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      listingId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !listingId) {
      return res.status(400).json({ message: "Missing required payment verification parameters" });
    }

    const keySecret = getRazorpayKeySecret();

    // Cryptographic signature verification
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid payment signature. Payment verification failed.",
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== "active") {
      return res.status(400).json({ message: "Listing has already been sold or deleted" });
    }

    if (!listing.isCredentialSubmitted) {
      return res.status(400).json({
        message: "Cannot finalize escrow purchase: Account credentials not submitted to Vault.",
      });
    }

    // Calculate 5% Platform Fee & Net Seller Payout
    const PLATFORM_FEE_PERCENT = 0.05;
    const platformFee = Math.round(listing.price * PLATFORM_FEE_PERCENT);
    const sellerPayout = Number(listing.price) - platformFee;
    const inspectionEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Atomic Database Transaction
    const [transaction, updatedListing] = await prisma.$transaction([
      // 1. Create Transaction record with Escrow Status & 24h Inspection Window
      prisma.transaction.create({
        data: {
          listingId: listing.id,
          ownerId: listing.ownerId,
          userId,
          amount: listing.price,
          platformFee,
          sellerPayout,
          isPaid: true,
          escrowStatus: "UNDER_INSPECTION",
          inspectionEndsAt,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
      }),

      // 2. Mark listing as sold
      prisma.listing.update({
        where: { id: listing.id },
        data: { status: "sold" },
      }),

      // 3. 🛡️ ESCROW VAULT HOLD: Lock net payout in seller's escrowBalance (NOT withdrawable yet)
      prisma.user.update({
        where: { id: listing.ownerId },
        data: {
          escrowBalance: { increment: sellerPayout },
        },
      }),
    ]);

    // Invalidate Redis caches
    await Promise.all([
      delCache("listings:public", `listing:detail:${listingId}`, "admin:dashboard:stats"),
      delCachePattern("listings:*"),
    ]);

    // ⚡ INNGEST: Trigger durable 24-hour inspection & auto-release workflow
    try {
      await inngest.send({
        name: "escrow/order.funded",
        data: {
          transactionId: transaction.id,
          orderId: transaction.id,
          listingId: listing.id,
          amount: listing.price,
        },
      });
    } catch (inngestErr) {
      console.warn("Inngest event dispatch warning:", inngestErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully and account credentials secured in your Escrow Vault!",
      transaction,
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Verify Razorpay Payment Error:", error);
    return res.status(500).json({ message: error.code || error.message });
  }
};
