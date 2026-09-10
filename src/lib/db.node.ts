import { PrismaClient } from '@prisma/client'

function configureDatabaseUrl() {
  if (process.env.DATABASE_URL) return
  process.env.DATABASE_URL = 'file:../db/custom.db'
}

configureDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
