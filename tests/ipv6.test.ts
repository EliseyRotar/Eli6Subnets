import { describe, it, expect } from 'vitest'
import { calcIpv6 } from '../src/calc/ipv6'

function info(cidr: string) {
  const r = calcIpv6(cidr)
  if (!('address' in r)) throw new Error(`expected Ipv6Info for ${cidr}`)
  return r
}

describe('calcIpv6 — basic prefix', () => {
  const r = info('2001:db8::1/64')
  it('normalises the address', () => expect(r.address).toBe('2001:db8::1'))
  it('network is 2001:db8::', () => expect(r.network).toBe('2001:db8::'))
  it('prefix 64', ()             => expect(r.prefix).toBe(64))
  it('total = 2^64', ()          => expect(r.totalAddresses).toBe('18446744073709551616'))
  it('not global? it is global', () => expect(r.isGlobalUnicast).toBe(true))
  it('last address of /64', ()   => expect(r.lastAddress).toBe('2001:db8::ffff:ffff:ffff:ffff'))
})

describe('calcIpv6 — full expansion and RFC 5952', () => {
  it('expands to 8 groups', () => {
    const r = info('2001:0db8:0000:0000:0000:0000:0000:0001/128')
    expect(r.expanded).toBe('2001:0db8:0000:0000:0000:0000:0000:0001')
    expect(r.address).toBe('2001:db8::1')
  })
  it('compresses the longest zero run only', () => {
    const r = info('2001:0:0:1:0:0:0:1/128')
    expect(r.address).toBe('2001:0:0:1::1')
  })
  it('keeps a single zero group uncompressed', () => {
    const r = info('2001:db8:1:1:1:1:1:1/128')
    expect(r.address).toBe('2001:db8:1:1:1:1:1:1')
  })
  it('lowercases hex', () => {
    const r = info('2001:DB8::A/32')
    expect(r.address).toBe('2001:db8::a')
  })
})

describe('calcIpv6 — special ranges', () => {
  it('loopback ::1', () => {
    const r = info('::1/128')
    expect(r.isLoopback).toBe(true)
    expect(r.isGlobalUnicast).toBe(false)
  })
  it('unspecified ::', () => {
    const r = info('::/128')
    expect(r.isUnspecified).toBe(true)
    expect(r.isGlobalUnicast).toBe(false)
  })
  it('link-local fe80::/10', () => {
    const r = info('fe80::1/10')
    expect(r.isLinkLocal).toBe(true)
    expect(r.isGlobalUnicast).toBe(false)
  })
  it('ULA fc00::/7', () => {
    const r = info('fd00::1/48')
    expect(r.isUniqueLocal).toBe(true)
    expect(r.isGlobalUnicast).toBe(false)
  })
  it('multicast ff02::1/128', () => {
    const r = info('ff02::1/128')
    expect(r.isMulticast).toBe(true)
    expect(r.isGlobalUnicast).toBe(false)
  })
  it('accepts a zone id', () => {
    const r = info('fe80::1%eth0/64')
    expect(r.address).toBe('fe80::1')
    expect(r.isLinkLocal).toBe(true)
  })
})

describe('calcIpv6 — /0', () => {
  it('total = 2^128 and network ::', () => {
    const r = info('::/0')
    expect(r.totalAddresses).toBe('340282366920938463463374607431768211456')
    expect(r.network).toBe('::')
    expect(r.prefix).toBe(0)
  })
})

describe('calcIpv6 — errors', () => {
  it('empty → error.empty', () => {
    const r = calcIpv6('  ')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.empty')
  })
  it('missing prefix → error.ipv6_prefix_range', () => {
    const r = calcIpv6('2001:db8::1')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.ipv6_prefix_range')
  })
  it('prefix 129 → error.ipv6_prefix_range', () => {
    const r = calcIpv6('2001:db8::1/129')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('non-integer prefix → error.ipv6_prefix_range', () => {
    const r = calcIpv6('2001:db8::1/abc')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('bad group → error.ipv6_invalid', () => {
    const r = calcIpv6('zz::1/64')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.ipv6_invalid')
  })
  it('too few groups → error.ipv6_invalid', () => {
    const r = calcIpv6('1:2/64')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('dotted tail → error.ipv6_invalid', () => {
    const r = calcIpv6('::ffff:1.2.3.4/96')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('double :: → error.ipv6_invalid', () => {
    const r = calcIpv6('1::2::3/64')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('too many groups with :: → error.ipv6_invalid', () => {
    const r = calcIpv6('1:2:3:4:5:6:7:8::/64')
    expect('ok' in r && !r.ok).toBe(true)
  })
})
