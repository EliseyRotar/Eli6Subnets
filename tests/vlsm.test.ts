import { describe, it, expect } from 'vitest'
import { allocateVlsm } from '../src/calc/vlsm'

describe('allocateVlsm — clean allocation 192.168.1.0/24', () => {
  const result = allocateVlsm('192.168.1.0/24', [
    { name: 'Engineering', requiredHosts: 50 },
    { name: 'Marketing',   requiredHosts: 25 },
    { name: 'IT',          requiredHosts: 10 },
    { name: 'Management',  requiredHosts: 5  },
  ])

  it('returns VlsmResult', () => {
    expect('allocations' in result).toBe(true)
  })
  if (!('allocations' in result)) return

  it('allocates all 4 subnets', () => {
    expect(result.allocations.length).toBe(4)
    expect(result.unallocated.length).toBe(0)
  })

  it('no overflow warning', () => {
    expect(result.minBasePrefixNeeded).toBeNull()
  })

  it('largest request first (50 hosts → /26)', () => {
    const first = result.allocations[0]!
    expect(first.request.name).toBe('Engineering')
    expect(first.subnet.prefix).toBe(26)   // 64 addresses
    expect(first.subnet.usableHosts).toBeGreaterThanOrEqual(50)
  })

  it('second largest (25 hosts → /27)', () => {
    const second = result.allocations[1]!
    expect(second.request.name).toBe('Marketing')
    expect(second.subnet.prefix).toBe(27)  // 32 addresses
  })

  it('allocations are non-overlapping', () => {
    const cidrs = result.allocations.map(a => a.cidr)
    // All network addresses must be distinct
    const nets = result.allocations.map(a => a.subnet.networkAddress)
    expect(new Set(nets).size).toBe(nets.length)
  })

  it('all subnets are within 192.168.1.0/24', () => {
    for (const alloc of result.allocations) {
      expect(alloc.subnet.networkAddress.startsWith('192.168.1.')).toBe(true)
    }
  })
})

describe('allocateVlsm — overflow', () => {
  // /28 = 16 addresses; request needs more than that
  const result = allocateVlsm('192.168.1.0/28', [
    { name: 'Big', requiredHosts: 100 },
  ])

  it('returns VlsmResult', () => expect('allocations' in result).toBe(true))
  if (!('allocations' in result)) return

  it('unallocated has one entry', () => {
    expect(result.unallocated.length).toBe(1)
    expect(result.unallocated[0]!.name).toBe('Big')
  })

  it('minBasePrefixNeeded is set', () => {
    expect(result.minBasePrefixNeeded).not.toBeNull()
    // 100 hosts → need 128 addresses (/25); minBasePrefixNeeded ≤ 25
    expect(result.minBasePrefixNeeded!).toBeLessThanOrEqual(25)
  })
})

describe('allocateVlsm — single request', () => {
  const result = allocateVlsm('10.0.0.0/24', [
    { name: 'Only', requiredHosts: 30 },
  ])
  it('allocates one subnet', () => {
    expect('allocations' in result).toBe(true)
    if (!('allocations' in result)) return
    expect(result.allocations.length).toBe(1)
    expect(result.unallocated.length).toBe(0)
  })
})

describe('allocateVlsm — empty request list', () => {
  const result = allocateVlsm('10.0.0.0/24', [])
  it('returns vlsm_empty error', () => {
    expect('ok' in result && !result.ok).toBe(true)
    if ('ok' in result && !result.ok) {
      expect(result.errorKey).toBe('error.vlsm_empty')
    }
  })
})

describe('allocateVlsm — duplicate names', () => {
  const result = allocateVlsm('10.0.0.0/24', [
    { name: 'A', requiredHosts: 10 },
    { name: 'A', requiredHosts: 20 },
  ])
  it('returns duplicate_name error', () => {
    expect('ok' in result && !result.ok).toBe(true)
    if ('ok' in result && !result.ok) {
      expect(result.errorKey).toBe('error.vlsm_duplicate_name')
    }
  })
})

describe('allocateVlsm — invalid base CIDR', () => {
  const result = allocateVlsm('not-an-ip', [{ name: 'X', requiredHosts: 5 }])
  it('returns validation error', () => {
    expect('ok' in result && !result.ok).toBe(true)
  })
})

describe('allocateVlsm — non-positive host count', () => {
  it('rejects zero hosts', () => {
    const result = allocateVlsm('10.0.0.0/24', [{ name: 'Zero', requiredHosts: 0 }])
    expect('ok' in result && !result.ok).toBe(true)
    if ('ok' in result && !result.ok) {
      expect(result.errorKey).toBe('error.host_count_invalid')
    }
  })

  it('rejects a negative host count', () => {
    const result = allocateVlsm('10.0.0.0/24', [{ name: 'Neg', requiredHosts: -5 }])
    expect('ok' in result && !result.ok).toBe(true)
    if ('ok' in result && !result.ok) {
      expect(result.errorKey).toBe('error.host_count_invalid')
    }
  })
})
