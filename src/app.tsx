import { useSignal } from '@preact/signals'
import {
  Activity,
  Clock4,
  Database,
  Download,
  Gauge,
  ListRestart,
  RefreshCw,
  TerminalSquare,
  Upload,
  Zap,
} from 'lucide-preact'
import { filesize } from 'filesize'
import { useEffect, useRef, useState } from 'preact/hooks'
import { ZodError } from 'zod'
import { CacheConsole } from './components/cache-console'
import { EventLog } from './components/event-log'
import { KeyspaceGrid } from './components/keyspace-grid'
import { PolicyPanel } from './components/policy-panel'
import { WorkspaceState } from './components/workspace-state'
import {
  advanceClock,
  cacheDelete,
  cacheGet,
  cacheMetrics,
  cacheSet,
  cacheWorkspaceSchema,
  operationScriptSchema,
  resizeCache,
  runOperationScript,
  type CachePolicy,
  type CacheWorkspace,
} from './domain/cache'
import { loadCache, resetCache, saveCache } from './services/cache-store'

const storageKey = 'dev-cache-simulator-v1'
const sampleUrl = '/sample-cache-scenario.json'

function exportJson(workspace: CacheWorkspace) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(workspace, null, 2)], {
      type: 'application/json',
    }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'cache-simulation.json'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function importError(reason: unknown) {
  if (reason instanceof ZodError) {
    const issue = reason.issues[0]
    const path = issue.path.length ? ` at ${issue.path.join('.')}` : ''
    return `Operation script is invalid${path}: ${issue.message}`
  }
  return reason instanceof Error
    ? reason.message
    : 'Could not replay operations.'
}

