import { Inngest } from "inngest";
import { serve } from "inngest/express";
import prisma from "../../config/prisma.js";
import { delCache, delCachePattern } from "../../config/redis.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "social-media-marketplace" });

// Export Inngest and serve for use in server
export { Inngest, serve };

// Helper to extract clean user details from Clerk webhook payload
const resolveUserData = (data) => {
  const name =
    [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
    data?.username ||
    data?.email_addresses?.[0]?.email_address?.split("@")[0] ||
    "User";

  const email = data?.email_addresses?.[0]?.email_address || "";
  const image = data?.image_url || "";

  return { name, email, image };
};

// ---------------------------------------------------------------------------
// 1. Clerk User Sync Functions
// ---------------------------------------------------------------------------

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    const { name, email, image } = resolveUserData(data);

    await prisma.user.upsert({
      where: { id: data.id },
      update: { name, email, image },
      create: {
        id: data.id,
        name,
        email,
        image,
      },
    });
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    const { name, email, image } = resolveUserData(data);

    await prisma.user.upsert({
      where: { id: data.id },
      update: { name, email, image },
      create: {
        id: data.id,
        name,
        email,
        image,
      },
    });
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;

    const [listingsCount, chatsCount, transactionsCount] = await Promise.all([
      prisma.listing.count({ where: { ownerId: data.id } }),
      prisma.chat.count({
        where: { OR: [{ ownerUserId: data.id }, { chatUserId: data.id }] },
      }),
      prisma.transaction.count({ where: { userId: data.id } }),
    ]);

    if (listingsCount === 0 && chatsCount === 0 && transactionsCount === 0) {
      await prisma.user.deleteMany({
        where: { id: data.id },
      });
    } else {
      await prisma.listing.updateMany({
        where: { ownerId: data.id },
        data: { status: "inactive" },
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 2. Durable Escrow Workflows (24h Inspection Window & Dispute Response)
// ---------------------------------------------------------------------------

/**
 * Escrow 24-Hour Inspection Auto-Release Workflow
 * Triggered on: escrow/order.funded
 */
export const escrowAutoReleaseFunction = inngest.createFunction(
  { id: "escrow-24h-inspection-auto-release" },
  { event: "escrow/order.funded" },
  async ({ event, step }) => {
    const { transactionId } = event.data;

    // Step 1: Wait for the 24-hour inspection window to elapse
    await step.sleep("wait-for-24h-inspection-window", "24h");

    // Step 2: Check current status of the transaction
    const transaction = await step.run("check-escrow-status", async () => {
      return await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { listing: true },
      });
    });

    if (!transaction) return { message: "Transaction not found" };

    // Step 3: Only auto-release if the transaction is still in UNDER_INSPECTION
    if (transaction.escrowStatus === "UNDER_INSPECTION") {
      const result = await step.run("execute-escrow-settlement", async () => {
        const sellerPayout = Math.round(transaction.amount * 0.95);
        const platformFee = Math.round(transaction.amount * 0.05);

        const [updatedTx] = await prisma.$transaction([
          prisma.transaction.update({
            where: { id: transactionId },
            data: {
              escrowStatus: "COMPLETED",
              isHandoverConfirmed: true,
              sellerPayoutAmount: sellerPayout,
              platformFeeAmount: platformFee,
            },
          }),
          prisma.listing.update({
            where: { id: transaction.listingId },
            data: { status: "sold" },
          }),
          prisma.user.update({
            where: { id: transaction.ownerId },
            data: {
              earned: { increment: sellerPayout },
            },
          }),
        ]);

        await delCache(
          `listing:detail:${transaction.listingId}`,
          "admin:dashboard:stats",
          "listings:public"
        );
        await delCachePattern("listings:*");

        return {
          success: true,
          status: "COMPLETED",
          sellerPayout,
          platformFee,
        };
      });

      return result;
    }

    return {
      message: `Escrow already resolved or disputed. Current status: ${transaction.escrowStatus}`,
    };
  }
);

/**
 * Seller 24-Hour Dispute Response Deadline Workflow
 * Triggered on: escrow/dispute.opened
 */
export const sellerDisputeTimeoutFunction = inngest.createFunction(
  { id: "seller-24h-dispute-response-timeout" },
  { event: "escrow/dispute.opened" },
  async ({ event, step }) => {
    const { transactionId } = event.data;

    // Step 1: Wait for 24-hour seller counter-evidence window
    await step.sleep("wait-for-seller-24h-response-deadline", "24h");

    // Step 2: Check if the dispute is still awaiting seller response (status = OPENED)
    const transaction = await step.run("check-seller-response-status", async () => {
      return await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
    });

    if (transaction && transaction.disputeStatus === "OPENED") {
      await step.run("escalate-dispute-to-admin", async () => {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            disputeStatus: "SELLER_TIMED_OUT",
          },
        });
      });

      return {
        message: "Seller missed 24h response window. Dispute escalated to Admin for binding refund.",
      };
    }

    return {
      message: "Seller submitted response or dispute resolved.",
    };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  escrowAutoReleaseFunction,
  sellerDisputeTimeoutFunction,
];
