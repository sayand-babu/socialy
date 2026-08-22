import { toFile } from "@imagekit/nodejs";
import imagekit from "../config/imagekit.js";
import prisma from "../config/prisma.js";
import { encryptData, decryptData } from "../utils/encryption.js";
import { ensureUserExists } from "../utils/userHelper.js";
import { getCache, setCache, delCache, delCachePattern } from "../config/redis.js";

// Controller For Adding Listing to Database
export const addListing = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const user = await ensureUserExists(userId);

    // v3 Guard: Banned sellers cannot create listings
    if (user?.trustState === "BANNED") {
      return res.status(403).json({
        message:
          "Your account has been permanently banned from creating listings due to repeated dispute policy violations.",
      });
    }

    if (req.plan !== "premium") {
      const listingCount = await prisma.listing.count({
        where: { ownerId: userId },
      });

      if (listingCount >= 5) {
        return res.status(400).json({
          message: "you have reached the free listing limit",
        });
      }
    }

    let rawDetails = req.validatedData || req.body.accountDetails || req.body;
    if (typeof rawDetails === "string") {
      try {
        rawDetails = JSON.parse(rawDetails);
      } catch {
        rawDetails = req.body;
      }
    }

    const accountDetails = { ...rawDetails };

    accountDetails.followers_count = parseFloat(accountDetails.followers_count) || 0;
    accountDetails.engagement_rate = parseFloat(accountDetails.engagement_rate) || 0;
    accountDetails.monthly_views = parseFloat(accountDetails.monthly_views) || 0;
    accountDetails.price = parseFloat(accountDetails.price);

    accountDetails.platform = (accountDetails.platform || "").toLowerCase();
    accountDetails.niche = (accountDetails.niche || "").toLowerCase();

    // Collect pre-uploaded image URLs (direct client upload)
    const existingImages = Array.isArray(accountDetails.images)
      ? accountDetails.images.filter((img) => typeof img === "string" && img.startsWith("http"))
      : [];

    // Process any legacy direct files if present
    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        const response = await imagekit.files.upload({
          file: await toFile(file.buffer, file.originalname),
          fileName: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
          folder: "/socialy",
          transformation: { pre: "w-1280,h-auto" },
        });
        return response.url;
      });
      uploadedImages = await Promise.all(uploadPromises);
    }

    const finalImages = [...existingImages, ...uploadedImages];

    // Exclude id, relations, and timestamps from data
    const { id: _, images: __, owner: ___, ownerId: ____, chats: _____, transactions: ______, createdAt: _______, updatedAt: ________, ...detailsToSave } = accountDetails;

    const listing = await prisma.listing.create({
      data: {
        ownerId: userId,
        ...detailsToSave,
        images: finalImages,
      },
    });

    // Invalidate Redis caches
    await Promise.all([
      delCache("listings:public", "admin:dashboard:stats"),
      delCachePattern("listings:*"),
    ]);

    res.status(201).json({ message: "listing created successfully", listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Controller For Getting All Public Listings with Search, Multi-Filter, Sorting & Server Pagination
export const getAllPublicListing = async (req, res) => {
  try {
    const {
      search,
      platform,
      niche,
      minFollowers,
      maxPrice,
      verified,
      monetized,
      sortBy = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Build unique Redis cache key
    const queryHash = JSON.stringify({
      s: search || "",
      p: platform || "",
      n: niche || "",
      mf: minFollowers || 0,
      mp: maxPrice || 0,
      v: verified || false,
      m: monetized || false,
      sort: sortBy,
      pg: pageNum,
      lim: limitNum,
    });
    const cacheKey = `listings:public:${Buffer.from(queryHash).toString("base64")}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    // Build dynamic Prisma WHERE filter
    const where = {
      status: "active",
    };

    // Full-text search matching title, username, description
    if (search && search.trim()) {
      const searchTerms = search.trim();
      where.OR = [
        { title: { contains: searchTerms, mode: "insensitive" } },
        { username: { contains: searchTerms, mode: "insensitive" } },
        { description: { contains: searchTerms, mode: "insensitive" } },
      ];
    }

    // Platform filter (array or comma-separated string)
    if (platform) {
      const platformsArray = Array.isArray(platform)
        ? platform
        : platform.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
      if (platformsArray.length > 0) {
        where.platform = { in: platformsArray };
      }
    }

    // Niche filter
    if (niche && niche.trim()) {
      where.niche = niche.trim().toLowerCase();
    }

    // Minimum Followers filter
    if (minFollowers && !isNaN(Number(minFollowers)) && Number(minFollowers) > 0) {
      where.followers_count = { gte: Number(minFollowers) };
    }

    // Maximum Price filter
    if (maxPrice && !isNaN(Number(maxPrice)) && Number(maxPrice) > 0) {
      where.price = { lte: Number(maxPrice) };
    }

    // Verified badge filter
    if (verified === "true" || verified === true) {
      where.verified = true;
    }

    // Monetized status filter
    if (monetized === "true" || monetized === true) {
      where.monetized = true;
    }

    // Sorting definition
    let orderBy = { createdAt: "desc" };
    switch (sortBy) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "followers_desc":
        orderBy = { followers_count: "desc" };
        break;
      case "engagement_desc":
        orderBy = { engagement_rate: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Parallel query for total count and paginated records
    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        include: { owner: true },
        orderBy,
        skip,
        take: limitNum,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };

    const responsePayload = {
      listings,
      pagination,
    };

    // Cache filtered query result in Redis for 3 minutes (180 seconds)
    await setCache(cacheKey, responsePayload, 180);

    return res.json(responsePayload);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

// Controller For Getting a Single Listing by ID
export const getListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `listing:detail:${id}`;
    const cachedListing = await getCache(cacheKey);

    if (cachedListing) {
      return res.json({ listing: cachedListing, cached: true });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!listing || listing.status === "deleted") {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Cache listing details for 10 minutes (600 seconds)
    await setCache(cacheKey, listing, 600);

    return res.json({ listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

// Controller For Getting All User Listing
export const getAllUserListing = async (req, res) => {
  try {
    const { userId } = await req.auth();

    // get all listings except deleted
    const listings = await prisma.listing.findMany({
      where: {
        ownerId: userId,
        status: { not: "deleted" },
      },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const balance = {
      earned: user?.earned || 0,
      escrowHold: user?.escrowBalance || 0,
      withdrawn: user?.withdrawn || 0,
      available: (user?.earned || 0) - (user?.withdrawn || 0),
    };

    if (!listings || listings.length === 0) {
      return res.json({ listings: [], balance });
    }

    return res.json({ listings, balance });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

// Controller for Updating Listing Details
export const updateListing = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const accountDetails = req.validatedData || JSON.parse(req.body.accountDetails);

    // Limit total images to 5
    const existingImages = accountDetails.images || [];
    const uploadedFiles = req.files || [];

    if (uploadedFiles.length + existingImages.length > 5) {
      return res.status(400).json({
        message: "You can only upload up to 5 images",
      });
    }

    accountDetails.followers_count = parseFloat(accountDetails.followers_count) || 0;
    accountDetails.engagement_rate = parseFloat(accountDetails.engagement_rate) || 0;
    accountDetails.monthly_views = parseFloat(accountDetails.monthly_views) || 0;
    accountDetails.price = parseFloat(accountDetails.price);

    accountDetails.platform = accountDetails.platform.toLowerCase();
    accountDetails.niche = accountDetails.niche.toLowerCase();

    const listing = await prisma.listing.findUnique({
      where: { id: accountDetails.id, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status === "sold") {
      return res.status(400).json({
        message: "you can't update sold listing",
      });
    }

    let images = [];

    if (uploadedFiles.length > 0) {
      const uploadImages = uploadedFiles.map(async (file) => {
        const response = await imagekit.files.upload({
          file: await toFile(file.buffer, file.originalname),
          fileName: `${Date.now()}-${file.originalname}`,
          folder: "flip-earn",
          transformation: { pre: "w-1280,h-auto" },
        });

        return response.url;
      });

      // Wait for all uploads
      images = await Promise.all(uploadImages);
    }

    const finalImages = [...existingImages, ...images];
    // Exclude id, images, owner, and relations from update data to prevent Prisma schema errors
    const { id: _, images: __, owner: ___, ownerId: ____, chats: _____, transactions: ______, createdAt: _______, updatedAt: ________, ...updateFields } = accountDetails;

    const updatedListing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        ...updateFields,
        images: finalImages.length > 0 ? finalImages : listing.images,
      },
    });

    // Invalidate Redis caches
    await delCache("listings:public", `listing:detail:${accountDetails.id}`, "admin:dashboard:stats");

    return res.json({
      message: "Account Updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const deleteUserListing = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id: listingId } = req.params;

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const paidTransaction = await prisma.transaction.findFirst({
      where: { listingId, isPaid: true },
    });
    if (paidTransaction) {
      return res.status(400).json({
        message: "A listing with a completed sale cannot be permanently deleted",
      });
    }

    // Delete dependent records first because the schema intentionally does not
    // cascade deletes. This permanently removes the listing from Neon/Prisma.
    await prisma.$transaction(async (tx) => {
      const chats = await tx.chat.findMany({
        where: { listingId },
        select: { id: true },
      });
      const chatIds = chats.map((chat) => chat.id);

      if (chatIds.length) {
        await tx.message.deleteMany({ where: { chatId: { in: chatIds } } });
        await tx.platformMessage.deleteMany({ where: { chatId: { in: chatIds } } });
        await tx.chat.deleteMany({ where: { id: { in: chatIds } } });
      }

      await tx.credential.deleteMany({ where: { listingId } });
      await tx.transaction.deleteMany({ where: { listingId } });
      await tx.listing.delete({ where: { id: listingId } });
    });

    // Invalidate Redis caches
    await delCache("listings:public", `listing:detail:${listingId}`, "admin:dashboard:stats");

    return res.json({ message: "Listing permanently deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = await req.auth();

    const listing = await prisma.listing.findUnique({
      where: { id, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status === "active" || listing.status === "inactive") {
      const nextStatus = listing.status === "active" ? "inactive" : "active";
      const updatedListing = await prisma.listing.update({
        where: { id, ownerId: userId },
        data: {
          status: nextStatus,
        },
      });

      // Invalidate Redis caches
      await delCache("listings:public", `listing:detail:${id}`, "admin:dashboard:stats");

      return res.json({
        message: `Listing is now ${nextStatus}`,
        listing: updatedListing,
      });
    } else if (listing.status === "ban") {
      return res.status(400).json({
        message: "Your listing is banned",
      });
    } else if (listing.status === "sold") {
      return res.status(400).json({
        message: "Your listing is sold",
      });
    }

    return res.json({
      message: "Listing status updated successfully",
      listing,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const addCredential = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { listingId, credential } = req.body;

    if (!credential || !Array.isArray(credential) || credential.length === 0 || !listingId) {
      return res.status(400).json({ message: "Missing or invalid credential fields" });
    }

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found or you are not the owner",
      });
    }

    // 🛡️ ESCROW LOCK: Prevent credential tampering after sale or after initial submission (unless faulty_resubmit_allowed)
    if (listing.status === "sold") {
      return res.status(400).json({
        message: "Credentials cannot be modified after the listing has been sold. The escrow vault is locked.",
      });
    }

    if (listing.isCredentialSubmitted && listing.status !== "faulty_resubmit_allowed") {
      return res.status(400).json({
        message: "Credentials have already been submitted and secured in the Escrow Vault. They cannot be edited.",
      });
    }

    // Encrypt sensitive credential values before storing
    const encryptedCredentials = credential.map((item) => ({
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
        data: { originalCredential: encryptedCredentials },
      });
    } else {
      await prisma.credential.create({
        data: {
          listingId,
          originalCredential: encryptedCredentials,
        },
      });
    }

    const isResubmission =
      listing.status === "faulty_resubmit_allowed" || (listing.resubmitCount || 0) >= 1;
    const nextStatus = isResubmission ? "inactive" : listing.status;
    const nextVerificationStatus = isResubmission
      ? "PENDING_VERIFICATION"
      : listing.verificationStatus;

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        isCredentialSubmitted: true,
        isCredentialVerified: false,
        isHandoverConfirmed: true,
        handoverConfirmedAt: new Date(),
        status: nextStatus,
        verificationStatus: nextVerificationStatus,
        resubmitCount: isResubmission
          ? Math.max(listing.resubmitCount || 0, 1)
          : listing.resubmitCount || 0,
      },
    });

    // Invalidate Redis caches
    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats");
    await delCachePattern("listings:*");

    return res.json({
      message: "Credentials submitted securely for escrow verification",
      listing: updatedListing,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const markFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = await req.auth();

    if (req.plan !== "premium") {
      return res.status(400).json({
        message: "Premium plan required",
      });
    }

    const listing = await prisma.listing.findFirst({
      where: { id, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Unset all other featured listings for this user
    await prisma.listing.updateMany({
      where: { ownerId: userId },
      data: { featured: false },
    });

    // Mark the listing as featured
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { featured: true },
    });

    // Invalidate Redis caches
    await delCache("listings:public", `listing:detail:${id}`);

    return res.json({
      message: "Listing marked as featured",
      listing: updatedListing,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const withdrawAmount = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { amount, account } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Please enter a valid withdrawal amount greater than 0",
      });
    }

    if (!account || !Array.isArray(account) || account.length === 0) {
      return res.status(400).json({
        message: "Bank account details are required",
      });
    }

    // 🛡️ ATOMIC CONCURRENCY TRANSACTION: Prevents parallel race condition overdrawing
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const availableBalance = (user.earned || 0) - (user.withdrawn || 0);

      if (numericAmount > availableBalance) {
        throw new Error(`INSUFFICIENT_BALANCE:${availableBalance}`);
      }

      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: numericAmount,
          account,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          withdrawn: { increment: numericAmount },
        },
      });

      return { withdrawal, updatedUser };
    });

    await delCache("admin:dashboard:stats");

    return res.json({
      message: "Withdrawal request submitted successfully",
      withdrawal: result.withdrawal,
      balance: {
        earned: result.updatedUser.earned,
        escrowHold: result.updatedUser.escrowBalance || 0,
        withdrawn: result.updatedUser.withdrawn,
        available: result.updatedUser.earned - result.updatedUser.withdrawn,
      },
    });
  } catch (error) {
    console.error("Withdrawal Error:", error);
    if (error.message?.startsWith("INSUFFICIENT_BALANCE:")) {
      const avail = Number(error.message.split(":")[1]);
      return res.status(400).json({
        message: `Insufficient balance. Available: ₹${avail.toLocaleString()}`,
      });
    }
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};



/**
 * Auto-resolves expired 24h escrow inspection windows where no dispute was opened
 */
const autoReleaseExpiredEscrows = async () => {
  try {
    const expiredTransactions = await prisma.transaction.findMany({
      where: {
        isPaid: true,
        escrowStatus: "UNDER_INSPECTION",
        inspectionEndsAt: {
          lte: new Date(),
        },
      },
    });

    for (const tx of expiredTransactions) {
      const sellerPayout = tx.sellerPayout || (tx.amount * 0.95);
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: tx.id },
          data: {
            escrowStatus: "COMPLETED",
            resolvedAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: tx.ownerId },
          data: {
            escrowBalance: { decrement: sellerPayout },
            earned: { increment: sellerPayout },
          },
        }),
      ]);
    }
  } catch (err) {
    console.error("Auto-release escrow error:", err);
  }
};

/**
 * Buyer manually confirms working account credentials and releases escrow payout to the seller
 */
export const confirmEscrowRelease = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params; // Transaction ID

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId, isPaid: true },
      include: { listing: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    if (transaction.escrowStatus !== "UNDER_INSPECTION") {
      return res.status(400).json({
        message: `Cannot release escrow. Order is already ${transaction.escrowStatus.toLowerCase().replace(/_/g, " ")}.`,
      });
    }

    const sellerPayout = transaction.sellerPayout || (transaction.amount * 0.95);

    // Atomically transfer funds from seller's escrowBalance to earned (withdrawable)
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          escrowStatus: "COMPLETED",
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

    return res.json({
      success: true,
      message: "Escrow funds released to seller successfully. Account ownership confirmed!",
    });
  } catch (error) {
    console.error("Confirm Escrow Release Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Buyer raises an escrow dispute before 24h inspection ends (freezes seller payout)
 */
export const raiseEscrowDispute = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params; // Transaction ID
    const { reason, proof } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please specify a reason for this dispute" });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId, isPaid: true },
      include: { listing: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    if (transaction.escrowStatus !== "UNDER_INSPECTION") {
      return res.status(400).json({
        message: `Cannot dispute order. Current status is ${transaction.escrowStatus.toLowerCase().replace(/_/g, " ")}.`,
      });
    }

    // v3 Spec Rule: METRICS_MISMATCH is strictly forbidden on UNVERIFIED listings
    const isMetricsDispute =
      reason.toUpperCase().includes("METRIC") ||
      reason.toUpperCase().includes("FOLLOWER") ||
      reason.toUpperCase().includes("ENGAGEMENT");

    const isListingVerified =
      transaction.listing?.verified === true ||
      transaction.listing?.verificationStatus === "VERIFIED";

    if (isMetricsDispute && !isListingVerified) {
      return res.status(400).json({
        message:
          "This listing is not platform-verified. Metrics disputes (follower count / engagement rate) are only available for verified purchases. If you have login, 2FA, or credential problems, please select 'Invalid Credentials' or '2FA Locked'.",
      });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        escrowStatus: "DISPUTED",
        disputeStatus: "OPENED",
        disputeReason: reason.trim(),
        disputeProof: (proof || "").trim(),
        sellerRespondBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h seller response window
        resolvedAt: null,
      },
    });

    await delCache("admin:dashboard:stats");

    return res.json({
      success: true,
      message:
        "Dispute submitted successfully. Escrow funds have been frozen. The seller has 24 hours to submit counter-evidence before Admin arbitration.",
      transaction: updatedTx,
    });
  } catch (error) {
    console.error("Raise Escrow Dispute Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Seller submits counter-evidence / statement in response to an open dispute
 */
export const submitSellerDisputeResponse = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params; // Transaction ID
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ message: "Counter-evidence statement is required" });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, ownerId: userId },
      include: { listing: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found or unauthorized" });
    }

    if (transaction.escrowStatus !== "DISPUTED") {
      return res.status(400).json({
        message: `Dispute is not in an active disputed status (current: ${transaction.escrowStatus})`,
      });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        sellerResponse: response.trim(),
        sellerRespondedAt: new Date(),
        disputeStatus: "UNDER_ADMIN_REVIEW",
      },
    });

    await delCache("admin:dashboard:stats");

    return res.json({
      success: true,
      message: "Counter-evidence submitted successfully. The dispute is now under Admin Review.",
      transaction: updatedTx,
    });
  } catch (error) {
    console.error("Submit Seller Dispute Response Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Buyer submits single-shot 24h appeal on rejected disputes for Verified listings
 */
export const appealDispute = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params; // Transaction ID
    const { appealReason, appealEvidence } = req.body;

    if (!appealEvidence || !appealEvidence.trim()) {
      return res.status(400).json({ message: "Please provide new evidence for your appeal" });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { listing: true },
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found or unauthorized" });
    }

    const isListingVerified =
      transaction.listing?.verified === true ||
      transaction.listing?.verificationStatus === "VERIFIED";

    if (!isListingVerified) {
      return res.status(400).json({
        message: "Appeals are only permitted for platform-verified listings.",
      });
    }

    if (transaction.isAppealed) {
      return res.status(400).json({
        message: "The one-time appeal for this transaction has already been used.",
      });
    }

    if (transaction.disputeStatus !== "REJECTED" && transaction.escrowStatus !== "COMPLETED") {
      return res.status(400).json({
        message: "Only rejected dispute decisions can be appealed.",
      });
    }

    // 24h appeal window check
    if (transaction.resolvedAt) {
      const msSinceResolution = Date.now() - new Date(transaction.resolvedAt).getTime();
      const hoursSinceResolution = msSinceResolution / (1000 * 60 * 60);
      if (hoursSinceResolution > 24) {
        return res.status(400).json({
          message: "The 24-hour appeal window for this decision has expired.",
        });
      }
    }

    const updatedTx = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        escrowStatus: "DISPUTED",
        disputeStatus: "APPEALED",
        isAppealed: true,
        appealReason: (appealReason || "Buyer appeal with new evidence").trim(),
        appealEvidence: appealEvidence.trim(),
        appealCreatedAt: new Date(),
      },
    });

    await delCache("admin:dashboard:stats");

    return res.json({
      success: true,
      message: "Appeal submitted successfully with new evidence. Re-opened for final Admin review.",
      transaction: updatedTx,
    });
  } catch (error) {
    console.error("Appeal Dispute Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Seller confirms handover checklist (logged out of devices, 2FA removed, email changed)
 * This unlocks credential decryption for the buyer in /my-orders
 */
export const confirmHandover = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params; // listingId

    const listing = await prisma.listing.findFirst({
      where: { id, ownerId: userId },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }

    if (listing.status !== "sold") {
      return res.status(400).json({
        message: "Handover checklist can only be confirmed for sold listings.",
      });
    }

    if (listing.isHandoverConfirmed) {
      return res.json({
        success: true,
        message: "Handover is already confirmed for this listing.",
      });
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: {
        isHandoverConfirmed: true,
        handoverConfirmedAt: new Date(),
      },
    });

    await delCachePattern("listings:*");
    await delCache("admin:dashboard:stats");

    return res.json({
      success: true,
      message: "Handover checklist confirmed! The buyer can now decrypt and access account credentials.",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Confirm Handover Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

export const getAllUserOrders = async (req, res) => {
  try {
    const { userId } = await req.auth();

    // Check and process any expired 24h inspection windows
    await autoReleaseExpiredEscrows();

    let orders = await prisma.transaction.findMany({
      where: { userId, isPaid: true },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    });

    if (!orders || orders.length === 0) {
      return res.json({ orders: [] });
    }

    // Attach the credential to each order
    const credentials = await prisma.credential.findMany({
      where: {
        listingId: {
          in: orders.map((order) => order.listingId),
        },
      },
    });

    const ordersWithCredentials = orders.map((order) => {
      const cred = credentials.find(
        (c) => c.listingId === order.listingId,
      );

      let decryptedCred = null;
      // 🛡️ HANDOVER GATE: Only decrypt credentials if seller has confirmed handover
      if (cred && order.listing?.isHandoverConfirmed) {
        const decryptList = (list) =>
          (list || []).map((item) => ({
            ...item,
            value: item.isEncrypted ? decryptData(item.value) : item.value,
          }));

        decryptedCred = {
          ...cred,
          originalCredential: decryptList(cred.originalCredential),
          updatedCredential: decryptList(cred.updatedCredential),
        };
      }

      return {
        ...order,
        credential: decryptedCred,
      };
    });

    return res.json({
      orders: ordersWithCredentials,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};
