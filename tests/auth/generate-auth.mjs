import { chromium } from "@playwright/test";
import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync("server/.env")) {
  dotenv.config({ path: "server/.env" });
} else {
  dotenv.config();
}

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const BASE_URL = "http://localhost:5173";

const users = JSON.parse(fs.readFileSync("tests/auth/test-users.json", "utf-8"));

async function createSignInToken(userId) {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 86400 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Clerk token error for ${userId}: ${JSON.stringify(data)}`);
  return data.token;
}

async function saveSession(role, userConfig) {
  console.log(`\n🔐 Generating authenticated session for ${role.toUpperCase()} (${userConfig.email})...`);

  const token = await createSignInToken(userConfig.userId);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`);
  await page.waitForFunction(() => window.Clerk?.loaded === true, { timeout: 20000 });

  // Sign in using Clerk ticket token
  const result = await page.evaluate(async (ticketToken) => {
    try {
      const signIn = await window.Clerk.client.signIn.create({
        strategy: "ticket",
        ticket: ticketToken,
      });
      await window.Clerk.setActive({ session: signIn.createdSessionId });
      return { success: true, sessionId: signIn.createdSessionId };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  }, token);

  if (!result.success) {
    console.warn(`  ⚠️ Ticket sign in failed (${result.error}), falling back to direct cookie injection...`);
  }

  await page.waitForTimeout(3000);

  fs.mkdirSync("tests/auth", { recursive: true });
  await context.storageState({ path: userConfig.storageState });

  await browser.close();
  console.log(`  ✅ ${role.toUpperCase()} storage state saved → ${userConfig.storageState}`);
}

async function main() {
  console.log("══════════════════════════════════════════════════════");
  console.log("  🚀 GENERATING REAL CLERK SESSIONS FOR E2E TESTS");
  console.log("══════════════════════════════════════════════════════");

  for (const role of ["buyer", "seller", "admin"]) {
    try {
      await saveSession(role, users[role]);
    } catch (err) {
      console.error(`  ❌ Error for ${role}:`, err.message);
    }
  }

  console.log("\n🎉 All session tokens generated and ready for Playwright!\n");
}

main();
