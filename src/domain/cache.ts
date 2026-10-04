import { z } from 'zod'

const policySchema = z.enum(['LRU', 'FIFO', 'LFU'])
const eventResultSchema = z.enum([
  'hit',
  'miss',
  'stored',
  'deleted',
  'expired',
  'evicted',
])

export const cacheEntrySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.number().nonnegative(),
  lastAccessedAt: z.number().nonnegative(),
  expiresAt: z.number().positive(),
  hits: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
})

export const cacheEventSchema = z.object({
  id: z.string().min(1),
  at: z.number().nonnegative(),
  operation: z.enum(['GET', 'SET', 'DELETE', 'EXPIRE', 'EVICT']),
  result: eventResultSchema,
  key: z.string(),
  detail: z.string(),
})

export const cacheWorkspaceSchema = z
  .object({
    scenario: z.string().min(1),
    now: z.number().nonnegative(),
    sequence: z.number().int().nonnegative(),
    config: z.object({
      policy: policySchema,
      capacity: z.number().int().min(2).max(12),
      defaultTtl: z.number().int().min(10).max(600),
    }),
    entries: z.array(cacheEntrySchema),
    events: z.array(cacheEventSchema).max(80),
    stats: z.object({
      hits: z.number().int().nonnegative(),
      misses: z.number().int().nonnegative(),
      evictions: z.number().int().nonnegative(),
      writes: z.number().int().nonnegative(),
    }),
  })
  .superRefine((workspace, context) => {
    const keys = new Set(workspace.entries.map((entry) => entry.key))
    if (keys.size !== workspace.entries.length) {
      context.addIssue({
        code: 'custom',
        path: ['entries'],
        message: 'Cache keys must be unique.',
      })
    }
    if (workspace.entries.length > workspace.config.capacity) {
      context.addIssue({
        code: 'custom',
        path: ['entries'],
        message: 'Entry count cannot exceed cache capacity.',
      })
    }
    const eventIds = new Set(workspace.events.map((item) => item.id))
    if (eventIds.size !== workspace.events.length) {
      context.addIssue({
        code: 'custom',
        path: ['events'],
        message: 'Event IDs must be unique.',
      })
    }
    workspace.entries.forEach((entry, index) => {
      if (entry.expiresAt <= entry.createdAt) {
        context.addIssue({
          code: 'custom',
          path: ['entries', index, 'expiresAt'],
          message: 'Expiration must be after creation.',
        })
      }
    })
  })

export const operationScriptSchema = z
  .array(
    z.discriminatedUnion('operation', [
      z.object({ operation: z.literal('GET'), key: z.string().min(1) }),
      z.object({
        operation: z.literal('SET'),
        key: z.string().min(1),
        value: z.string(),
        ttl: z.number().positive(),
      }),
      z.object({ operation: z.literal('DELETE'), key: z.string().min(1) }),
      z.object({
        operation: z.literal('ADVANCE'),
        seconds: z.number().positive(),
      }),
    ]),
  )
  .min(1)
  .max(200)

export type CachePolicy = z.infer<typeof policySchema>
export type CacheEntry = z.infer<typeof cacheEntrySchema>
export type CacheEvent = z.infer<typeof cacheEventSchema>
export type CacheWorkspace = z.infer<typeof cacheWorkspaceSchema>
export type CacheOperation = z.infer<typeof operationScriptSchema>[number]

function event(
  operation: CacheEvent['operation'],
  result: CacheEvent['result'],
  key: string,
  detail: string,
  at: number,
): CacheEvent {
  return { id: crypto.randomUUID(), at, operation, result, key, detail }
}

function appendEvents(workspace: CacheWorkspace, events: CacheEvent[]) {
  return [...events, ...workspace.events].slice(0, 80)
}

export function purgeExpired(workspace: CacheWorkspace): CacheWorkspace {
  const expired = workspace.entries.filter(
    (entry) => entry.expiresAt <= workspace.now,
  )
  if (!expired.length) return workspace
  return {
    ...workspace,
    entries: workspace.entries.filter(
      (entry) => entry.expiresAt > workspace.now,
    ),
    events: appendEvents(
      workspace,
      expired.map((entry) =>
        event('EXPIRE', 'expired', entry.key, 'TTL elapsed', workspace.now),
      ),
    ),
  }
}

function evictionCandidate(entries: CacheEntry[], policy: CachePolicy) {
  return [...entries].sort((left, right) => {
    if (policy === 'FIFO') return left.sequence - right.sequence
    if (policy === 'LFU')
      return (
        left.hits - right.hits || left.lastAccessedAt - right.lastAccessedAt
      )
    return left.lastAccessedAt - right.lastAccessedAt
  })[0]
}

