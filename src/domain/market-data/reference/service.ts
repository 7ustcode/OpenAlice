/**
 * Reference-data service — in-process implementation of the reference
 * contract (see types.ts). Aggregates the opentypebb SDK clients into
 * board-shaped payloads with the explicit meta envelope.
 */

import type { EquityClientLike } from '../client/types.js'
import type { MoversBoard, ReferenceDataService } from './types.js'

export interface ReferenceDataDeps {
  equityClient: EquityClientLike
  /** Configured default equity provider — the meta label. On the SDK backend
   *  the client routes by its constructed default, so the label is the
   *  REQUESTED provider (same caveat as the bar layer's vendor meta). */
  equityProvider: string
}

/** Rows per movers list — enough for a board, small enough to stay snappy. */
const MOVERS_LIMIT = 25

export function createReferenceData(deps: ReferenceDataDeps): ReferenceDataService {
  return {
    async movers(): Promise<MoversBoard> {
      // One list failing must not kill the board — same resilience rule as
      // the federated search fan-out.
      const [gainers, losers, active] = await Promise.allSettled([
        deps.equityClient.getGainers(),
        deps.equityClient.getLosers(),
        deps.equityClient.getActive(),
      ])
      const rows = (r: PromiseSettledResult<MoversBoard['gainers']>) =>
        r.status === 'fulfilled' ? r.value.slice(0, MOVERS_LIMIT) : []
      return {
        gainers: rows(gainers),
        losers: rows(losers),
        active: rows(active),
        meta: { provider: deps.equityProvider, asOf: new Date().toISOString() },
      }
    },
  }
}
