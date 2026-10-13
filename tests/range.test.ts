import { describe, it, expect } from 'vitest'
import { rangeToCidrs } from '../src/calc/range'

interface RangeLike {
  entries: { first: string; last: string; size: number; cidr: string }[]
  start: string
  end: string
  totalAddresses: number
}

/** The entries must start at `start`, end at `end` and add up exactly. */
function spans(result: RangeLike): boolean {
  if (result.entries.length === 0) return false
  if (result.entries[0]?.first !== result.start) return false
  if (result.entries[result.entries.length - 1]?.last !== result.end) return false
  const sum = result.entries.reduce((acc, e) => acc + e.size, 0)
  return sum === result.totalAddresses
}

describe('rangeToCidrs — exact /24 range', () => {
  const r = rangeToCidrs('192.168.1.0', '192.168.1.255')
  it('returns RangeResult', () => expect('entries' in r).toBe(true))
  if (!('entries' in r)) return
  it('single CIDR', ()    => expect(r.entries).toHaveLength(1))
  it('is a /24', ()       => expect(r.entries[0]?.cidr).toBe('192.168.1.0/24'))
  it('256 addresses', ()  => expect(r.totalAddresses).toBe(256))
})

describe('rangeToCidrs — unaligned range', () => {
  const r = rangeToCidrs('192.168.1.100', '192.168.1.200')
  it('returns RangeResult', () => expect('entries' in r).toBe(true))
  if (!('entries' in r)) return
  it('spans exactly the range', () => expect(spans(r)).toBe(true))
  it('total = 101', ()            => expect(r.totalAddresses).toBe(101))
  it('starts with .100/30', ()    => expect(r.entries[0]?.cidr).toBe('192.168.1.100/30'))
  it('ends with .200/32', ()      => expect(r.entries[r.entries.length - 1]?.cidr).toBe('192.168.1.200/32'))
  it('all blocks aligned', () => {
    for (const e of r.entries) {
      const [ip, prefix] = e.cidr.split('/')
      const p = Number(prefix)
      const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0
      const octets = (ip ?? '').split('.').map(Number)
      const n = (
        (((octets[0] as number) << 24) |
          ((octets[1] as number) << 16) |
          ((octets[2] as number) << 8) |
          (octets[3] as number)) >>> 0
      )
      expect((n & mask) >>> 0).toBe(n)
      expect(e.size).toBe(Math.pow(2, 32 - p))
    }
  })
})

describe('rangeToCidrs — single address', () => {
  const r = rangeToCidrs('10.0.0.7', '10.0.0.7')
  it('one /32', () => {
    if (!('entries' in r)) throw new Error('expected result')
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0]?.cidr).toBe('10.0.0.7/32')
    expect(r.totalAddresses).toBe(1)
  })
})

describe('rangeToCidrs — whole IPv4 space', () => {
  const r = rangeToCidrs('0.0.0.0', '255.255.255.255')
  it('collapses to /0', () => {
    if (!('entries' in r)) throw new Error('expected result')
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0]?.cidr).toBe('0.0.0.0/0')
    expect(r.totalAddresses).toBe(4294967296)
  })
})

describe('rangeToCidrs — high addresses (unsigned handling)', () => {
  const r = rangeToCidrs('255.255.255.254', '255.255.255.255')
  it('two addresses form one /31', () => {
    if (!('entries' in r)) throw new Error('expected result')
    expect(r.entries).toHaveLength(1)
    expect(r.entries[0]?.cidr).toBe('255.255.255.254/31')
  })
})

describe('rangeToCidrs — errors', () => {
  it('start > end → error.range_order', () => {
    const r = rangeToCidrs('10.0.0.10', '10.0.0.1')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.range_order')
  })
  it('empty input → error.empty', () => {
    const r = rangeToCidrs('', '10.0.0.1')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.empty')
  })
  it('invalid start → validation failure', () => {
    const r = rangeToCidrs('10.0.0.999', '10.0.0.1')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('invalid end → validation failure', () => {
    const r = rangeToCidrs('10.0.0.1', 'foo')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('trimmed input accepted', () => {
    const r = rangeToCidrs('  10.0.0.1 ', '10.0.0.1')
    expect('entries' in r).toBe(true)
  })
})
