/**
 * Shadow Folder Initializer — ensures ~/.donna/shadows/{name}/ exists for all 8 shadows.
 * Run: npx tsx src/shadows/init-folders.ts
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SHADOW_NAMES = [
  "Igris",
  "Tusk",
  "Jima",
  "Iron",
  "Tank",
  "Bellion",
  "Kaisel",
  "Beru",
] as const;

export async function initShadowFolders(): Promise<string[]> {
  const baseDir = path.join(os.homedir(), ".donna", "shadows");
  const created: string[] = [];

  for (const name of SHADOW_NAMES) {
    const shadowDir = path.join(baseDir, name);
    await fs.mkdir(shadowDir, { recursive: true });
    created.push(shadowDir);
  }

  return created;
}

// CLI entrypoint
if (
  process.argv[1] &&
  (process.argv[1].endsWith("init-folders.ts") || process.argv[1].endsWith("init-folders.js"))
) {
  initShadowFolders()
    .then((dirs) => {
      console.log(`\u2705 Shadow folders initialized (${dirs.length} shadows):`);
      for (const d of dirs) {
        console.log(`  ${d}`);
      }
    })
    .catch((err) => {
      console.error("Failed to initialize shadow folders:", err);
      process.exit(1);
    });
}
