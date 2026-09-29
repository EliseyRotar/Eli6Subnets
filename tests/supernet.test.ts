import { describe, it, expect } from 'vitest'
import { summarise } from '../src/calc/supernet'

describe('summarise — pure: two contiguous /24', () => {
  const r = summarise(['192.168.0.0/24', '192.168.1.0/24'])
  it('returns SupernetResult', () => expect('supernet' in r).toBe(true))
  if (!('supernet' in r)) return

  it('supernet is 192.168.0.0/23', () => expect(r.supernet).toBe('192.168.0.0/23'))
  it('isPure true', ()              => expect(r.isPure).toBe(true))
  it('no extra addresses', ()       => expect(r.extraAddresses.length).toBe(0))
  it('inputNetworks has 2 entries', () => expect(r.inputNetworks.length).toBe(2))
})

describe('summarise — impure: non-contiguous /24', () => {
  // 192.168.0.0/24 + 192.168.2.0/24 → covers /22 (192.168.0.0–192.168.3.255)
  // but 192.168.1.0/24 and 192.168.3.0/24 are NOT in input
  const r = summarise(['192.168.0.0/24', '192.168.2.0/24'])
  it('returns SupernetResult', () => expect('supernet' in r).toBe(true))
  if (!('supernet' in r)) return

  it('isPure false', ()          => expect(r.isPure).toBe(false))
  it('has extra addresses', ()   => expect(r.extraAddresses.length).toBeGreaterThan(0))
  it('extraAddresses are CIDRs', () => {
    for (const e of r.extraAddresses) {
      expect(e).toMatch(/^\d+\.\d+\.\d+\.\d+\/\d+$/)
    }
  })
})

describe('summarise — fewer than 2 inputs', () => {
  it('single entry → error', () => {
    const r = summarise(['10.0.0.0/24'])
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.supernet_min_entries')
  })
  it('empty list → error', () => {
    const r = summarise([])
    expect('ok' in r && !r.ok).toBe(true)
  })
})

describe('summarise — identical inputs', () => {
  const r = summarise(['10.0.0.0/24', '10.0.0.0/24'])
  it('returns SupernetResult', () => expect('supernet' in r).toBe(true))
  if (!('supernet' in r)) return
  it('supernet equals input', () => expect(r.supernet).toBe('10.0.0.0/24'))
})

describe('summarise — invalid CIDR', () => {
  it('returns validation error', () => {
    const r = summarise(['10.0.0.0/24', 'not-a-cidr'])
    expect('ok' in r && !r.ok).toBe(true)
  })
})
