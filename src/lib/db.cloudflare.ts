import { PrismaPg } from '@prisma/adapter-pg'
import type { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { PrismaClient as PostgresPrismaClient } from '@/generated/prisma-postgres/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString?.startsWith('postgres')) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string on Cloudflare Workers')
}

const globalForPrisma = globalThis as unknown as {
  cloudflarePrisma: PostgresPrismaClient | undefined
}

const postgres =
  globalForPrisma.cloudflarePrisma ??
  new PostgresPrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.cloudflarePrisma = postgres

export const db = postgres as unknown as SqlitePrismaClient
