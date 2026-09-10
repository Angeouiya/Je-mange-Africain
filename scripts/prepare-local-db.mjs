#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const databaseUrl = process.env.JMA_LOCAL_DATABASE_URL || "file:../db/custom.db";
if (!databaseUrl.startsWith("file:")) {
  console.error("Local database preparation only accepts a SQLite file URL through JMA_LOCAL_DATABASE_URL.");
  process.exit(1);
}

const prismaCli = resolve("node_modules", "prisma", "build", "index.js");
if (!existsSync(prismaCli)) {
  console.error("Prisma CLI is missing. Run npm ci before starting the application.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaCli, "db", "push", "--schema", "prisma/schema.prisma"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
