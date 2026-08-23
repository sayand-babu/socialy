import prisma from "../config/prisma.js";
import { encryptData, decryptData } from "../utils/encryption.js";
import { getCache, setCache, delCache, delCachePattern } from "../config/redis.js";
import { getRazorpayInstance } from "../config/razorpay.js";
import { logAuditEvent } from "../utils/auditLogger.js";

// Helper to decrypt list of credential items
const decryptCredentialsList = (list) =>
  (list || []).map((item) => ({
    ...item,
    value: item.isEncrypted ? decryptData(item.value) : item.value,
  }));

/**
 * Get aggregated dashboard statistics (Cached in Redis for 2 minutes)
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const cacheKey = "admin:dashboard:stats";
    const cachedStats = await getCache(cacheKey);

    if (cachedStats) {
      return res.json({ ...cachedStats, cached: true });
    }

    const [totalListings, activeListings, totalUsers, revenueAgg, recentListings] =
      await Promise.all([
        prisma.listing.count({ where: { status: { not: "deleted" } } }),
        prisma.listing.count({ where: { status: "active" } }),
        prisma.user.count(),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { isPaid: true },
        }),
        prisma.listing.findMany({
          where: { status: { not: "deleted" } },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { owner: true },
        }),
      ]);

    const dashboardData = {
      totalListings,
      activeListings,
      totalUsers,
      totalRevenue: revenueAgg._sum.amount || 0,
      recentListings,
    };

    // Cache dashboard stats for 2 minutes (120 seconds)
    await setCache(cacheKey, dashboardData, 120);

    return res.json(dashboardData);
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get listings that have submitted credentials waiting for admin verification
 */
