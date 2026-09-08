import handler from 'vinext/server/fetch-handler'
import { runWithCloudflareDatabase } from '@/lib/db.cloudflare'

type VinextFetch = typeof handler.fetch

const worker = {
  fetch(...args: Parameters<VinextFetch>): ReturnType<VinextFetch> {
    return runWithCloudflareDatabase(() => handler.fetch(...args)) as ReturnType<VinextFetch>
  },
}

export default worker
