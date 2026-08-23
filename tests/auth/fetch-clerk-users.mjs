/**
 * fetch-clerk-users.mjs
 * Run this script to get Clerk User IDs for your test accounts.
 * Usage: node tests/auth/fetch-clerk-users.mjs
 */

import "dotenv/config";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY not found. Make sure server/.env is loaded.");
  process.exit(1);
}

const res = await fetch("https://api.clerk.com/v1/users?limit=50", {
  headers: {
    Authorization: `Bearer ${CLERK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

const data = await res.json();

if (!res.ok) {
  console.error("❌ Clerk API Error:", data);
  process.exit(1);
}

console.log("\n📋 All Clerk Users in your application:\n");
console.log("─".repeat(80));

for (const user of data) {
  const email = user.email_addresses?.[0]?.email_address || "no email";
  const role = user.public_metadata?.role || "user";
  console.log(`👤 Name     : ${user.first_name || ""} ${user.last_name || ""}`);
  console.log(`   Email    : ${email}`);
  console.log(`   User ID  : ${user.id}`);
  console.log(`   Role     : ${role}`);
  console.log("─".repeat(80));
}

console.log(`\nTotal users: ${data.length}`);
console.log(`\n✅ Copy the User IDs above and paste them into tests/auth/test-users.json\n`);
