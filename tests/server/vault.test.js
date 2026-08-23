import assert from "node:assert";
import { encryptData, decryptData } from "../../server/utils/encryption.js";

async function testVaultEncryption() {
  console.log("🧪 [Server Test] Running Zero-Trust AES-256-GCM Vault Tests...");

  // Test 1: Encryption and Decryption
  const secretPassword = "SuperSecurePassword123!@#";
  const encrypted = encryptData(secretPassword);
  assert.notStrictEqual(encrypted, secretPassword, "Ciphertext must not match plaintext");
  assert.ok(encrypted.includes(":"), "Encrypted string must contain IV separator");

  const decrypted = decryptData(encrypted);
  assert.strictEqual(decrypted, secretPassword, "Decrypted text must match original plaintext");
  console.log("  ✅ Test 1: Encryption & Decryption roundtrip passed.");

  // Test 2: Unique IVs per encryption (Same plaintext must produce different ciphertexts)
  const enc1 = encryptData(secretPassword);
  const enc2 = encryptData(secretPassword);
  assert.notStrictEqual(enc1, enc2, "Each encryption must use a unique IV");
  console.log("  ✅ Test 2: Cryptographic IV uniqueness verified.");

  // Test 3: Tamper Detection (GCM Authentication Tag verification)
  const parts = enc1.split(":");
  const tamperedCipher = parts[0] + ":" + "ff".repeat(16) + ":" + parts[2]; // Corrupt auth tag
  const tamperedResult = decryptData(tamperedCipher);
  assert.strictEqual(tamperedResult, null, "Tampered ciphertext must return null (decryption rejected)");
  console.log("  ✅ Test 3: GCM Authentication tag tamper rejection verified.");

  console.log("🎉 All Vault Encryption Tests Passed (100%)!\n");
}

testVaultEncryption().catch((err) => {
  console.error("❌ Vault Test Failed:", err);
  process.exit(1);
});
