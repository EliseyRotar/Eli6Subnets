import { describe, it, expect } from 'vitest'
import { findOverlaps, overlaps } from '../src/calc/overlap'

describe('findOverlaps — disjoint networks', () => {
  const r = findOverlaps(['192.168.0.0/24', '192.168.1.0/24'])
  it('no pairs', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    expect(r.pairs).toHaveLength(0)
    expect(r.networks).toHaveLength(2)
  })
})

describe('findOverlaps — containing network', () => {
  const r = findOverlaps(['10.0.0.0/8', '10.1.0.0/16'])
  it('one pair: a contains b', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    expect(r.pairs).toHaveLength(1)
    const pair = r.pairs[0]
    expect(pair?.relation).toBe('a-contains-b')
    expect(pair?.first).toBe('10.1.0.0')
    expect(pair?.last).toBe('10.1.255.255')
    expect(pair?.size).toBe(65536)
    expect(pair?.cidr).toBe('10.1.0.0/16')
  })
})

describe('findOverlaps — identical networks', () => {
  const r = findOverlaps(['172.16.0.0/16', '172.16.0.0/16'])
  it('equal relation', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    expect(r.pairs).toHaveLength(1)
    expect(r.pairs[0]?.relation).toBe('equal')
    expect(r.pairs[0]?.size).toBe(65536)
  })
})

describe('findOverlaps — a contains b', () => {
  const r = findOverlaps(['10.0.0.0/16', '10.0.0.0/24'])
  it('a-contains-b', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    expect(r.pairs[0]?.relation).toBe('a-contains-b')
    expect(r.pairs[0]?.cidr).toBe('10.0.0.0/24')
  })
})

describe('findOverlaps — three inputs, mixed', () => {
  // /23 contains both /24 blocks; the two /24 blocks are disjoint.
  const r = findOverlaps(['192.168.0.0/23', '192.168.0.0/24', '192.168.1.0/24'])
  it('two overlapping pairs', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    expect(r.pairs).toHaveLength(2)
    expect(r.pairs.every(p => p.relation === 'a-contains-b')).toBe(true)
  })
  it('every pair carries a CIDR or null span', () => {
    if (!('pairs' in r)) throw new Error('expected result')
    for (const p of r.pairs) expect(p.cidr === null || /\/\d+$/.test(p.cidr)).toBe(true)
  })
})

describe('findOverlaps — errors', () => {
  it('single input → error.overlap_min_entries', () => {
    const r = findOverlaps(['10.0.0.0/24'])
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.overlap_min_entries')
  })
  it('empty input → error.overlap_min_entries', () => {
    const r = findOverlaps([])
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('invalid CIDR → validation failure', () => {
    const r = findOverlaps(['10.0.0.0/24', 'nope'])
    expect('ok' in r && !r.ok).toBe(true)
  })
})

describe('overlaps() fast path', () => {
  it('true when nested', ()     => expect(overlaps('10.0.0.0/8', '10.1.0.0/16')).toBe(true))
  it('true when equal', ()      => expect(overlaps('192.168.0.0/24', '192.168.0.0/24')).toBe(true))
  it('false when disjoint', ()  => expect(overlaps('10.0.0.0/24', '10.1.0.0/24')).toBe(false))
  it('false when adjacent', ()  => expect(overlaps('192.168.0.0/24', '192.168.1.0/24')).toBe(false))
  it('/0 overlaps everything', () => expect(overlaps('0.0.0.0/0', '8.8.8.8/32')).toBe(true))
  it('invalid first arg → failure', () => {
    const r = overlaps('bad', '10.0.0.0/8')
    expect(typeof r === 'object' && !r.ok).toBe(true)
    if (typeof r === 'object' && !r.ok) expect(r.errorKey).toBe('error.prefix_range')
  })
  it('invalid second arg → failure', () => {
    const r = overlaps('10.0.0.0/8', 'bad')
    expect(typeof r === 'object' && !r.ok).toBe(true)
    if (typeof r === 'object' && !r.ok) expect(r.errorKey).toBe('error.prefix_range')
  })
})
