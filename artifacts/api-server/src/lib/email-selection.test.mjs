import test from "node:test";
import assert from "node:assert/strict";
import { findFirstEmailWithCards } from "./email-selection.ts";

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
