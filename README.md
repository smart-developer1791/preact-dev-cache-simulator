<div align="center">

# ✦ Preact Dev Cache Simulator

**A deterministic cache laboratory for comparing eviction policies, TTL behavior, hit rates, and scripted traffic.**

![Preact](https://img.shields.io/badge/Preact-10-673ab8?style=for-the-badge&logo=preact&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![Cache](https://img.shields.io/badge/Cache-LRU_FIFO_LFU-4d7c0f?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

</div>

---

## ✨ Highlights

- **Real Policy Model:** Implements LRU, FIFO, and LFU eviction with deterministic tie-breaking.
- **Controllable Clock:** Advances virtual time explicitly so TTL expiration is immediate to test and easy to reproduce.
- **Command Console:** Runs GET, SET, and DELETE operations with editable values and per-write TTL.
- **Live Keyspace:** Visualizes occupancy, remaining TTL, access count, payload size, and freshness for every entry.
- **Traffic Metrics:** Tracks hits, misses, writes, evictions, occupancy, stored bytes, and hit rate.
- **Policy Controls:** Changes capacity, default TTL, eviction strategy, and clock position while the scenario is running.
- **Capacity Resize:** Evicts entries under the active policy when capacity is reduced.
- **Script Replay:** Validates and executes a JSON sequence of cache operations and clock advances.
- **Event Timeline:** Explains hits, misses, stores, deletes, expirations, and evictions in order.
- **Responsive Workflow:** Separates Keyspace, Controls, and Timeline on compact screens while keeping all three visible on desktop.

## 🧱 Project Structure

```text
public/
|-- favicon.svg
|-- sample-cache-scenario.json
`-- sample-operations.json
src/
|-- app.tsx
|-- main.tsx
|-- index.css
|-- components/
|   |-- cache-console.tsx
|   |-- event-log.tsx
|   |-- keyspace-grid.tsx
|   |-- policy-panel.tsx
|   `-- workspace-state.tsx
|-- domain/
|   `-- cache.ts
`-- services/
    `-- cache-store.ts
```

## 🛠️ Tech Stack

- Preact 10 with Vite 8
- TypeScript 6
- Tailwind CSS 4
- `filesize`
- `zod`, `idb-keyval`, `@preact/signals`, and `lucide-preact`

## 📦 Included Sample Data

`public/sample-cache-scenario.json` provides five fictional storefront keys with different ages, hit counts, and TTLs. `public/sample-operations.json` demonstrates a hit, miss, write, and time advance.

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## 🔌 Extension Notes & Nuances

- The simulator uses virtual seconds. It does not wait on wall-clock timers, making every scenario reproducible.
- Expired entries are purged before cache operations and whenever the clock advances.
- LRU compares last access time, FIFO compares insertion sequence, and LFU compares hit count before recency.
- Updating an existing key preserves its access history and insertion order while refreshing its value and expiration.
- Displayed bytes are UTF-8 payload sizes, not JavaScript object overhead or infrastructure memory usage.
- Hit rate counts GET operations only; DELETE misses do not distort request hit-rate metrics.
- This is an educational policy model, not a Redis or CDN performance benchmark.

## 🧪 Build & Checks

```bash
npm run format:check
npm run build
npm run preview
```

## 🌐 Vercel Deployment

The repository includes a Vite-ready `vercel.json` with SPA rewrites.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 📄 License

MIT License. See [LICENSE](./LICENSE).
