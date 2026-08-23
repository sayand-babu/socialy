import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon WebSocket Connection
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;
neonConfig.poolQueryViaFetch = true;

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;
