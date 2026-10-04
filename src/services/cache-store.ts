import { del, get, set } from 'idb-keyval'
import { cacheWorkspaceSchema, type CacheWorkspace } from '../domain/cache'

export async function loadCache(key: string, sampleUrl: string) {
  const saved = cacheWorkspaceSchema.safeParse(await get(key))
  if (saved.success) return saved.data
  await del(key)
  const response = await fetch(sampleUrl)
  if (!response.ok) throw new Error('Could not load the sample cache scenario.')
  return cacheWorkspaceSchema.parse(await response.json())
}
export async function saveCache(key: string, workspace: CacheWorkspace) {
  const parsed = cacheWorkspaceSchema.parse(workspace)
  await set(key, parsed)
  return parsed
}
export async function resetCache(key: string, sampleUrl: string) {
  await del(key)
  return loadCache(key, sampleUrl)
}
