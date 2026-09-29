import { describe, it, expect } from 'vitest'
import {
  ipToUint32,
  uint32ToIp,
  prefixToMask,
  maskToPrefix,
  validateIpCidr,
  nextPowerOfTwo,
  log2,
} from '../src/calc/ip'

// ── ipToUint32 ───────────────────────────────────────────────────

describe('ipToUint32', () => {
  it('converts 0.0.0.0 to 0', () => {
    expect(ipToUint32('0.0.0.0')).toBe(0)
  })

  it('converts 255.255.255.255 to 0xFFFFFFFF', () => {
    expect(ipToUint32('255.255.255.255')).toBe(0xffffffff)
  })

  it('converts 192.168.1.1 correctly', () => {
    // 192=0xC0, 168=0xA8, 1=0x01, 1=0x01 → 0xC0A80101
    expect(ipToUint32('192.168.1.1')).toBe(0xc0a80101)
  })

  it('converts 10.0.0.1 correctly', () => {
    expect(ipToUint32('10.0.0.1')).toBe(0x0a000001)
  })

  it('handles 128.0.0.0 without sign issues', () => {
    // 0x80000000 = 2147483648 — would be negative as signed int32
    expect(ipToUint32('128.0.0.0')).toBe(0x80000000)
    expect(ipToUint32('128.0.0.0')).toBeGreaterThan(0)
  })

  it('throws on wrong octet count', () => {
    expect(() => ipToUint32('192.168.1')).toThrow()
  })

  it('throws on out-of-range octet', () => {
    expect(() => ipToUint32('256.0.0.0')).toThrow()
  })
})

// ── uint32ToIp ───────────────────────────────────────────────────

describe('uint32ToIp', () => {
  it('converts 0 to 0.0.0.0', () => {
    expect(uint32ToIp(0)).toBe('0.0.0.0')
  })

  it('converts 0xFFFFFFFF to 255.255.255.255', () => {
    expect(uint32ToIp(0xffffffff)).toBe('255.255.255.255')
  })

  it('round-trips correctly for several addresses', () => {
    const addresses = [
      '10.0.0.1',
      '172.16.5.99',
      '192.168.100.200',
      '255.0.0.1',
    ]
    for (const addr of addresses) {
      expect(uint32ToIp(ipToUint32(addr))).toBe(addr)
    }
  })
})

// ── prefixToMask ─────────────────────────────────────────────────

describe('prefixToMask', () => {
  it('/0 → 0', () => {
    expect(prefixToMask(0)).toBe(0)
  })

  it('/8 → 0xFF000000', () => {
    expect(prefixToMask(8)).toBe(0xff000000)
  })

  it('/16 → 0xFFFF0000', () => {
    expect(prefixToMask(16)).toBe(0xffff0000)
  })

  it('/24 → 0xFFFFFF00', () => {
    expect(prefixToMask(24)).toBe(0xffffff00)
  })

  it('/32 → 0xFFFFFFFF', () => {
    expect(prefixToMask(32)).toBe(0xffffffff)
  })

  it('/1 is non-negative (unsigned)', () => {
    expect(prefixToMask(1)).toBeGreaterThan(0)
    expect(prefixToMask(1)).toBe(0x80000000)
  })
})

// ── maskToPrefix ─────────────────────────────────────────────────

describe('maskToPrefix', () => {
  it('round-trips for all standard prefixes', () => {
    for (let p = 0; p <= 32; p++) {
      expect(maskToPrefix(prefixToMask(p))).toBe(p)
    }
  })
})

// ── validateIpCidr ───────────────────────────────────────────────

describe('validateIpCidr — valid input', () => {
  it('accepts 192.168.1.0/24', () => {
    const r = validateIpCidr('192.168.1.0/24')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.prefix).toBe(24)
      expect(uint32ToIp(r.ip)).toBe('192.168.1.0')
    }
  })

  it('accepts 0.0.0.0/0', () => {
    const r = validateIpCidr('0.0.0.0/0')
    expect(r.ok).toBe(true)
  })

  it('accepts 10.0.0.0/8', () => {
    const r = validateIpCidr('10.0.0.0/8')
    expect(r.ok).toBe(true)
  })

  it('accepts /32', () => {
    const r = validateIpCidr('192.168.1.1/32')
    expect(r.ok).toBe(true)
  })

  it('accepts /31', () => {
    const r = validateIpCidr('10.0.0.0/31')
    expect(r.ok).toBe(true)
  })
})

describe('validateIpCidr — error cases', () => {
  it('returns error.empty for empty string', () => {
    const r = validateIpCidr('')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.empty')
  })

  it('returns error.empty for whitespace-only string', () => {
    const r = validateIpCidr('   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.empty')
  })

  it('returns error.prefix_range for missing prefix', () => {
    const r = validateIpCidr('192.168.1.0')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.prefix_range')
  })

  it('returns error.prefix_range for prefix > 32', () => {
    const r = validateIpCidr('10.0.0.0/33')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.prefix_range')
  })

  it('returns error.prefix_range for negative prefix', () => {
    const r = validateIpCidr('10.0.0.0/-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.prefix_range')
  })

  it('returns error.octet_count for 3-octet IP', () => {
    const r = validateIpCidr('192.168.1/24')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.octet_count')
  })

  it('returns error.octet_count for 5-octet IP', () => {
    const r = validateIpCidr('192.168.1.0.1/24')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.octet_count')
  })

  it('returns error.octet_range for octet > 255', () => {
    const r = validateIpCidr('256.0.0.0/8')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKey).toBe('error.octet_range')
  })

  it('returns error.host_bits_set for 192.168.1.5/24', () => {
    const r = validateIpCidr('192.168.1.5/24')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errorKey).toBe('error.host_bits_set')
      // Suggestion must be the corrected network address
      expect(r.suggestion).toBe('192.168.1.0/24')
    }
  })

  it('returns error.host_bits_set for 10.1.2.3/8 with correct suggestion', () => {
    const r = validateIpCidr('10.1.2.3/8')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errorKey).toBe('error.host_bits_set')
      expect(r.suggestion).toBe('10.0.0.0/8')
    }
  })
})

// ── nextPowerOfTwo ───────────────────────────────────────────────

describe('nextPowerOfTwo', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 4],
    [4, 4],
    [5, 8],
    [62, 64],
    [128, 128],
    [129, 256],
  ])('nextPowerOfTwo(%i) = %i', (input, expected) => {
    expect(nextPowerOfTwo(input)).toBe(expected)
  })
})

// ── log2 ─────────────────────────────────────────────────────────

describe('log2', () => {
  it.each([
    [1, 0],
    [2, 1],
    [4, 2],
    [8, 3],
    [256, 8],
    [65536, 16],
  ])('log2(%i) = %i', (input, expected) => {
    expect(log2(input)).toBe(expected)
  })
})
