import test from "node:test";
import assert from "node:assert/strict";
import { extractAnalysisField } from "./email-fields.ts";

test("preserves inline and multiline analysis without swallowing the next field", () => {
  const lines = ["Our preference: First paragraph.", "Second paragraph.", "Alternative scenario:", "Other scenario.", "Comment:", "First comment.", "Second comment.", "Trade", "Footer advertisement."];
  assert.equal(extractAnalysisField(lines, "Our preference:"), "First paragraph.\nSecond paragraph.");
  assert.equal(extractAnalysisField(lines, "Alternative scenario:"), "Other scenario.");
  assert.equal(extractAnalysisField(lines, "Comment:"), "First comment.\nSecond comment.");
});

test("preserves case-insensitive fields and missing fields", () => {
  assert.equal(extractAnalysisField(["COMMENT: First.", "Another paragraph."], "Comment:"), "First.\nAnother paragraph.");
  assert.equal(extractAnalysisField(["No analysis"], "Comment:"), "");
});

test("does not return a following label as the value of an empty field", () => {
  assert.equal(extractAnalysisField(["Our preference:", "Alternative scenario: Other."], "Our preference:"), "");
});

test("stops comments at support levels and email footer", () => {
  assert.equal(extractAnalysisField(["Comment:", "Full comment.", "Support: 100", "Resistance: 200"], "Comment:"), "Full comment.");
  assert.equal(extractAnalysisField(["Comment:", "Full comment.", "Web TV from Trading Central", "Advertisement."], "Comment:"), "Full comment.");
});
