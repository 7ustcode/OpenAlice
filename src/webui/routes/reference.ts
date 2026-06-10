/**
 * Reference-data routes — `/api/reference/*`.
 *
 * Thin HTTP adapters over the reference-data contract
 * (`domain/market-data/reference/`). This namespace is OpenAlice's own
 * low-frequency data standard — new frontend surfaces consume THIS, never
 * the OpenBB-compatible `/api/market-data-v1` passthrough (which is on its
 * way out).
 */

import { Hono } from 'hono'
import type { EngineContext } from '../../core/types.js'

export function createReferenceRoutes(ctx: EngineContext): Hono {
  const app = new Hono()

  // GET /api/reference/movers → gainers / losers / active board
  app.get('/movers', async (c) => {
    try {
      return c.json(await ctx.reference.movers())
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : String(err) }, 502)
    }
  })

  return app
}
