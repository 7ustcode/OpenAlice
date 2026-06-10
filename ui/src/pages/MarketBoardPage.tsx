import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import { referenceApi, type MoversBoard, type MoverRow, type ReferenceMeta } from '../api/reference'
import { useWorkspace } from '../tabs/store'
import type { ViewSpec } from '../tabs/types'

type BoardKind = Extract<ViewSpec, { kind: 'market-board' }>['params']['board']

/** Tab titles (plain English, matching the registry's other title strings). */
export const MARKET_BOARD_TITLES: Record<BoardKind, string> = {
  movers: 'Movers',
}

const REFRESH_MS = 5 * 60 * 1000

interface PageProps {
  spec: Extract<ViewSpec, { kind: 'market-board' }>
  visible: boolean
}

export function MarketBoardPage({ spec }: PageProps) {
  switch (spec.params.board) {
    case 'movers':
      return <MoversBoardView />
  }
}

// ==================== Movers ====================

type MoversList = 'gainers' | 'losers' | 'active'

function MoversBoardView() {
  const { t } = useTranslation()
  const [data, setData] = useState<MoversBoard | null>(null)
  const [list, setList] = useState<MoversList>('gainers')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await referenceApi.movers()
        if (!alive) return
        setData(res)
        setUpdatedAt(new Date())
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  const rows = data?.[list] ?? []

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title={t('market.boardMovers')}
        description={
          <>
            {t('market.moversSubtitle')}
            {data && <ProviderBadge meta={data.meta} />}
          </>
        }
        live={{ lastUpdated: updatedAt }}
      />
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 flex flex-col gap-4 min-h-0">
        <div className="flex items-center gap-1">
          {(['gainers', 'losers', 'active'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setList(k)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                list === k
                  ? 'bg-bg-tertiary text-text'
                  : 'text-text-muted hover:text-text hover:bg-bg-secondary'
              }`}
            >
              {listLabel(k, t)}
            </button>
          ))}
        </div>

        {loading && !data && <div className="text-[13px] text-text-muted">{t('common.loading')}</div>}
        {error && (
          <div className="text-[13px] text-red border border-red/30 rounded-md px-3 py-2 bg-red/5">{error}</div>
        )}
        {data && rows.length === 0 && !loading && (
          <div className="text-[13px] text-text-muted">{t('market.noMatches')}</div>
        )}
        {rows.length > 0 && <MoversTable rows={rows} />}
      </div>
    </div>
  )
}

function listLabel(k: MoversList, t: ReturnType<typeof useTranslation>['t']): string {
  switch (k) {
    case 'gainers': return t('market.moversGainers')
    case 'losers': return t('market.moversLosers')
    case 'active': return t('market.moversActive')
  }
}

/** Explicit provider label — same disambiguation philosophy as bar sources. */
function ProviderBadge({ meta }: { meta: ReferenceMeta }) {
  return (
    <span className="text-text-muted/50"> · {meta.provider}</span>
  )
}

function MoversTable({ rows }: { rows: MoverRow[] }) {
  const { t } = useTranslation()
  const openOrFocus = useWorkspace((s) => s.openOrFocus)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="text-text-muted/70 text-left border-b border-border">
            <th className="py-1.5 pr-3 font-medium">{t('market.colSymbol')}</th>
            <th className="py-1.5 px-3 font-medium text-right">{t('market.colPrice')}</th>
            <th className="py-1.5 px-3 font-medium text-right">{t('market.colChangePct')}</th>
            <th className="py-1.5 px-3 font-medium text-right">{t('market.colVolume')}</th>
            <th className="py-1.5 px-3 font-medium text-right">{t('market.colRvol')}</th>
            <th className="py-1.5 pl-3 font-medium text-right">{t('market.colDollarVolume')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.symbol}
              className="border-b border-border/50 hover:bg-bg-secondary/40 cursor-pointer"
              onClick={() => openOrFocus({ kind: 'market-detail', params: { assetClass: 'equity', symbol: r.symbol } })}
            >
              <td className="py-1.5 pr-3">
                <span className="font-mono font-semibold text-text">{r.symbol}</span>
                {r.name && <span className="ml-2 text-text-muted">{r.name}</span>}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-text">{fmtPrice(r.price)}</td>
              <td className={`py-1.5 px-3 text-right font-mono ${signColor(r.percent_change)}`}>{fmtPct(r.percent_change)}</td>
              <td className="py-1.5 px-3 text-right text-text">{fmtCompact(r.volume)}</td>
              <td className={`py-1.5 px-3 text-right ${rvolColor(r.relative_volume)}`}>{r.relative_volume?.toFixed(2) ?? '—'}</td>
              <td className="py-1.5 pl-3 text-right text-text">{fmtCompact(r.dollar_volume, '$')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtPrice(x: number | null): string {
  return x == null ? '—' : x.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
function fmtPct(x: number | null): string {
  // percent_change is normalized to a fraction in the provider (0.052 = +5.2%).
  return x == null ? '—' : `${x > 0 ? '+' : ''}${(x * 100).toFixed(2)}%`
}
function fmtCompact(x: number | null, prefix = ''): string {
  if (x == null) return '—'
  const abs = Math.abs(x)
  if (abs >= 1e12) return `${prefix}${(x / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${prefix}${(x / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${prefix}${(x / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${prefix}${(x / 1e3).toFixed(1)}K`
  return `${prefix}${x.toFixed(0)}`
}
function signColor(x: number | null): string {
  if (x == null) return 'text-text-muted'
  return x > 0 ? 'text-green' : x < 0 ? 'text-red' : 'text-text-muted'
}
function rvolColor(x: number | null): string {
  if (x == null) return 'text-text-muted'
  return x >= 2 ? 'text-amber-400 font-semibold' : 'text-text'
}
