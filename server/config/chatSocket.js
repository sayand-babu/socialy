import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";

const socketTickets = new Map();
const socketsByUser = new Map();
const ticketLifetimeMs = 60_000;

export const createSocketTicket = (userId) => {
  const ticket = randomUUID();
  socketTickets.set(ticket, { userId, expiresAt: Date.now() + ticketLifetimeMs });
  return ticket;
};

const consumeSocketTicket = (ticket) => {
  const record = socketTickets.get(ticket);
  socketTickets.delete(ticket);
  return record?.expiresAt > Date.now() ? record.userId : null;
};

export const broadcastChatMessage = (chat, message) => {
  const payload = JSON.stringify({
    type: "message:new",
    chatId: chat.id,
    message,
    updatedAt: new Date().toISOString(),
  });

  for (const userId of [chat.ownerUserId, chat.chatUserId]) {
    for (const socket of socketsByUser.get(userId) || []) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }
};

export const attachChatSocketServer = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const userId = consumeSocketTicket(url.searchParams.get("ticket"));
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, userId);
    });
  });

  wss.on("connection", (websocket, userId) => {
    const userSockets = socketsByUser.get(userId) || new Set();
    userSockets.add(websocket);
    socketsByUser.set(userId, userSockets);

    websocket.on("close", () => {
      userSockets.delete(websocket);
      if (userSockets.size === 0) socketsByUser.delete(userId);
    });
  });
};
