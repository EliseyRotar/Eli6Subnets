import { describe, it, expect } from 'vitest'
import { splitEqual } from '../src/calc/split'

describe('splitEqual — 10.0.0.0/24 into 4', () => {
  const r = splitEqual('10.0.0.0/24', 4)
  it('returns SplitResult', () => expect('subnets' in r).toBe(true))
  if (!('subnets' in r)) return

  it('produces 4 subnets', ()       => expect(r.subnets.length).toBe(4))
  it('subnetPrefix is 26', ()       => expect(r.subnetPrefix).toBe(26))
  it('first subnet 10.0.0.0/26',  () => expect(r.subnets[0]!.networkAddress).toBe('10.0.0.0'))
  it('second subnet 10.0.0.64/26', () => expect(r.subnets[1]!.networkAddress).toBe('10.0.0.64'))
  it('third subnet 10.0.0.128/26', () => expect(r.subnets[2]!.networkAddress).toBe('10.0.0.128'))
  it('fourth subnet 10.0.0.192/26',() => expect(r.subnets[3]!.networkAddress).toBe('10.0.0.192'))
})

describe('splitEqual — 10.0.0.0/24 into 3 (rounds up to 4)', () => {
  const r = splitEqual('10.0.0.0/24', 3)
  it('returns SplitResult', () => expect('subnets' in r).toBe(true))
  if (!('subnets' in r)) return
  it('actualCount is 4', ()  => expect(r.actualCount).toBe(4))
  it('subnetPrefix is 26', () => expect(r.subnetPrefix).toBe(26))
})

describe('splitEqual — count = 1 returns original network', () => {
  const r = splitEqual('172.16.0.0/16', 1)
  it('returns SplitResult', () => expect('subnets' in r).toBe(true))
  if (!('subnets' in r)) return
  it('one subnet', ()              => expect(r.subnets.length).toBe(1))
  it('same prefix', ()             => expect(r.subnetPrefix).toBe(16))
  it('same network address', ()    => expect(r.subnets[0]!.networkAddress).toBe('172.16.0.0'))
})

describe('splitEqual — overflow (too many splits)', () => {
  // /30 has 4 addresses; splitting into 8 would require /33
  const r = splitEqual('10.0.0.0/30', 8)
  it('returns error', () => {
    expect('ok' in r && !r.ok).toBe(true)
    if ('ok' in r && !r.ok) expect(r.errorKey).toBe('error.split_count_invalid')
  })
})

describe('splitEqual — invalid count', () => {
  it('count = 0 → error', () => {
    const r = splitEqual('10.0.0.0/24', 0)
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('count = -1 → error', () => {
    const r = splitEqual('10.0.0.0/24', -1)
    expect('ok' in r && !r.ok).toBe(true)
  })
  it('count = 1.5 → error', () => {
    const r = splitEqual('10.0.0.0/24', 1.5)
    expect('ok' in r && !r.ok).toBe(true)
  })
})

describe('splitEqual — invalid base CIDR', () => {
  it('returns validation error', () => {
    const r = splitEqual('bad/cidr', 4)
    expect('ok' in r && !r.ok).toBe(true)
  })
})
