import { PrismaClient } from '@prisma/client'
import { PrismaClient as PostgresPrismaClient } from '@/generated/prisma-postgres'
import fs from 'node:fs'
import path from 'node:path'

function configureDatabaseUrl() {
  if (process.env.DATABASE_URL) return

  if (process.env.VERCEL === '1') {
    const tmpDir = path.join('/tmp', 'je-mange-africain')
    const tmpDb = path.join(tmpDir, 'custom.db')
    const bundledDb = path.join(process.cwd(), 'db', 'custom.db')

    if (!fs.existsSync(tmpDb) && fs.existsSync(bundledDb)) {
      fs.mkdirSync(tmpDir, { recursive: true })
      fs.copyFileSync(bundledDb, tmpDb)
    }

    process.env.DATABASE_URL = `file:${tmpDb}`
    return
  }

  process.env.DATABASE_URL = 'file:../db/custom.db'
}

configureDatabaseUrl()

const usesPostgres = /^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL || '')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  (usesPostgres
    ? new PostgresPrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] }) as unknown as PrismaClient
    : new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] }))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
