import { describe, it, expect } from 'vitest'
import { calcCloud } from '../src/calc/cloud'

describe('calcCloud — AWS /24', () => {
  const r = calcCloud('10.0.1.0/24', 'aws')
  it('returns CloudResult', () => expect('rows' in r).toBe(true))
  if (!('rows' in r)) return
  it('five reserved rows (4 leading + last)', () => expect(r.rows).toHaveLength(5))
  it('last row is .255', ()   => expect(r.rows[4]?.address).toBe('10.0.1.255'))
  it('first row is router', () => expect(r.rows[0]?.roleKey).toBe('cloud.role.router'))
  it('reserved = 5', ()       => expect(r.reservedCount).toBe(5))
  it('usable = 251', ()       => expect(r.usableHosts).toBe(251))
  it('first usable = .4', ()  => expect(r.firstUsable).toBe('10.0.1.4'))
  it('last usable = .254', () => expect(r.lastUsable).toBe('10.0.1.254'))
  it('prefix ok for /24', ()  => expect(r.prefixOk).toBe(true))
  it('maxPrefix = 28', ()     => expect(r.maxPrefix).toBe(28))
})

describe('calcCloud — AWS /29', () => {
  const r = calcCloud('10.0.2.0/29', 'aws')
  it('8 addresses, 5 reserved', () => {
    if (!('rows' in r)) throw new Error('expected result')
    expect(r.totalAddresses).toBe(8)
    expect(r.reservedCount).toBe(5)
    expect(r.usableHosts).toBe(3)
    expect(r.firstUsable).toBe('10.0.2.4')
    expect(r.lastUsable).toBe('10.0.2.6')
  })
})

describe('calcCloud — AWS too small (/30)', () => {
  const r = calcCloud('10.0.3.0/30', 'aws')
  it('computes but flags the prefix', () => {
    if (!('rows' in r)) throw new Error('expected result')
    expect(r.prefixOk).toBe(false)
    expect(r.totalAddresses).toBe(4)
    expect(r.reservedCount).toBe(4)
    expect(r.usableHosts).toBe(0)
    expect(r.firstUsable).toBeNull()
    expect(r.lastUsable).toBeNull()
  })
})

describe('calcCloud — AWS /32 host route', () => {
  const r = calcCloud('10.0.4.1/32', 'aws')
  it('single address, all reserved', () => {
    if (!('rows' in r)) throw new Error('expected result')
    expect(r.totalAddresses).toBe(1)
    expect(r.reservedCount).toBe(1)
    expect(r.rows).toHaveLength(1)
    expect(r.prefixOk).toBe(false)
  })
})

describe('calcCloud — Azure /24', () => {
  const r = calcCloud('10.0.5.0/24', 'azure')
  it('five leading reserved, last usable', () => {
    if (!('rows' in r)) throw new Error('expected result')
    expect(r.rows).toHaveLength(5)
    expect(r.rows[1]?.roleKey).toBe('cloud.role.gateway')
    expect(r.rows[2]?.roleKey).toBe('cloud.role.dns')
    expect(r.reservedCount).toBe(5)
    expect(r.usableHosts).toBe(251)
    expect(r.firstUsable).toBe('10.0.5.5')
    expect(r.lastUsable).toBe('10.0.5.255')
    expect(r.maxPrefix).toBe(29)
    expect(r.prefixOk).toBe(true)
  })
})

describe('calcCloud — Azure too small (/30)', () => {
  const r = calcCloud('10.0.6.0/30', 'azure')
  it('4 addresses, first 4 reserved, none usable', () => {
    if (!('rows' in r)) throw new Error('expected result')
    expect(r.totalAddresses).toBe(4)
    expect(r.reservedCount).toBe(4)
    expect(r.usableHosts).toBe(0)
    expect(r.prefixOk).toBe(false)
    expect(r.firstUsable).toBeNull()
  })
})

describe('calcCloud — host bits set', () => {
  it('returns validation failure with suggestion', () => {
    const r = calcCloud('10.0.1.5/24', 'aws')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.host_bits_set')
  })
})

describe('calcCloud — invalid input', () => {
  it('empty → error.empty', () => {
    const r = calcCloud('', 'aws')
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.empty')
  })
})
