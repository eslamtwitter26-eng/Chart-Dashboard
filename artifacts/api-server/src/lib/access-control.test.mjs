import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_SESSION_TTL_MS,
  createAccessToken,
  normalizeAllowedEmail,
  parseAllowedEmails,
  readAccessToken,
} from "./access-control.ts";

test("normalizes addresses and extracts allowlist entries from messy sheet cells", () => {
  const csv = [
    'Group,,,"email first@example.com second@example.org",Duration',
    'Client,,,"THIRD+desk@example.net",lifetime',
    'Other,,,"first@example.com",lifetime',
    '"not-an-email",,,',
  ].join("\n");

  assert.deepEqual(
    [...parseAllowedEmails(csv)].sort(),
    ["first@example.com", "second@example.org", "third+desk@example.net"],
  );
  assert.equal(normalizeAllowedEmail("  Valid.Name@Example.com "), "valid.name@example.com");
  assert.equal(normalizeAllowedEmail("not an email"), null);
});

test("signed access sessions expire and reject tampering or a different signing secret", () => {
  const token = createAccessToken("person@example.test", "test-only-secret", 1_000);
  assert.deepEqual(
    readAccessToken(token, "test-only-secret", 1_001),
    { email: "person@example.test", expiresAt: 1_000 + ACCESS_SESSION_TTL_MS },
  );
  assert.equal(readAccessToken(token, "different-test-secret", 1_001), null);
  assert.equal(readAccessToken(token, "test-only-secret", 1_000 + ACCESS_SESSION_TTL_MS), null);

  const [payload, signature] = token.split(".");
  const altered = `${payload}.${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
  assert.equal(readAccessToken(altered, "test-only-secret", 1_001), null);
});