export function cacheGet(source: CacheWorkspace, key: string): CacheWorkspace {
  const workspace = purgeExpired(source)
  const normalized = key.trim()
  if (!normalized) throw new Error('Enter a cache key.')
  const found = workspace.entries.find((entry) => entry.key === normalized)
  if (!found)
    return {
      ...workspace,
      stats: { ...workspace.stats, misses: workspace.stats.misses + 1 },
      events: appendEvents(workspace, [
        event('GET', 'miss', normalized, 'Key was not present', workspace.now),
      ]),
    }
  return {
    ...workspace,
    entries: workspace.entries.map((entry) =>
      entry.key === normalized
        ? { ...entry, hits: entry.hits + 1, lastAccessedAt: workspace.now }
        : entry,
    ),
    stats: { ...workspace.stats, hits: workspace.stats.hits + 1 },
    events: appendEvents(workspace, [
      event(
        'GET',
        'hit',
        normalized,
        `Returned ${found.sizeBytes} bytes`,
        workspace.now,
      ),
    ]),
  }
}

export function cacheSet(
  source: CacheWorkspace,
  key: string,
  value: string,
  ttl: number,
): CacheWorkspace {
  let workspace = purgeExpired(source)
  const normalized = key.trim()
  if (!normalized) throw new Error('Enter a cache key.')
  if (!Number.isFinite(ttl) || ttl < 1)
    throw new Error('TTL must be at least one second.')
  const existing = workspace.entries.find((entry) => entry.key === normalized)
  const nextSequence = workspace.sequence + 1
  const nextEntry: CacheEntry = {
    key: normalized,
    value,
    sizeBytes: new Blob([value]).size,
    createdAt: existing?.createdAt ?? workspace.now,
    lastAccessedAt: workspace.now,
    expiresAt: workspace.now + ttl,
    hits: existing?.hits ?? 0,
    sequence: existing?.sequence ?? nextSequence,
  }
  let entries = [
    ...workspace.entries.filter((entry) => entry.key !== normalized),
    nextEntry,
  ]
  const events = [
    event('SET', 'stored', normalized, `TTL ${ttl}s`, workspace.now),
  ]
  let evictions = workspace.stats.evictions
  while (entries.length > workspace.config.capacity) {
    const candidate =
      evictionCandidate(
        entries.filter((entry) => entry.key !== normalized),
        workspace.config.policy,
      ) ?? evictionCandidate(entries, workspace.config.policy)
    entries = entries.filter((entry) => entry.key !== candidate.key)
    events.push(
      event(
        'EVICT',
        'evicted',
        candidate.key,
        `${workspace.config.policy} capacity limit`,
        workspace.now,
      ),
    )
    evictions += 1
  }
  workspace = {
    ...workspace,
    sequence: existing ? workspace.sequence : nextSequence,
    entries,
    stats: {
      ...workspace.stats,
      writes: workspace.stats.writes + 1,
      evictions,
    },
    events: appendEvents(workspace, [...events].reverse()),
  }
  return workspace
}

export function cacheDelete(
  source: CacheWorkspace,
  key: string,
): CacheWorkspace {
  const workspace = purgeExpired(source)
  const normalized = key.trim()
  if (!normalized) throw new Error('Enter a cache key.')
  const exists = workspace.entries.some((entry) => entry.key === normalized)
  return {
    ...workspace,
    entries: workspace.entries.filter((entry) => entry.key !== normalized),
    events: appendEvents(workspace, [
      event(
        'DELETE',
        exists ? 'deleted' : 'miss',
        normalized,
        exists ? 'Key removed manually' : 'Key was not present',
        workspace.now,
      ),
    ]),
  }
}

export function advanceClock(source: CacheWorkspace, seconds: number) {
  return purgeExpired({ ...source, now: source.now + seconds })
}

export function resizeCache(
  source: CacheWorkspace,
  capacity: number,
): CacheWorkspace {
  let workspace = purgeExpired({
    ...source,
    config: { ...source.config, capacity },
  })
  while (workspace.entries.length > capacity) {
    const candidate = evictionCandidate(
      workspace.entries,
      workspace.config.policy,
    )
    workspace = {
      ...workspace,
      entries: workspace.entries.filter((entry) => entry.key !== candidate.key),
      stats: { ...workspace.stats, evictions: workspace.stats.evictions + 1 },
      events: appendEvents(workspace, [
        event(
          'EVICT',
          'evicted',
          candidate.key,
          `${workspace.config.policy} resized capacity`,
          workspace.now,
        ),
      ]),
    }
  }
  return workspace
}

export function cacheMetrics(workspace: CacheWorkspace) {
  const requests = workspace.stats.hits + workspace.stats.misses
  return {
    hitRate: requests ? Math.round((workspace.stats.hits / requests) * 100) : 0,
    requests,
    occupancy: Math.round(
      (workspace.entries.length / workspace.config.capacity) * 100,
    ),
    bytes: workspace.entries.reduce(
      (total, entry) => total + entry.sizeBytes,
      0,
    ),
  }
}

export function runOperationScript(
  source: CacheWorkspace,
  operations: CacheOperation[],
) {
  return operations.reduce((workspace, operation) => {
    if (operation.operation === 'GET') return cacheGet(workspace, operation.key)
    if (operation.operation === 'SET')
      return cacheSet(workspace, operation.key, operation.value, operation.ttl)
    if (operation.operation === 'DELETE')
      return cacheDelete(workspace, operation.key)
    return advanceClock(workspace, operation.seconds)
  }, source)
}
