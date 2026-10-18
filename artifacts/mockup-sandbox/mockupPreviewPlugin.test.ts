import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin.ts";

test("discovers public TSX mockups and rescans additions and removals", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-discovery-"));
  try {
    const plugin = mockupPreviewPlugin();
    const configResolved = plugin.configResolved as (config: { root: string }) => void;
    const buildStart = plugin.buildStart as () => Promise<void>;
    configResolved({ root });
    const generated = () =>
      readFile(path.join(root, "src/.generated/mockup-components.ts"), "utf8");

    await buildStart();
    assert.match(await generated(), /export const modules: ModuleMap = \{\n\n\};/);

    const files = [
      "Zebra.tsx",
      "nested/Card.tsx",
      "_private.tsx",
      "_helpers/Hidden.tsx",
      "nested/_private/Hidden.tsx",
      ".hidden.tsx",
      ".hidden/Hidden.tsx",
      "nested/.hidden/Hidden.tsx",
      "not-a-component.ts",
    ];
    for (const file of files) {
      const absolute = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, "export default function Example() { return null; }");
    }
    await buildStart();
    const source = await generated();
    assert.match(source, /"\.\/components\/mockups\/Zebra\.tsx"/);
    assert.match(source, /"\.\.\/components\/mockups\/nested\/Card\.tsx"/);
    assert.doesNotMatch(source, /private|helpers|hidden|not-a-component/);
    assert.ok(source.indexOf("Zebra.tsx") < source.indexOf("nested/Card.tsx"));

    await rm(path.join(root, "src/components/mockups/Zebra.tsx"));
    await buildStart();
    assert.doesNotMatch(await generated(), /Zebra/);
    assert.match(await generated(), /nested\/Card\.tsx/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
