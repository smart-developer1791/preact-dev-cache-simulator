import { Braces, Play, Trash2 } from 'lucide-preact'
import { useEffect, useState } from 'preact/hooks'

type Props = {
  selectedKey: string
  defaultTtl: number
  onRun: (
    operation: 'GET' | 'SET' | 'DELETE',
    key: string,
    value: string,
    ttl: number,
  ) => void
}

export function CacheConsole({ selectedKey, defaultTtl, onRun }: Props) {
  const [operation, setOperation] = useState<'GET' | 'SET' | 'DELETE'>('GET')
  const [key, setKey] = useState(selectedKey)
  const [value, setValue] = useState('{"fresh":true}')
  const [ttl, setTtl] = useState(defaultTtl)
  useEffect(() => {
    if (selectedKey) setKey(selectedKey)
  }, [selectedKey])
  useEffect(() => setTtl(defaultTtl), [defaultTtl])
  return (
    <section class="border-y border-slate-200 bg-white sm:border">
      <header class="border-b border-slate-200 p-4">
        <h2 class="font-bold">Command console</h2>
        <p class="mt-1 text-xs text-slate-500">
          Execute one deterministic cache operation.
        </p>
      </header>
      <div class="p-4">
        <div class="grid grid-cols-[100px_minmax(0,1fr)] gap-2">
          <label>
            <span class="sr-only">Cache operation</span>
            <select
              class="h-10 w-full border border-slate-300 bg-slate-50 px-2 text-sm font-black text-lime-800"
              value={operation}
              onChange={(event) =>
                setOperation(event.currentTarget.value as typeof operation)
              }
            >
              <option>GET</option>
              <option>SET</option>
              <option>DELETE</option>
            </select>
          </label>
          <label>
            <span class="sr-only">Cache key</span>
            <input
              class="h-10 w-full min-w-0 border border-slate-300 px-3 font-mono text-sm"
              value={key}
              onInput={(event) => setKey(event.currentTarget.value)}
              placeholder="namespace:key"
            />
          </label>
        </div>
        {operation === 'SET' && (
          <div class="mt-3">
            <label>
              <span class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
                <Braces size={14} /> VALUE
              </span>
              <textarea
                class="min-h-28 w-full resize-y border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-5"
                value={value}
                onInput={(event) => setValue(event.currentTarget.value)}
              />
            </label>
            <label class="mt-3 block">
              <span class="mb-1.5 block text-xs font-bold text-slate-500">
                TTL: {ttl} SECONDS
              </span>
              <input
                class="w-full accent-lime-700"
                type="range"
                min="10"
                max="300"
                step="5"
                value={ttl}
                onInput={(event) => setTtl(Number(event.currentTarget.value))}
              />
            </label>
          </div>
        )}
        <button
          class={`mt-3 inline-flex h-11 w-full items-center justify-center gap-2 px-3 text-sm font-bold text-white ${operation === 'DELETE' ? 'bg-red-700 hover:bg-red-800' : 'bg-lime-700 hover:bg-lime-800'}`}
          type="button"
          onClick={() => onRun(operation, key, value, ttl)}
        >
          {operation === 'DELETE' ? <Trash2 size={17} /> : <Play size={17} />}{' '}
          Run {operation}
        </button>
      </div>
    </section>
  )
}
