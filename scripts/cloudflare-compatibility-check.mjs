#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = join(tmpdir(), `jma-vinext-check-${process.pid}-${Date.now()}`);
const vinextCli = resolve(root, "node_modules", "vinext", "dist", "cli.js");

const ROOT_FILES = [
  "package.json",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
];

const ROOT_DIRS = [
  "src",
  "public",
];

const EXCLUDED_DIR_NAMES = new Set([
  ".git",
  ".next",
  ".vercel",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "playwright-report",
  "test-results",
]);

function shouldCopy(source) {
  const name = basename(source);
  if (EXCLUDED_DIR_NAMES.has(name)) return false;
  if (name.startsWith("node_modules.partial-")) return false;
  const projectRelative = relative(root, source).replaceAll("\\", "/");
  if (projectRelative === "src/generated" || projectRelative.startsWith("src/generated/")) return false;
  return true;
}

function copyIfPresent(entry) {
  const source = resolve(root, entry);
  if (!existsSync(source)) return;
  const destination = resolve(tempRoot, entry);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, {
    recursive: true,
    filter: shouldCopy,
  });
}

if (!existsSync(vinextCli)) {
  console.error(`Cannot find Vinext CLI at ${vinextCli}`);
  process.exit(1);
}

mkdirSync(tempRoot, { recursive: true });

let status = 1;

try {
  for (const entry of ROOT_FILES) copyIfPresent(entry);
  for (const entry of ROOT_DIRS) copyIfPresent(entry);

  console.log(`Running vinext check from sanitized runtime source: ${tempRoot}`);
  const result = spawnSync(process.execPath, [vinextCli, "check"], {
    cwd: tempRoot,
    env: process.env,
    stdio: "inherit",
  });
  status = result.status ?? 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

process.exit(status);
