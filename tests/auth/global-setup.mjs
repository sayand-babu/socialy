/**
 * global-setup.mjs
 * Runs ONCE before all Playwright tests.
 * Creates authenticated sessions for Buyer, Seller, and Admin
 * using Clerk's sign-in token API — bypasses Google OAuth entirely.
 */

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

/**
 * Step 1: Create a one-time sign-in token for a userId via Clerk Backend API
 */
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

/**
 * Step 2: Launch a real Chrome browser, navigate to the app with
 * the Clerk ticket token, wait for Clerk to auto-sign-in, save session.
 */
async function saveSession(role, userConfig) {
  console.log(`\n🔐 Setting up ${role.toUpperCase()} session (${userConfig.email})...`);

  const token = await createSignInToken(userConfig.userId);

  const browser = await chromium.launch({
    headless: false, // Show the browser so user can see it
    slowMo: 300,
    channel: "chrome",
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app — Clerk will pick up the ticket from URL param
  await page.goto(`${BASE_URL}/?__clerk_ticket=${token}`);

  // Wait for Clerk JS SDK to load on the page
  console.log(`  ⏳ Waiting for Clerk to process sign-in token...`);
  await page.waitForFunction(() => window.Clerk?.loaded === true, { timeout: 15000 });

  // Use Clerk JS SDK to sign in with the ticket
  await page.evaluate(async (ticketToken) => {
    const signIn = await window.Clerk.client.signIn.create({
      strategy: "ticket",
      ticket: ticketToken,
    });
    await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, token);

  // Give Clerk time to settle the session and update cookies
  await page.waitForTimeout(3000);

  // Verify the user is now signed in
  const isSignedIn = await page.evaluate(() => !!window.Clerk?.user);
  if (!isSignedIn) {
    throw new Error(`❌ Sign-in failed for ${role} (${userConfig.email})`);
  }

  console.log(`  ✅ ${role.toUpperCase()} signed in as: ${userConfig.email}`);

  // Save the authenticated browser storage state (cookies + localStorage)
  fs.mkdirSync("tests/auth", { recursive: true });
  await context.storageState({ path: userConfig.storageState });

  await browser.close();
  console.log(`  💾 Session saved → ${userConfig.storageState}`);
}

export default async function globalSetup() {
  if (!CLERK_SECRET_KEY) {
    throw new Error("❌ CLERK_SECRET_KEY not found. Make sure you run: npm run test:e2e");
  }

  console.log("\n════════════════════════════════════════");
  console.log("  🚀 SOCIALY AUTH SETUP — Generating Sessions");
  console.log("════════════════════════════════════════");

  // Check if sessions already exist and are fresh (less than 20 hours old)
  const roles = ["buyer", "seller", "admin"];
  for (const role of roles) {
    const sessionPath = users[role].storageState;
    if (fs.existsSync(sessionPath)) {
      const stat = fs.statSync(sessionPath);
      const ageMs = Date.now() - stat.mtimeMs;
      const ageMins = Math.floor(ageMs / 60000);
      if (ageMins < 1200) {
        console.log(`  ⚡ ${role.toUpperCase()} session still valid (${ageMins}m old) — reusing.`);
        continue;
      }
    }
    await saveSession(role, users[role]);
  }

  console.log("\n✅ All sessions ready! Starting E2E tests...\n");
}
