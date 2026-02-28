import { Inngest, serve } from "inngest";
import prisma from "../../config/prisma.js";
// Create a client to send and receive events
export const inngest = new Inngest({ id: "socjal-media-marketplace" });

// Export Inngest and serve for use in server
export { Inngest, serve };

// to add the user detail to the database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    //check if the user alredy exit in the database
    const user = await prisma.user.findFirst({
      where: { id: data.id },
    });
    // if the user exist
    if (user) {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data?.email_addresses[0]?.email_address,
          name: data?.first_name + " " + data.last_name,
          image: data?.image_url,
        },
      });
      return;
    }

    // if user doesnt exist
    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data.last_name,
        image: data?.image_url,
      },
    });
  },
);

// ingest function  to delete the user fromm the database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;

    const listings = await prisma.listing.findMany({
      where: { ownerId: data.id },
    });

    const chat = await prisma.chat.findMany({
      where: { OR: [{ ownerUserId: data.id }, { chatUserId: data.id }] },
    });

    const transaction = await prisma.transaction.findMany({
      where: { userId: data.id },
    });

    if (
      listings.length === 0 &&
      chats.length === 0 &&
      transaction.length === 0
    ) {
      await prisma.user.delete({
        where: { userId: data.id },
      });
    } else {
      await prisma.updateMany({
        where: { ownerId: data.id },
        data: { status: "inactive" },
      });
    }
  },
);
//  inngest function to update the user details

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data.last_name,
        image: data?.image_url,
      },
    });
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
