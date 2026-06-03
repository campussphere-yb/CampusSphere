/**
 * MockBanner — shown at the top of a page when demo data is being displayed
 * because the backend returned no real data yet.
 */
export default function MockBanner() {
  return (
    <div className="mb-5 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg">
      <span className="text-sm">⚡</span>
      <span>
        <strong>Demo data</strong> — no real mentions ingested yet.
        Connect sources and run a sync to see live monitoring data.
      </span>
    </div>
  )
}
