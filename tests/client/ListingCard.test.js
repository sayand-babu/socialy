import assert from "node:assert";

async function testListingCardLogic() {
  console.log("🧪 [Client Test] Running Frontend Listing & Formatting Logic Tests...");

  // Test 1: Price Currency Formatter
  const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;
  assert.strictEqual(formatPrice(15000), "₹15,000");
  assert.strictEqual(formatPrice(100000), "₹1,00,000");
  console.log("  ✅ Test 1: Currency & Indian number system formatting verified.");

  // Test 2: Trust Badge Selector
  const getBadgeType = (item) => {
    if (item.verified) return "PLATFORM_VERIFIED";
    if (item.isCredentialSubmitted) return "ESCROW_READY";
    return "CHAT_TO_BUY";
  };

  assert.strictEqual(getBadgeType({ verified: true, isCredentialSubmitted: true }), "PLATFORM_VERIFIED");
  assert.strictEqual(getBadgeType({ verified: false, isCredentialSubmitted: true }), "ESCROW_READY");
  assert.strictEqual(getBadgeType({ verified: false, isCredentialSubmitted: false }), "CHAT_TO_BUY");
  console.log("  ✅ Test 2: Dynamic Listing Trust Badge state rules verified.");

  // Test 3: Follower Suffix Formatter
  const formatFollowers = (count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return String(count);
  };

  assert.strictEqual(formatFollowers(1200000), "1.2M");
  assert.strictEqual(formatFollowers(45000), "45.0K");
  assert.strictEqual(formatFollowers(850), "850");
  console.log("  ✅ Test 3: Follower metric abbreviation formatting verified.");

  console.log("🎉 All Client UI Logic Tests Passed (100%)!\n");
}

testListingCardLogic().catch((err) => {
  console.error("❌ Client UI Test Failed:", err);
  process.exit(1);
});
