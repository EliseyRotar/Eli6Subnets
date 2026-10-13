/**
 * IP range → minimal CIDR set (FR-06).
 *
 * Greedy algorithm: from the current start address take the largest
 * power-of-two block that is naturally aligned and that does not run
 * past the end. Every integer range decomposes into at most 64 such
 * blocks (two per bit), so the output stays small and exact — no
 * address inside or outside the range is ever covered by mistake.
 */

import {
  validateIpCidr,
  uint32ToIp,
  isValidationFailure,
  type ValidationFailure,
} from './ip'

export interface RangeCidr {
  cidr: string   // e.g. "192.168.1.0/24"
  first: string  // first address covered
  last: string   // last address covered
  size: number   // addresses in the block
}

export interface RangeResult {
  start:         string
  end:           string
  entries:       RangeCidr[]
  totalAddresses: number // addresses covered (≥ end - start + 1 is exact)
}

/** Count the zero bits after the least significant 1 (0 → 32). */
function trailingZeros(v: number): number {
  if (v === 0) return 32
  let count = 0
  while ((v & 1) === 0) {
    v >>>= 1
    count++
  }
  return count
}

/** Parse a bare IPv4 address through the shared validator (implicit /32). */
function parseAddress(value: string): number | ValidationFailure {
  const v = validateIpCidr(`${value.trim()}/32`)
  if (isValidationFailure(v)) return v
  return v.ip
}

export function rangeToCidrs(start: string, end: string): RangeResult | ValidationFailure {
  if (start.trim() === '' || end.trim() === '') {
    return { ok: false, errorKey: 'error.empty' }
  }

  const startAddr = parseAddress(start)
  if (isValidationFailure(startAddr)) return startAddr
  const endAddr = parseAddress(end)
  if (isValidationFailure(endAddr)) return endAddr

  if (startAddr > endAddr) {
    return { ok: false, errorKey: 'error.range_order' }
  }

  const entries: RangeCidr[] = []
  let cursor = startAddr

  while (cursor <= endAddr) {
    const alignBits = trailingZeros(cursor)
    let size = Math.pow(2, alignBits)
    const remaining = endAddr - cursor + 1
    while (size > remaining) size /= 2

    const prefix = 32 - Math.log2(size)
    const last = cursor + size - 1
    entries.push({
      cidr: `${uint32ToIp(cursor)}/${prefix}`,
      first: uint32ToIp(cursor),
      last: uint32ToIp(last),
      size,
    })
    cursor += size
  }

  return {
    start: uint32ToIp(startAddr),
    end: uint32ToIp(endAddr),
    entries,
    totalAddresses: entries.reduce((sum, e) => sum + e.size, 0),
  }
}
