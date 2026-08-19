import prisma from "../config/prisma.js";
import { encryptData, decryptData } from "../utils/encryption.js";
import { getCache, setCache, delCache } from "../config/redis.js";

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
        isCredentialVerified: true,
        platformAssured: true,
      },
    });

    // Invalidate Redis caches
    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats", "listings:public");

    return res.json({
      message: "Credentials verified successfully and listing marked as Platform Assured",
      listing,
    });
  } catch (error) {
    console.error("Verify credential error:", error);
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
