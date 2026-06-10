import { describe, it, expect } from 'vitest'
import { createReferenceRoutes } from './reference.js'
import type { EngineContext } from '../../core/types.js'
import type { ReferenceDataService } from '../../domain/market-data/reference/types.js'

const ROW = {
  symbol: 'NVDA', name: 'NVIDIA', price: 1000, change: 50, percent_change: 5.2, volume: 1e8,
  avg_volume: 5e7, relative_volume: 2, turnover: 0.04, dollar_volume: 1e11,
}

function mkCtx(overrides?: Partial<ReferenceDataService>): EngineContext {
  const reference: ReferenceDataService = {
    movers: async () => ({
      gainers: [ROW], losers: [], active: [ROW],
      meta: { provider: 'yfinance', asOf: '2026-06-10T00:00:00.000Z' },
    }),
    ...overrides,
  }
  return { reference } as unknown as EngineContext
}

describe('reference routes', () => {
  it('GET /movers returns the board with explicit provider meta', async () => {
    const res = await createReferenceRoutes(mkCtx()).request('/movers')
    const body = await res.json()
    expect(body.gainers[0].symbol).toBe('NVDA')
    expect(body.meta.provider).toBe('yfinance')
  })

  it('GET /movers surfaces a failure as { error } with 502, not a crash', async () => {
    const ctx = mkCtx({ movers: async () => { throw new Error('upstream down') } })
    const res = await createReferenceRoutes(ctx).request('/movers')
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/upstream/)
  })
})
