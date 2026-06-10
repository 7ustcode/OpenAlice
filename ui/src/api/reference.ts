/**
 * Reference-data API — `/api/reference/*`.
 *
 * OpenAlice's own low-frequency data contract (boards: movers, macro,
 * calendar, …). New market surfaces consume THIS namespace — never the
 * legacy OpenBB-compatible `/api/market-data-v1` passthrough.
 */

import { fetchJson } from './client'

/** Envelope on every reference payload — provider is an explicit label,
 *  shown in the UI (same disambiguation philosophy as bar sources). */
export interface ReferenceMeta {
  provider: string
  asOf: string
  cachedAt?: string
}

/** One row of a movers list (gainers / losers / active). */
export interface MoverRow {
  symbol: string
  name: string | null
  price: number | null
  change: number | null
  percent_change: number | null
  volume: number | null
  avg_volume: number | null
  /** Today's volume / 3-month average — the "unusual for itself?" read. */
  relative_volume: number | null
  turnover: number | null
  /** Price × volume — the cross-ticker-comparable "where is the money" read. */
  dollar_volume: number | null
}

export interface MoversBoard {
  gainers: MoverRow[]
  losers: MoverRow[]
  active: MoverRow[]
  meta: ReferenceMeta
}

export const referenceApi = {
  movers: () => fetchJson<MoversBoard>('/api/reference/movers'),
}
