import { Clock4, DatabaseZap, Flame, Gauge } from 'lucide-preact'
import type { CachePolicy, CacheWorkspace } from '../domain/cache'

type Props = {
  workspace: CacheWorkspace
  onPolicy: (policy: CachePolicy) => void
  onCapacity: (capacity: number) => void
  onTtl: (ttl: number) => void
  onAdvance: (seconds: number) => void
  onWarm: () => void
}
export function PolicyPanel({
  workspace,
  onPolicy,
  onCapacity,
  onTtl,
  onAdvance,
  onWarm,
}: Props) {
  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <h2 class="flex items-center gap-2 font-bold">
          <DatabaseZap class="text-lime-700" size={18} /> Policy controls
        </h2>
        <p class="mt-1 text-xs text-slate-500">
          Changes affect the next operation.
        </p>
      </header>
      <div class="space-y-4 p-4">
        <label class="block">
          <span class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Flame size={14} /> EVICTION POLICY
          </span>
          <select
            class="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-bold"
            value={workspace.config.policy}
            onChange={(event) =>
              onPolicy(event.currentTarget.value as CachePolicy)
            }
          >
            <option>LRU</option>
            <option>FIFO</option>
            <option>LFU</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500">
            <span class="flex items-center gap-2">
              <Gauge size={14} /> CAPACITY
            </span>
            <strong class="text-slate-800">{workspace.config.capacity}</strong>
          </span>
          <input
            class="w-full accent-lime-700"
            type="range"
            min="2"
            max="12"
            value={workspace.config.capacity}
            onInput={(event) => onCapacity(Number(event.currentTarget.value))}
          />
        </label>
        <label class="block">
          <span class="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500">
            <span class="flex items-center gap-2">
              <Clock4 size={14} /> DEFAULT TTL
            </span>
            <strong class="text-slate-800">
              {workspace.config.defaultTtl}s
            </strong>
          </span>
          <input
            class="w-full accent-lime-700"
            type="range"
            min="10"
            max="300"
            step="10"
            value={workspace.config.defaultTtl}
            onInput={(event) => onTtl(Number(event.currentTarget.value))}
          />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            class="h-10 border border-slate-300 text-xs font-bold hover:bg-slate-50"
            type="button"
            onClick={() => onAdvance(10)}
          >
            +10 seconds
          </button>
          <button
            class="h-10 border border-slate-300 text-xs font-bold hover:bg-slate-50"
            type="button"
            onClick={() => onAdvance(60)}
          >
            +60 seconds
          </button>
        </div>
        <button
          class="h-10 w-full bg-[#20231d] px-3 text-sm font-bold text-white hover:bg-black"
          type="button"
          onClick={onWarm}
        >
          Warm sample keys
        </button>
      </div>
    </section>
  )
}
