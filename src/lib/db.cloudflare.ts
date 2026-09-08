import { PrismaPg } from '@prisma/adapter-pg'
import type { PrismaClient as SqlitePrismaClient } from '@prisma/client'
import { PrismaClient as PostgresPrismaClient } from '@/generated/prisma-postgres/client'
import { env } from 'cloudflare:workers'
import { AsyncLocalStorage } from 'node:async_hooks'

function createPrismaClient() {
  const connectionString = env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL
  if (!connectionString?.startsWith('postgres')) {
    throw new Error('A Hyperdrive or PostgreSQL connection string is required on Cloudflare Workers')
  }

  return new PostgresPrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

const requestDatabase = new AsyncLocalStorage<PostgresPrismaClient>()

function currentPrismaClient() {
  const client = requestDatabase.getStore()
  if (!client) {
    throw new Error('The Cloudflare database client was accessed outside a request context')
  }
  return client
}

export async function runWithCloudflareDatabase<T>(operation: () => Promise<T>): Promise<T> {
  if (requestDatabase.getStore()) return operation()

  const client = createPrismaClient()
  return requestDatabase.run(client, async () => {
    try {
      return await operation()
    } finally {
      await client.$disconnect()
    }
  })
}

export const db = new Proxy({} as SqlitePrismaClient, {
  get(_target, property) {
    const client = currentPrismaClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
