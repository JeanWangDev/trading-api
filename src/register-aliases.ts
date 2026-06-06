import fs from "fs";
import path from "path";

// module-alias 默认导出类型不完整，运行时 API 为 addAlias
const moduleAlias = require("module-alias") as {
  addAlias: (alias: string, aliasPath: string) => void;
};

/**
 * `@/` 路径别名：
 * - `src/server.ts` / `dist/server.js` → 同目录（src 或 dist）
 * - `scripts/*.ts` → 优先 dist（已 build），否则 src
 */
export function registerModuleAliases(entryDir: string = __dirname): void {
  const normalized = entryDir.replace(/\\/g, "/");

  if (normalized.endsWith("/src") || normalized.endsWith("/dist")) {
    moduleAlias.addAlias("@", entryDir);
    return;
  }

  const root = path.resolve(entryDir, "..");
  const distEntry = path.join(root, "dist", "app.js");
  moduleAlias.addAlias("@", fs.existsSync(distEntry) ? path.join(root, "dist") : path.join(root, "src"));
}
