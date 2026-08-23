/**
 * save-sessions.mjs
 * Generates Clerk auth tokens for buyer, seller, and admin test accounts
 * and saves them as Playwright storageState JSON files.
 *
 * This bypasses Google OAuth entirely — no browser login needed.
 *
 * Usage: node tests/auth/save-sessions.mjs
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

if (fs.existsSync("server/.env")) {
  dotenv.config({ path: "server/.env" });
} else {
  dotenv.config();
}

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;

const users = JSON.parse(fs.readFileSync("tests/auth/test-users.json", "utf-8"));

/**
 * Creates a short-lived Clerk session token for a given userId
 * using the Clerk Backend API.
 */
async function createSignInToken(userId) {
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      expires_in_seconds: 86400, // 24 hours
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk API error for userId ${userId}: ${JSON.stringify(data)}`);
  }

  return data.token; // One-time sign-in token
}

/**
 * Builds a Playwright storageState object with the Clerk session token
 * set as a cookie and in localStorage, matching what Clerk's SDK expects.
 */
function buildStorageState(signInToken, publishableKey) {
  const clerkDomain = "localhost";
  return {
    cookies: [
      {
        name: "__clerk_sit",
        value: signInToken,
        domain: clerkDomain,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [
      {
        origin: "http://localhost:5173",
        localStorage: [
          {
            name: `__clerk_client_jwt`,
            value: signInToken,
          },
        ],
      },
    ],
  };
}

async function main() {
  console.log("\n🔐 Generating Clerk sign-in tokens for test users...\n");

  const roles = ["buyer", "seller", "admin"];

  for (const role of roles) {
    const userConfig = users[role];

    if (!userConfig.userId || userConfig.userId.startsWith("FILL_IN")) {
      console.warn(`⚠️  Skipping ${role} — userId not configured in test-users.json`);
      continue;
    }

    try {
      console.log(`  🔑 Creating token for ${role} (${userConfig.email})...`);
      const token = await createSignInToken(userConfig.userId);
      const storageState = buildStorageState(token, CLERK_PUBLISHABLE_KEY);

      const outputPath = userConfig.storageState;
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(storageState, null, 2));

      console.log(`  ✅ ${role.toUpperCase()} session saved → ${outputPath}`);
    } catch (err) {
      console.error(`  ❌ Failed to create session for ${role}:`, err.message);
    }
  }

  console.log("\n🎉 All sessions generated! Run your Playwright tests now.\n");
}

main();
