import clerkClient from "../config/clerk.js";
import prisma from "../config/prisma.js";

/**
 * Ensures that a User record exists in PostgreSQL for the given Clerk userId.
 * If not present, queries Clerk API and upserts into database.
 * @param {string} userId - Clerk user ID
 * @returns {Promise<Object>} Prisma User record
 */
export const ensureUserExists = async (userId) => {
  if (!userId) return null;

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      return existing;
    }

    // Fetch user details from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    const name =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      clerkUser?.username ||
      clerkUser?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
      "User";

    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    const image = clerkUser?.imageUrl || "";

    const createdUser = await prisma.user.upsert({
      where: { id: userId },
      update: { name, email, image },
      create: {
        id: userId,
        name,
        email,
        image,
      },
    });

    return createdUser;
  } catch (error) {
    console.error("ensureUserExists error for userId:", userId, error);
    return null;
  }
};