export const getUnverifiedCredentials = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        isCredentialSubmitted: true,
        isCredentialVerified: false,
        status: { not: "deleted" },
      },
      include: { owner: true },
      orderBy: { updatedAt: "desc" },
    });

    const listingIds = listings.map((l) => l.id);
    const credentials = await prisma.credential.findMany({
      where: { listingId: { in: listingIds } },
    });

    const listingsWithCredentials = listings.map((listing) => {
      const cred = credentials.find((c) => c.listingId === listing.id);
      return {
        ...listing,
        credential: cred
          ? {
              ...cred,
              originalCredential: decryptCredentialsList(cred.originalCredential),
            }
          : null,
      };
    });

    return res.json({ listings: listingsWithCredentials });
  } catch (error) {
    console.error("Get unverified credentials error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Mark listing credentials as verified
 */
export const verifyCredential = async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: "active",
        isCredentialVerified: true,
        platformAssured: true,
        verified: true,
        verificationStatus: "VERIFIED",
      },
    });

    // Invalidate Redis caches
    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats", "listings:public");
    await delCachePattern("listings:*");

    return res.json({
      message: "Credentials verified successfully and listing marked as Platform Verified",
      listing,
    });
  } catch (error) {
    console.error("Verify credential error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Reject credentials during verification and report bug/issue to seller for resubmission
 */
export const rejectListingCredential = async (req, res) => {
  try {
    const { listingId, reason } = req.body;
    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if ((listing.resubmitCount || 0) >= 1) {
      return res.status(400).json({
        message:
          "This listing has already used its single (1-time) credential resubmission allowance. You must Flag & Delist this listing.",
      });
    }

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: "faulty_resubmit_allowed",
        isCredentialVerified: false,
        isCredentialSubmitted: false,
        isHandoverConfirmed: false,
        resubmitCount: { increment: 1 },
      },
    });

    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats", "listings:public");
    await delCachePattern("listings:*");

    return res.json({
      success: true,
      message: "Credential issue reported to seller. The listing is set to faulty_resubmit_allowed for correction.",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Reject credential error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Flag fraudulent listing / fake metrics and penalize seller
 */
export const flagListingFraud = async (req, res) => {
  try {
    const { listingId, reason } = req.body;
    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const seller = await prisma.user.findUnique({
      where: { id: listing.ownerId },
    });

    const newFaultCount = (seller?.faultCount || 0) + 1;
    const newTrustState = newFaultCount >= 3 ? "BANNED" : newFaultCount === 2 ? "FLAGGED" : "OK";

    const dbOps = [
      prisma.listing.update({
        where: { id: listingId },
        data: {
          status: "delisted",
          isCredentialVerified: false,
        },
      }),
      prisma.user.update({
        where: { id: listing.ownerId },
        data: {
          faultCount: newFaultCount,
          trustState: newTrustState,
        },
      }),
    ];

    if (newTrustState === "BANNED") {
      dbOps.push(
        prisma.listing.updateMany({
          where: {
            ownerId: listing.ownerId,
            id: { not: listingId },
            status: "active",
          },
          data: { status: "delisted" },
        })
      );
    }

    await prisma.$transaction(dbOps);

    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats", "listings:public");
    await delCachePattern("listings:*");

    return res.json({
      success: true,
      message: `Listing permanently delisted. Seller strike recorded (Faults: ${newFaultCount}, Trust: ${newTrustState}).`,
      sellerFaultCount: newFaultCount,
      sellerTrustState: newTrustState,
    });
  } catch (error) {
    console.error("Flag listing error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get listings verified by admin waiting for secure credential changes
 */
export const getPendingCredentialChanges = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        isCredentialVerified: true,
        isCredentialChanged: false,
        status: { not: "deleted" },
      },
      include: { owner: true },
      orderBy: { updatedAt: "desc" },
    });

    const listingIds = listings.map((l) => l.id);
    const credentials = await prisma.credential.findMany({
      where: { listingId: { in: listingIds } },
    });

    const listingsWithCredentials = listings.map((listing) => {
      const cred = credentials.find((c) => c.listingId === listing.id);
      return {
        ...listing,
        credential: cred
          ? {
              ...cred,
              originalCredential: decryptCredentialsList(cred.originalCredential),
            }
          : null,
      };
    });

    return res.json({ listings: listingsWithCredentials });
  } catch (error) {
    console.error("Get pending credential changes error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Submit updated platform-secured credentials
 */
export const changeCredential = async (req, res) => {
  try {
    const { listingId, newCredential } = req.body;
    if (!listingId || !newCredential || !Array.isArray(newCredential)) {
      return res.status(400).json({ message: "Invalid payload or credentials" });
    }

    // Encrypt new credentials
    const encryptedNewCredentials = newCredential.map((item) => ({
      id: item.id || `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || "Field",
      type: item.type || "text",
      value: encryptData(item.value || ""),
      isEncrypted: true,
    }));

    const existingCredential = await prisma.credential.findFirst({
      where: { listingId },
    });

    if (existingCredential) {
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: { updatedCredential: encryptedNewCredentials },
      });
    } else {
      await prisma.credential.create({
        data: {
          listingId,
          updatedCredential: encryptedNewCredentials,
        },
      });
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { isCredentialChanged: true },
    });

    // Invalidate detail cache
    await delCache(`listing:detail:${listingId}`);

    return res.json({
      message: "Credentials secured & updated in escrow vault successfully",
      listing,
    });
  } catch (error) {
    console.error("Change credential error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get all listings for admin moderation
 */
export const getAllAdminListings = async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ listings });
  } catch (error) {
    console.error("Get all admin listings error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Update listing status (e.g. ban, active, inactive, deleted)
 */
export const updateAdminListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const listing = await prisma.listing.update({
      where: { id },
      data: { status },
    });

    // Invalidate Redis caches
    await delCache("listings:public", `listing:detail:${id}`, "admin:dashboard:stats");

    return res.json({
      message: `Listing status updated to ${status}`,
      listing,
    });
  } catch (error) {
    console.error("Update admin listing status error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get all platform transactions
 */
export const getAllAdminTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [...new Set(transactions.map((t) => t.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const transactionsWithUsers = transactions.map((t) => {
      const user = users.find((u) => u.id === t.userId);
      return {
        ...t,
        user: user || { id: t.userId, name: "Buyer", email: "buyer@escrow.local" },
      };
    });

    return res.json({ transactions: transactionsWithUsers });
  } catch (error) {
    console.error("Get all admin transactions error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get all withdrawal requests
 */
export const getAllAdminWithdrawals = async (req, res) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ withdrawals });
  } catch (error) {
    console.error("Get all admin withdrawals error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Approve withdrawal request
 */
export const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { isWithdrawn: true },
      include: { user: true },
    });

    // Invalidate dashboard cache
    await delCache("admin:dashboard:stats");

    return res.json({
      message: "Withdrawal approved and marked as paid out",
      withdrawal,
    });
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Get all active and historical escrow disputes
 */
export const getAllAdminDisputes = async (req, res) => {
  try {
    const disputes = await prisma.transaction.findMany({
      where: {
        escrowStatus: {
          in: ["DISPUTED", "REFUNDED", "COMPLETED"],
        },
        disputeReason: {
          not: null,
        },
      },
      include: {
        listing: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userIds = [
      ...new Set([
        ...disputes.map((d) => d.userId),
        ...disputes.map((d) => d.ownerId),
      ]),
    ];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    const disputesWithUsers = disputes.map((d) => ({
      ...d,
      buyer: users.find((u) => u.id === d.userId) || null,
      seller: users.find((u) => u.id === d.ownerId) || null,
    }));

    return res.json({ disputes: disputesWithUsers });
  } catch (error) {
    console.error("Get all admin disputes error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Resolve an escrow dispute (release to seller OR refund buyer)
 */
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params; // Transaction ID
    const { decision } = req.body; // "RELEASE_TO_SELLER" | "REFUND_BUYER"

    if (!["RELEASE_TO_SELLER", "REFUND_BUYER"].includes(decision)) {
      return res.status(400).json({
        message: "Invalid decision. Must be RELEASE_TO_SELLER or REFUND_BUYER",
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.escrowStatus !== "DISPUTED") {
      return res.status(400).json({
        message: `Dispute is already resolved or in status: ${transaction.escrowStatus}`,
      });
    }

    const sellerPayout = transaction.sellerPayout || (transaction.amount * 0.95);

    if (decision === "RELEASE_TO_SELLER") {
      // v3 Decision: Dispute Rejected -> Release funds to seller
      const finalDisputeStatus = transaction.isAppealed ? "CLOSED" : "REJECTED";

      await prisma.$transaction([
        prisma.transaction.update({
          where: { id },
          data: {
            escrowStatus: "COMPLETED",
            disputeStatus: finalDisputeStatus,
            resolvedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: transaction.ownerId },
          data: {
            escrowBalance: { decrement: sellerPayout },
            earned: { increment: sellerPayout },
          },
        }),
      ]);

      await delCache("admin:dashboard:stats");
      await delCachePattern("listings:*");

      return res.json({
        success: true,
        message: `Dispute decision: REJECTED (Escrow funds of ₹${sellerPayout.toLocaleString()} released to Seller).`,
        disputeStatus: finalDisputeStatus,
      });
    } else {
      // REFUND_BUYER: Dispute Upheld -> Issue automated Razorpay refund & apply strike engine
      if (!transaction.razorpayPaymentId) {
        return res.status(400).json({
          message:
            "Cannot process automated refund: No Razorpay payment ID found on this transaction record.",
        });
      }

      // Step 1: Calculate seller strike & trust progression
      const seller = await prisma.user.findUnique({
        where: { id: transaction.ownerId },
      });

      const currentFaultCount = seller?.faultCount || 0;
      const newFaultCount = currentFaultCount + 1;
      const newTrustState = newFaultCount >= 3 ? "BANNED" : newFaultCount === 2 ? "FLAGGED" : "OK";

      // Step 2: Determine listing post-dispute disposition
      const isMetricsDispute =
        transaction.disputeReason?.toUpperCase().includes("METRIC") ||
        transaction.disputeReason?.toUpperCase().includes("FOLLOWER") ||
        transaction.disputeReason?.toUpperCase().includes("ENGAGEMENT");

      // Metrics misrepresentation -> DELISTED permanently. Credential issues -> faulty_resubmit_allowed
      const targetListingStatus = isMetricsDispute ? "delisted" : "faulty_resubmit_allowed";

      let razorpayRefund;
      try {
        const razorpay = getRazorpayInstance();
        // Amount must be passed in paise (integer)
        const refundAmountPaise = Math.round(Number(transaction.amount) * 100);

        razorpayRefund = await razorpay.payments.refund(transaction.razorpayPaymentId, {
          amount: refundAmountPaise,
          speed: "normal",
          notes: {
            reason: transaction.disputeReason || "Admin dispute resolution refund",
            transactionId: transaction.id,
            listingId: transaction.listingId,
          },
        });
      } catch (razorpayErr) {
        console.error("Razorpay Refund API Execution Error:", razorpayErr);
        const errDesc =
          razorpayErr?.error?.description ||
          razorpayErr?.message ||
          "Payment gateway rejected the refund request.";
        return res.status(502).json({
          message: `Razorpay refund failed: ${errDesc}. The dispute remains OPEN so you can investigate or retry.`,
        });
      }

      // Step 3: Atomic database update with strike engine & listing disposition
      const dbOperations = [
        prisma.transaction.update({
          where: { id },
          data: {
            escrowStatus: "REFUNDED",
            disputeStatus: "UPHELD",
            resolvedAt: new Date(),
            razorpayRefundId: razorpayRefund?.id || null,
            refundStatus: razorpayRefund?.status || "processed",
          },
        }),
        prisma.user.update({
          where: { id: transaction.ownerId },
          data: {
            escrowBalance: { decrement: sellerPayout },
            faultCount: newFaultCount,
            trustState: newTrustState,
          },
        }),
        prisma.listing.update({
          where: { id: transaction.listingId },
          data: {
            status: targetListingStatus,
            ...(targetListingStatus === "faulty_resubmit_allowed" && {
              resubmitCount: { increment: 1 },
            }),
          },
        }),
      ];

      // If seller reached BANNED status (>= 3 faults), pull all their active listings
      if (newTrustState === "BANNED") {
        dbOperations.push(
          prisma.listing.updateMany({
            where: {
              ownerId: transaction.ownerId,
              id: { not: transaction.listingId },
              status: "active",
            },
            data: { status: "delisted" },
          })
        );
      }

      await prisma.$transaction(dbOperations);

      await delCache("admin:dashboard:stats");
      await delCachePattern("listings:*");

      logAuditEvent({
        action: "ADMIN_DISPUTE_REFUND_UPHELD",
        userId: req.auth?.userId || "ADMIN",
        targetId: id,
        ip: req.ip,
        details: {
          refundId: razorpayRefund.id,
          amount: transaction.amount,
          sellerId: transaction.ownerId,
          sellerFaultCount: newFaultCount,
          newTrustState,
          targetListingStatus,
        },
        status: "SUCCESS",
      });

      return res.json({
        success: true,
        message: `Dispute UPHELD: Full refund of ₹${transaction.amount.toLocaleString()} dispatched to buyer via Razorpay (Refund ID: ${razorpayRefund.id}). Seller fault count updated to ${newFaultCount} (Trust: ${newTrustState}). Listing status set to ${targetListingStatus}.`,
        refundId: razorpayRefund.id,
        refundStatus: razorpayRefund.status,
        sellerFaultCount: newFaultCount,
        sellerTrustState: newTrustState,
        listingStatus: targetListingStatus,
      });
    }
  } catch (error) {
    console.error("Resolve Dispute Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};
