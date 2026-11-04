import test from "node:test";
import assert from "node:assert/strict";
import { findFirstEmailWithCards, findLatestEmailWithCards } from "./email-selection.ts";

test("skips unrelated Trading Central emails and selects the latest report with asset cards", async () => {
  const visited = [];
  const result = await findFirstEmailWithCards(["newsletter", "analysis", "older-analysis"], async id => {
    visited.push(id);
    return id === "newsletter" ? { cards: [] } : { cards: [{ assetName: "TEST" }] };
  });

  assert.deepEqual(visited, ["newsletter", "analysis"]);
  assert.equal(result.cards.length, 1);
});

test("returns no result instead of an empty card report when every message is unrelated", async () => {
  const result = await findFirstEmailWithCards(["newsletter-a", "newsletter-b"], async () => ({ cards: [] }));
  assert.equal(result, null);
});

test("chooses the newest usable report across direct and forwarded-message searches", async () => {
  const visited = [];
  const result = await findLatestEmailWithCards(
    [["direct-oct30"], ["forwarded-nov4", "direct-oct30"]],
    async id => {
      visited.push(id);
      if (id === "direct-oct30") {
        return { receivedAt: "2026-10-30T07:39:09.000Z", cards: [{ assetName: "Old report" }] };
      }
      return { receivedAt: "2026-11-04T20:42:57.000Z", cards: [{ assetName: "New report" }] };
    },
  );

  assert.deepEqual(visited, ["direct-oct30", "forwarded-nov4"]);
  assert.equal(result.cards[0].assetName, "New report");
});

test("skips duplicate and cardless results while selecting the newest report", async () => {
  const visited = [];
  const result = await findLatestEmailWithCards(
    [["newsletter", "direct-oct30"], ["newsletter", "forwarded-nov4"]],
    async id => {
      visited.push(id);
      if (id === "newsletter") return { receivedAt: "2026-11-04T21:00:00.000Z", cards: [] };
      if (id === "forwarded-nov4") {
        return { receivedAt: "2026-11-04T20:42:57.000Z", cards: [{ assetName: "New report" }] };
      }
      return { receivedAt: "2026-10-30T07:39:09.000Z", cards: [{ assetName: "Old report" }] };
    },
  );

  assert.deepEqual(visited, ["newsletter", "direct-oct30", "forwarded-nov4"]);
  assert.equal(result.cards[0].assetName, "New report");
});
