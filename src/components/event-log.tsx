import {
  ArrowDownToLine,
  Clock3,
  ListRestart,
  SearchX,
  Trash2,
  Zap,
} from 'lucide-preact'
import type { CacheEvent } from '../domain/cache'

const resultStyles: Record<CacheEvent['result'], string> = {
  hit: 'bg-emerald-100 text-emerald-800',
  miss: 'bg-slate-200 text-slate-700',
  stored: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  expired: 'bg-amber-100 text-amber-800',
  evicted: 'bg-orange-100 text-orange-800',
}
const icons = {
  GET: SearchX,
  SET: ArrowDownToLine,
  DELETE: Trash2,
  EXPIRE: Clock3,
  EVICT: Zap,
}

export function EventLog({
  events,
  onClear,
}: {
  events: CacheEvent[]
  onClear: () => void
}) {
  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 class="flex items-center gap-2 font-bold">
            <ListRestart class="text-lime-700" size={17} /> Event timeline
          </h2>
          <p class="mt-1 text-xs text-slate-500">Newest operation first</p>
        </div>
        <button
          class="grid size-9 place-items-center border border-slate-300 text-slate-500 hover:text-red-600 disabled:opacity-40"
          type="button"
          disabled={!events.length}
          aria-label="Clear cache event timeline"
          onClick={onClear}
        >
          <Trash2 size={15} />
        </button>
      </header>
      <div class="max-h-[720px] divide-y divide-slate-100 overflow-auto">
        {events.map((item) => {
          const Icon = icons[item.operation]
          return (
            <article class="p-4" key={item.id}>
              <div class="flex items-center gap-2">
                <Icon class="text-slate-500" size={15} />
                <strong class="font-mono text-xs">{item.operation}</strong>
                <span
                  class={`ml-auto px-2 py-1 text-xs font-bold ${resultStyles[item.result]}`}
                >
                  {item.result}
                </span>
              </div>
              <p
                class="mt-2 truncate font-mono text-sm font-bold"
                title={item.key}
              >
                {item.key}
              </p>
              <p class="mt-1 text-xs leading-5 text-slate-500">
                {item.detail} · t+{item.at}s
              </p>
            </article>
          )
        })}
        {!events.length && (
          <p class="p-8 text-center text-sm text-slate-500">
            Operations will appear here.
          </p>
        )}
      </div>
    </section>
  )
}
