import { Box, Clock3, Flame, MousePointerClick } from 'lucide-preact'
import { filesize } from 'filesize'
import type { CacheEntry, CacheWorkspace } from '../domain/cache'

type Props = {
  workspace: CacheWorkspace
  selectedKey: string
  onSelect: (entry: CacheEntry) => void
}

export function KeyspaceGrid({ workspace, selectedKey, onSelect }: Props) {
  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <header class="flex items-end justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
        <div>
          <h2 class="font-bold">Live keyspace</h2>
          <p class="mt-1 text-sm text-slate-500">
            Select a key to target it in the console.
          </p>
        </div>
        <span class="text-xs font-bold text-lime-800">
          {workspace.entries.length}/{workspace.config.capacity} slots
        </span>
      </header>
      <div class="grid gap-px bg-slate-200 sm:grid-cols-2 2xl:grid-cols-3">
        {workspace.entries.map((entry) => {
          const lifetime = entry.expiresAt - entry.createdAt
          const remaining = Math.max(0, entry.expiresAt - workspace.now)
          const freshness = Math.max(
            0,
            Math.min(100, Math.round((remaining / lifetime) * 100)),
          )
          return (
            <button
              class={`min-w-0 bg-white p-4 text-left hover:bg-lime-50 sm:p-5 ${selectedKey === entry.key ? 'outline-2 -outline-offset-2 outline-lime-600' : ''}`}
              type="button"
              onClick={() => onSelect(entry)}
              key={entry.key}
            >
              <span class="flex items-start gap-3">
                <span class="grid size-9 shrink-0 place-items-center bg-lime-100 text-lime-800">
                  <Box size={17} />
                </span>
                <span class="min-w-0 flex-1">
                  <strong
                    class="block truncate font-mono text-sm"
                    title={entry.key}
                  >
                    {entry.key}
                  </strong>
                  <span class="mt-1 block truncate font-mono text-xs text-slate-400">
                    {entry.value}
                  </span>
                </span>
              </span>
              <span class="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <Clock3 size={13} /> {remaining}s TTL
                </span>
                <span class="flex items-center gap-1">
                  <Flame size={13} /> {entry.hits} hits
                </span>
                <span>{filesize(entry.sizeBytes)}</span>
              </span>
              <span class="mt-3 block h-1.5 bg-slate-200">
                <span
                  class={`block h-full ${freshness < 25 ? 'bg-red-500' : freshness < 55 ? 'bg-amber-500' : 'bg-lime-600'}`}
                  style={{ width: `${freshness}%` }}
                />
              </span>
            </button>
          )
        })}
        {!workspace.entries.length && (
          <div class="col-span-full p-10 text-center">
            <MousePointerClick class="mx-auto text-slate-300" size={28} />
            <h3 class="mt-3 font-bold">The cache is empty</h3>
            <p class="mt-2 text-sm text-slate-500">
              Run SET or warm the sample keyspace.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