export function App() {
  const noticeTimer = useRef<number | undefined>(undefined)
  const selectedKey = useSignal('')
  const [workspace, setWorkspace] = useState<CacheWorkspace | null>(null)
  const [view, setView] = useState<'keyspace' | 'console' | 'timeline'>(
    'keyspace',
  )
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{
    text: string
    error?: boolean
  } | null>(null)

  useEffect(() => {
    void loadCache(storageKey, sampleUrl)
      .then((data) => {
        setWorkspace(data)
        selectedKey.value = data.entries[0]?.key ?? ''
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unexpected scenario error.',
        ),
      )
  }, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  function notify(text: string, isError = false) {
    window.clearTimeout(noticeTimer.current)
    setNotice({ text, error: isError })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2200)
  }
  async function persist(next: CacheWorkspace) {
    try {
      const parsed = cacheWorkspaceSchema.parse(next)
      setWorkspace(parsed)
      await saveCache(storageKey, parsed)
      return true
    } catch (reason) {
      notify(
        reason instanceof Error
          ? reason.message
          : 'Could not save the cache simulation.',
        true,
      )
      return false
    }
  }
  function apply(
    operation: 'GET' | 'SET' | 'DELETE',
    key: string,
    value: string,
    ttl: number,
  ) {
    if (!workspace) return
    try {
      const next =
        operation === 'GET'
          ? cacheGet(workspace, key)
          : operation === 'SET'
            ? cacheSet(workspace, key, value, ttl)
            : cacheDelete(workspace, key)
      void persist(next).then((saved) => {
        if (!saved) return
        selectedKey.value = key.trim()
        notify(`${operation} ${key.trim() || 'operation'} completed.`)
      })
    } catch (reason) {
      notify(
        reason instanceof Error ? reason.message : 'Operation failed.',
        true,
      )
    }
  }
  async function importOperations(file: File) {
    if (!workspace) return
    try {
      const operations = operationScriptSchema.parse(
        JSON.parse(await file.text()),
      )
      if (!(await persist(runOperationScript(workspace, operations)))) return
      notify(`${operations.length} operations replayed.`)
    } catch (reason) {
      notify(importError(reason), true)
    }
  }
  if (!workspace) return <WorkspaceState error={error} />
  const metrics = cacheMetrics(workspace)

  return (
    <main class="min-h-screen bg-[#f3f4f0] text-slate-900">
      <header class="border-b border-[#3a3e32] bg-[#20231d] text-white">
        <div class="mx-auto flex min-h-16 max-w-[1800px] items-center gap-3 px-4 sm:px-6">
          <span class="grid size-10 place-items-center bg-lime-300 text-[#20231d]">
            <Database size={20} />
          </span>
          <div>
            <strong class="block text-sm">Cache Observatory</strong>
            <span class="block text-xs text-lime-100/60">
              Deterministic policy lab
            </span>
          </div>
          <span class="ml-auto hidden text-xs text-slate-300 md:block">
            Clock t+{workspace.now}s · {workspace.config.policy}
          </span>
          <button
            class="grid size-10 place-items-center border border-white/15 hover:bg-white/5 max-md:ml-auto"
            type="button"
            aria-label="Restore sample cache"
            title="Restore sample cache"
            onClick={() =>
              void resetCache(storageKey, sampleUrl)
                .then((data) => {
                  setWorkspace(data)
                  selectedKey.value = data.entries[0]?.key ?? ''
                  setView('keyspace')
                  notify('Sample cache restored.')
                })
                .catch((reason: unknown) =>
                  notify(
                    reason instanceof Error ? reason.message : 'Reset failed.',
                    true,
                  ),
                )
            }
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      <section class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-[1800px] px-4 py-5 sm:px-6">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="text-xs font-bold text-lime-700">
                {workspace.scenario.toUpperCase()}
              </p>
              <h1 class="mt-1 text-2xl font-bold sm:text-3xl">
                See every cache decision
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Run operations against a controllable clock and compare eviction
                policies without waiting for real TTLs.
              </p>
            </div>
            <div class="flex gap-2">
              <label class="inline-flex h-11 cursor-pointer items-center gap-2 border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50">
                <Upload size={17} />
                <span class="hidden sm:inline">Replay script</span>
                <span class="sm:hidden">Replay</span>
                <input
                  class="sr-only"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0]
                    if (file) void importOperations(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button
                class="inline-flex h-11 items-center gap-2 border border-slate-300 px-3 text-sm font-bold hover:bg-slate-50"
                type="button"
                onClick={() => {
                  exportJson(workspace)
                  notify('Simulation exported.')
                }}
              >
                <Download size={17} /> Export
              </button>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-2 border border-slate-200 bg-slate-50 lg:grid-cols-4">
            {[
              [`${metrics.hitRate}%`, 'Hit rate', Activity],
              [
                `${workspace.entries.length}/${workspace.config.capacity}`,
                'Occupancy',
                Gauge,
              ],
              [filesize(metrics.bytes), 'Stored payload', Database],
              [workspace.stats.evictions, 'Evictions', Zap],
            ].map(([value, label, Icon]) => {
              const MetricIcon = Icon as typeof Activity
              return (
                <div
                  class="flex min-h-20 min-w-0 items-center gap-2 border-r border-b border-slate-200 px-3 sm:gap-3 sm:px-4 lg:border-b-0"
                  key={label as string}
                >
                  <MetricIcon class="shrink-0 text-lime-700" size={18} />
                  <span class="min-w-0">
                    <strong class="block truncate text-lg sm:text-xl">
                      {value as string}
                    </strong>
                    <span class="text-xs text-slate-500">
                      {label as string}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <strong class="text-slate-700">Traffic</strong>
            <span>{workspace.stats.hits} hits</span>
            <span>{workspace.stats.misses} misses</span>
            <span>{workspace.stats.writes} writes</span>
            <span class="ml-auto flex items-center gap-1.5 font-bold text-lime-800">
              <Clock4 size={14} /> Simulated t+{workspace.now}s
            </span>
          </div>
        </div>
      </section>

      <nav
        class="border-b border-slate-200 bg-white xl:hidden"
        aria-label="Cache simulator views"
      >
        <div class="flex">
          {(
            [
              ['keyspace', Database, 'Keyspace'],
              ['console', TerminalSquare, 'Controls'],
              ['timeline', ListRestart, 'Timeline'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              class={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1 border-b-2 px-1 text-xs font-bold ${view === value ? 'border-lime-700 text-lime-800' : 'border-transparent text-slate-500'}`}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              key={value}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </nav>

      <div class="mx-auto grid max-w-[1800px] items-start gap-4 p-0 sm:p-6 xl:grid-cols-[330px_minmax(0,1fr)_330px]">
        <div
          class={`space-y-4 ${view === 'console' ? 'block' : 'hidden xl:block'}`}
        >
          <CacheConsole
            selectedKey={selectedKey.value}
            defaultTtl={workspace.config.defaultTtl}
            onRun={apply}
          />
          <PolicyPanel
            workspace={workspace}
            onPolicy={(policy: CachePolicy) =>
              void persist({
                ...workspace,
                config: { ...workspace.config, policy },
              })
            }
            onCapacity={(capacity) =>
              void persist(resizeCache(workspace, capacity))
            }
            onTtl={(defaultTtl) =>
              void persist({
                ...workspace,
                config: { ...workspace.config, defaultTtl },
              })
            }
            onAdvance={(seconds) =>
              void persist(advanceClock(workspace, seconds)).then(
                (saved) => saved && notify(`Clock advanced by ${seconds}s.`),
              )
            }
            onWarm={() => {
              let next = workspace
              ;[
                ['session:demo', '{"user":"demo"}'],
                ['feature:checkout', 'enabled'],
                ['rate:inventory', '42'],
              ].forEach(([key, value]) => {
                next = cacheSet(next, key, value, workspace.config.defaultTtl)
              })
              void persist(next).then(
                (saved) => saved && notify('Sample keys warmed.'),
              )
            }}
          />
        </div>
        <div class={view === 'keyspace' ? 'block' : 'hidden xl:block'}>
          <KeyspaceGrid
            workspace={workspace}
            selectedKey={selectedKey.value}
            onSelect={(entry) => {
              selectedKey.value = entry.key
              if (innerWidth < 1280) setView('console')
            }}
          />
        </div>
        <div class={view === 'timeline' ? 'block' : 'hidden xl:block'}>
          <EventLog
            events={workspace.events}
            onClear={() =>
              void persist({ ...workspace, events: [] }).then(
                (saved) => saved && notify('Timeline cleared.'),
              )
            }
          />
        </div>
      </div>
      {notice && (
        <div
          class={`fixed right-4 bottom-4 z-50 max-w-sm border bg-white px-4 py-3 text-sm font-bold shadow-xl ${notice.error ? 'border-red-200 text-red-800' : 'border-lime-200 text-lime-800'}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.text}
        </div>
      )}
    </main>
  )
}
