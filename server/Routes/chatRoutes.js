import express from "express";
import {
  getChatMessages,
  getOrCreateChat,
  getSocketTicket,
  getUserChats,
  sendMessage,
} from "../Controllers/chatController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const chatRouter = express.Router();

chatRouter.get("/", protect, getUserChats);
chatRouter.post("/socket-ticket", protect, getSocketTicket);
chatRouter.post("/:listingId", protect, getOrCreateChat);
chatRouter.get("/:chatId/messages", protect, getChatMessages);
chatRouter.post("/:chatId/messages", protect, sendMessage);

export default chatRouter;
