/**
 * Overlap checker (FR-06).
 *
 * Compares every pair of the input CIDRs and reports the ones that share
 * at least one address: which of the two contains the other (or whether
 * they are equal), and the overlapping span. When that span happens to be
 * a single naturally-aligned block it is also expressed as a CIDR.
 *
 * Two naturally-aligned power-of-two blocks are either disjoint or one
 * fully contains the other, so no partial intersection can occur.
 */

import {
  validateIpCidr,
  prefixToMask,
  ipToUint32,
  uint32ToIp,
  isValidationFailure,
  type ValidationFailure,
} from './ip'
import { calcSubnet, type SubnetInfo } from './subnet'

export type OverlapRelation = 'a-contains-b' | 'b-contains-a' | 'equal'

export interface OverlapPair {
  a: string
  b: string
  relation: OverlapRelation
  first: string          // first address shared by a and b
  last: string           // last address shared by a and b
  size: number           // addresses shared
  cidr: string | null    // CIDR when the shared span is one aligned block
}

export interface OverlapResult {
  pairs: OverlapPair[]   // only the overlapping pairs, input order
  networks: SubnetInfo[] // parsed inputs, same order as the given CIDRs
}

/** A span [first,last] is one CIDR iff the size is a power of two and aligned. */
function spanToCidr(first: number, size: number): string | null {
  if (size <= 0 || (size & (size - 1)) !== 0) return null
  if (first === 0) return `0.0.0.0/${32 - Math.log2(size)}`
  if ((first & (size - 1)) !== 0) return null
  return `${uint32ToIp(first)}/${32 - Math.log2(size)}`
}

export function findOverlaps(cidrs: string[]): OverlapResult | ValidationFailure {
  if (cidrs.length < 2) {
    return { ok: false, errorKey: 'error.overlap_min_entries' }
  }

  const networks: SubnetInfo[] = []
  for (const cidr of cidrs) {
    const v = validateIpCidr(cidr)
    if (isValidationFailure(v)) return v
    const info = calcSubnet(cidr)
    if (isValidationFailure(info)) return info
    networks.push(info)
  }

  const inputs = cidrs.map(c => c.trim())
  const starts = networks.map(n => ipToUint32(n.networkAddress))
  const ends   = networks.map(n => ipToUint32(n.broadcastAddress))
  const pairs: OverlapPair[] = []

  for (let i = 0; i < networks.length; i++) {
    for (let j = i + 1; j < networks.length; j++) {
      const first = Math.max(starts[i] as number, starts[j] as number)
      const last  = Math.min(ends[i] as number, ends[j] as number)
      if (first > last) continue

      const size = last - first + 1
      // The intersection equals one endpoint's span: that side is the
      // contained network, so the *other* side is the container.
      let relation: OverlapRelation
      if (first === starts[j] && last === ends[j]) {
        relation = first === starts[i] && last === ends[i] ? 'equal' : 'a-contains-b'
      } else {
        relation = 'b-contains-a'
      }

      pairs.push({
        a: inputs[i] as string,
        b: inputs[j] as string,
        relation,
        first: uint32ToIp(first),
        last: uint32ToIp(last),
        size,
        cidr: spanToCidr(first, size),
      })
    }
  }

  return { pairs, networks }
}

/** True when two CIDRs share at least one address (fast path for tests/UI). */
export function overlaps(a: string, b: string): boolean | ValidationFailure {
  const va = validateIpCidr(a)
  if (isValidationFailure(va)) return va
  const vb = validateIpCidr(b)
  if (isValidationFailure(vb)) return vb

  const netA  = (va.ip & prefixToMask(va.prefix)) >>> 0
  const netB  = (vb.ip & prefixToMask(vb.prefix)) >>> 0
  const sizeA = Math.pow(2, 32 - va.prefix)
  const sizeB = Math.pow(2, 32 - vb.prefix)

  return netA <= netB ? netB < netA + sizeA : netA < netB + sizeB
}
