import { describe, it, expect } from 'vitest'
import { calcSubnet } from '../src/calc/subnet'

describe('calcSubnet — 192.168.1.0/24', () => {
  const r = calcSubnet('192.168.1.0/24')
  it('returns SubnetInfo', () => { expect('networkAddress' in r).toBe(true) })
  if (!('networkAddress' in r)) return

  it('networkAddress', ()    => expect(r.networkAddress).toBe('192.168.1.0'))
  it('broadcastAddress', ()  => expect(r.broadcastAddress).toBe('192.168.1.255'))
  it('subnetMask', ()        => expect(r.subnetMask).toBe('255.255.255.0'))
  it('wildcardMask', ()      => expect(r.wildcardMask).toBe('0.0.0.255'))
  it('firstHost', ()         => expect(r.firstHost).toBe('192.168.1.1'))
  it('lastHost', ()          => expect(r.lastHost).toBe('192.168.1.254'))
  it('totalAddresses', ()    => expect(r.totalAddresses).toBe(256))
  it('usableHosts', ()       => expect(r.usableHosts).toBe(254))
  it('prefix', ()            => expect(r.prefix).toBe(24))
  it('class C', ()           => expect(r.historicalClass).toBe('C'))
  it('isPrivate', ()         => expect(r.isPrivate).toBe(true))
  it('not loopback', ()      => expect(r.isLoopback).toBe(false))
  it('not link-local', ()    => expect(r.isLinkLocal).toBe(false))
  it('not multicast', ()     => expect(r.isMulticast).toBe(false))
  it('not /31', ()           => expect(r.isPointToPoint).toBe(false))
  it('not /32', ()           => expect(r.isHostRoute).toBe(false))
})

describe('calcSubnet — RFC 1918 ranges', () => {
  it('10.0.0.0/8 is private class A', () => {
    const r = calcSubnet('10.0.0.0/8')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isPrivate).toBe(true)
    expect(r.historicalClass).toBe('A')
  })
  it('172.16.0.0/12 is private class B', () => {
    const r = calcSubnet('172.16.0.0/12')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isPrivate).toBe(true)
    expect(r.historicalClass).toBe('B')
  })
  it('172.32.0.0/12 is NOT private', () => {
    const r = calcSubnet('172.32.0.0/12')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isPrivate).toBe(false)
  })
})

describe('calcSubnet — loopback', () => {
  it('127.0.0.0/8 isLoopback', () => {
    const r = calcSubnet('127.0.0.0/8')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isLoopback).toBe(true)
    expect(r.isPrivate).toBe(false)
  })
})

describe('calcSubnet — link-local', () => {
  it('169.254.0.0/16 isLinkLocal', () => {
    const r = calcSubnet('169.254.0.0/16')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isLinkLocal).toBe(true)
  })
})

describe('calcSubnet — multicast', () => {
  it('224.0.0.0/4 isMulticast class D', () => {
    const r = calcSubnet('224.0.0.0/4')
    if (!('networkAddress' in r)) throw new Error('expected SubnetInfo')
    expect(r.isMulticast).toBe(true)
    expect(r.historicalClass).toBe('D')
  })
})

describe('calcSubnet — /31 (RFC 3021)', () => {
  const r = calcSubnet('10.0.0.0/31')
  it('returns SubnetInfo', () => { expect('networkAddress' in r).toBe(true) })
  if (!('networkAddress' in r)) return
  it('totalAddresses 2', ()  => expect(r.totalAddresses).toBe(2))
  it('usableHosts 2', ()     => expect(r.usableHosts).toBe(2))
  it('firstHost = network',  () => expect(r.firstHost).toBe('10.0.0.0'))
  it('lastHost = broadcast', () => expect(r.lastHost).toBe('10.0.0.1'))
  it('isPointToPoint true',  () => expect(r.isPointToPoint).toBe(true))
  it('isHostRoute false',    () => expect(r.isHostRoute).toBe(false))
})

describe('calcSubnet — /32', () => {
  const r = calcSubnet('192.168.1.1/32')
  it('returns SubnetInfo', () => { expect('networkAddress' in r).toBe(true) })
  if (!('networkAddress' in r)) return
  it('totalAddresses 1',   () => expect(r.totalAddresses).toBe(1))
  it('usableHosts 1',      () => expect(r.usableHosts).toBe(1))
  it('firstHost = lastHost', () => expect(r.firstHost).toBe(r.lastHost))
  it('isHostRoute true',   () => expect(r.isHostRoute).toBe(true))
})

describe('calcSubnet — 0.0.0.0/0 (default route)', () => {
  const r = calcSubnet('0.0.0.0/0')
  it('returns SubnetInfo', () => { expect('networkAddress' in r).toBe(true) })
  if (!('networkAddress' in r)) return
  it('totalAddresses 4294967296', () => expect(r.totalAddresses).toBe(4294967296))
  it('broadcastAddress 255.255.255.255', () => expect(r.broadcastAddress).toBe('255.255.255.255'))
})

describe('calcSubnet — validation passthrough', () => {
  it('returns error for host bits set', () => {
    const r = calcSubnet('192.168.1.5/24')
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('returns error for empty string', () => {
    const r = calcSubnet('')
    expect('ok' in r && !r.ok).toBe(true)
  })
})
