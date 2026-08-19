import { Inngest } from "inngest";
import { serve } from "inngest/express";
import prisma from "../../config/prisma.js";

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

// Add or sync user details to PostgreSQL via Prisma
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

// Update user details when edited in Clerk
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

// Safely handle user deletion
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

export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
