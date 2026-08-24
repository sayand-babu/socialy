import prisma from "../config/prisma.js";
import { broadcastChatMessage, createSocketTicket } from "../config/chatSocket.js";
import { ensureUserExists } from "../utils/userHelper.js";
import { sanitizeText } from "../utils/sanitizer.js";
import { inspectMessage } from "../utils/scamShield.js";

const chatInclude = {
  listing: true,
  ownerUser: { select: { id: true, name: true, image: true } },
  chatUser: { select: { id: true, name: true, image: true } },
};

const findParticipantChat = async (chatId, userId) =>
  prisma.chat.findFirst({
    where: {
      id: chatId,
      OR: [{ ownerUserId: userId }, { chatUserId: userId }],
    },
    include: chatInclude,
  });

export const getOrCreateChat = async (req, res) => {
  try {
    const { userId } = await req.auth();
    await ensureUserExists(userId);
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.listingId, status: "active" },
    });

    if (!listing) return res.status(404).json({ message: "Listing not found" });
    if (listing.ownerId === userId) {
      return res.status(400).json({ message: "You cannot chat about your own listing" });
    }

    const chat = await prisma.chat.upsert({
      where: {
        chatUserId_ownerUserId_listingId: {
          chatUserId: userId,
          ownerUserId: listing.ownerId,
          listingId: listing.id,
        },
      },
      create: {
        chatUserId: userId,
        ownerUserId: listing.ownerId,
        listingId: listing.id,
      },
      update: { active: true },
      include: chatInclude,
    });

    res.json({ chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.code || error.message });
  }
};

export const getUserChats = async (req, res) => {
  try {
    const { userId } = await req.auth();
    await ensureUserExists(userId);
    const chats = await prisma.chat.findMany({
      where: { OR: [{ ownerUserId: userId }, { chatUserId: userId }] },
      include: chatInclude,
      orderBy: { updatedAt: "desc" },
    });
    res.json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.code || error.message });
  }
};

export const getSocketTicket = async (req, res) => {
  try {
    const authData = typeof req.auth === "function" ? await req.auth() : req.auth;
    const userId = authData?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ ticket: createSocketTicket(userId) });
  } catch (error) {
    console.error("getSocketTicket error:", error);
    res.status(401).json({ message: error.code || error.message || "Unauthorized" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const chat = await findParticipantChat(req.params.chatId, userId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const messages = await prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: "asc" },
    });
    res.json({ chat, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.code || error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const chat = await findParticipantChat(req.params.chatId, userId);
    const rawMessage = req.body.message || "";
    const messageText = sanitizeText(rawMessage);

    if (!chat) return res.status(404).json({ message: "Chat not found" });
    if (!messageText) return res.status(400).json({ message: "Message cannot be empty" });

    // 🛡️ Security Shield: Analyze for scam, off-platform payment evasion, or phone/contact harvesting
    const shieldResult = await inspectMessage(rawMessage);
    if (!shieldResult.allowed) {
      return res.status(400).json({
        message: shieldResult.reason || "Message blocked by Socialy Scam Shield to protect your escrow trade.",
        isShieldBlocked: true,
        flag: shieldResult.flag,
      });
    }

    const message = await prisma.message.create({
      data: { chatId: chat.id, sender_id: userId, message: messageText },
    });
    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        lastMessage: messageText,
        lastMessageSenderId: userId,
        isLastMessageRead: false,
      },
    });

    broadcastChatMessage(chat, message);

    res.status(201).json({ message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.code || error.message });
  }
};
