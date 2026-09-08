#!/usr/bin/env node
import { rmSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = resolve(root, ".next");
const devTypesDir = resolve(nextDir, "dev", "types");

if (!devTypesDir.startsWith(nextDir + sep)) {
  throw new Error("Refusing to clean a path outside .next");
}

rmSync(devTypesDir, { recursive: true, force: true });
