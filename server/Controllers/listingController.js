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
    await ensureUserExists(userId);

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

    const accountDetails = req.validatedData || JSON.parse(req.body.accountDetails);

    accountDetails.followers_count = parseFloat(accountDetails.followers_count) || 0;
    accountDetails.engagement_rate = parseFloat(accountDetails.engagement_rate) || 0;
    accountDetails.monthly_views = parseFloat(accountDetails.monthly_views) || 0;
    accountDetails.price = parseFloat(accountDetails.price);

    accountDetails.platform = accountDetails.platform.toLowerCase();
    accountDetails.niche = accountDetails.niche.toLowerCase();
    const uploadimages = (req.files || []).map(async (file) => {
      const response = await imagekit.files.upload({
        file: await toFile(file.buffer, file.originalname),
        fileName: `${Date.now()}-${file.originalname}`,
        folder: "/socialy",
        transformation: { pre: "w-1280,h-auto" },
      });
      return response.url;
    });
    // wait for all the images to be uploaded and get their urls
    const images = await Promise.all(uploadimages);

    const listing = await prisma.listing.create({
      data: {
        ownerId: userId,
        ...accountDetails,
        images,
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
      orderBy: { createdAt: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const balance = {
      earned: user.earned,
      withdrawn: user.withdrawn,
      available: user.earned - user.withdrawn,
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

    const updatedListing = await prisma.listing.update({
      where: { id: accountDetails.id, ownerId: userId },
      data: {
        ownerId: userId,
        ...accountDetails,
        images: [...accountDetails.images, ...images],
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

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: { isCredentialSubmitted: true },
    });

    // Invalidate Redis caches
    await delCache(`listing:detail:${listingId}`, "admin:dashboard:stats");

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const availableBalance = (user.earned || 0) - (user.withdrawn || 0);

    if (numericAmount > availableBalance) {
      return res.status(400).json({
        message: `Insufficient balance. Available: $${availableBalance.toLocaleString()}`,
      });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: numericAmount,
        account,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        withdrawn: (user.withdrawn || 0) + numericAmount,
      },
    });

    return res.json({
      message: "Withdrawal request submitted successfully",
      withdrawal,
      balance: {
        earned: updatedUser.earned,
        withdrawn: updatedUser.withdrawn,
        available: updatedUser.earned - updatedUser.withdrawn,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const purchaseListing = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { id } = req.params;

    await ensureUserExists(userId);

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.ownerId === userId) {
      return res.status(400).json({ message: "You cannot purchase your own listing" });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        message: `This listing is ${listing.status} and cannot be purchased`,
      });
    }

    // Execute atomic purchase transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Mark listing as sold
      const updatedListing = await tx.listing.update({
        where: { id },
        data: { status: "sold" },
      });

      // 2. Create Transaction record
      const createdTx = await tx.transaction.create({
        data: {
          listingId: listing.id,
          ownerId: listing.ownerId,
          userId,
          amount: listing.price,
          isPaid: true,
        },
      });

      // 3. Credit seller's earned balance
      await tx.user.update({
        where: { id: listing.ownerId },
        data: {
          earned: { increment: listing.price },
        },
      });

      return createdTx;
    });

    // Invalidate Redis caches
    await delCache("listings:public", `listing:detail:${id}`, "admin:dashboard:stats");

    return res.status(201).json({
      message: "Account purchased successfully! The credentials have been released to your orders.",
      transaction,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.code || error.message,
    });
  }
};

export const getAllUserOrders = async (req, res) => {
  try {
    const { userId } = await req.auth();

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
      if (cred) {
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
