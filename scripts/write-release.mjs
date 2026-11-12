import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
let commit = process.env.COMMIT_REF;
if (!commit) {
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    commit = "unversioned";
  }
}
mkdirSync("public", { recursive: true });
writeFileSync(
  "public/release.json",
  JSON.stringify(
    {
      commit,
      mode: process.env.NUXT_PUBLIC_DEMO_MODE === "true" ? "demo" : "api",
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
