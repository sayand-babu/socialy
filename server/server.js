import express from "express";
import http from "http";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { inngest, functions, serve } from "./src/inngest/index.js";
import listingRouter from "./Routes/listingRoutes.js";
import chatRouter from "./Routes/chatRoutes.js";
import adminRouter from "./Routes/adminRoutes.js";
import paymentRouter from "./Routes/paymentRoutes.js";
import { attachChatSocketServer } from "./config/chatSocket.js";
const app = express(); // create the exprress  app

// express .json it will pare the body  if the  content is application json then  store the  json as javascript object in the req.body
// with out this   req.body is undefined
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // In development or when origin matches, allow request
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("server is alive"));
app.use("/api/inngest/", serve({ client: inngest, functions }));

app.use("/api/listings", listingRouter);
app.use("/api/chats", chatRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payments", paymentRouter);

const server = http.createServer(app);
attachChatSocketServer(server);

// Start server locally unless running in a serverless environment.
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
