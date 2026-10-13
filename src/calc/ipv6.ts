/**
 * IPv6 base calculator (FR-05).
 *
 * Parses a compressed IPv6 address with a prefix, derives the network,
 * its range and the usable summary size. All arithmetic runs on BigInt
 * because addresses are 128-bit. Normalisation follows RFC 5952
 * (lowercase hex, longest zero run compressed with "::").
 */

import type { ValidationFailure } from './ip'

export interface Ipv6Info {
  address:          string  // normalised (RFC 5952)
  expanded:         string  // full 8-group form, no compression
  prefix:           number
  network:          string  // network address, normalised
  lastAddress:      string  // last address of the prefix
  totalAddresses:   string  // 2^(128-prefix), decimal string (BigInt)
  usableSize:       string  // hint column: total minus nothing for v6 (kept for parity)
  isLoopback:       boolean
  isUnspecified:    boolean
  isLinkLocal:      boolean
  isUniqueLocal:    boolean // ULA, fc00::/7
  isMulticast:      boolean
  isGlobalUnicast:  boolean
}

const GROUPS = 8

/** Parse one IPv6 address into its 128-bit BigInt value, or null. */
function parseAddress(raw: string): bigint | null {
  // Drop an optional zone id ("fe80::1%eth0").
  const addr = raw.split('%')[0]?.trim() ?? ''
  if (addr === '' || addr.includes('.')) return null

  const parts = addr.split('::')
  if (parts.length > 2) return null

  const head = (parts[0] ?? '').split(':').filter(g => g !== '')
  const tail = parts.length === 2 ? (parts[1] ?? '').split(':').filter(g => g !== '') : []
  const compressed = parts.length === 2

  if (compressed) {
    if (head.length + tail.length > GROUPS - 1) return null
  } else if (head.length !== GROUPS) {
    return null
  }

  const isGroup = (g: string): boolean => /^[0-9a-fA-F]{1,4}$/.test(g)

  // Assemble: head groups, then the implied zero groups, then the tail.
  let value = 0n
  for (const group of head) {
    if (!isGroup(group)) return null
    value = (value << 16n) | BigInt(parseInt(group, 16))
  }
  if (compressed) {
    value <<= BigInt(16 * (GROUPS - head.length - tail.length))
  }
  for (const group of tail) {
    if (!isGroup(group)) return null
    value = (value << 16n) | BigInt(parseInt(group, 16))
  }
  return value
}

function toGroups(value: bigint): string[] {
  const out: string[] = []
  for (let i = GROUPS - 1; i >= 0; i--) {
    out.push(((value >> BigInt(16 * i)) & 0xffffn).toString(16).padStart(4, '0'))
  }
  return out
}

/** RFC 5952 canonical form: lowercase, no leading zeros, longest zero run (≥2) as "::". */
function normalise(value: bigint): string {
  // Strip the padding zeros inside each group ("0db8" → "db8").
  const groups = toGroups(value).map(g => g.replace(/^0+(?=.)/, ''))
  let bestStart = -1
  let bestLen = 1
  let runStart = -1
  for (let i = 0; i < groups.length + 1; i++) {
    if (groups[i] === '0') {
      if (runStart === -1) runStart = i
    } else {
      if (runStart !== -1) {
        const len = i - runStart
        if (len > bestLen) {
          bestLen = len
          bestStart = runStart
        }
        runStart = -1
      }
    }
  }
  if (bestStart === -1) return groups.join(':')
  const head = groups.slice(0, bestStart).join(':')
  const tail = groups.slice(bestStart + bestLen).join(':')
  return `${head}::${tail}`
}

function expanded(value: bigint): string {
  return toGroups(value).join(':')
}

export function calcIpv6(cidr: string): Ipv6Info | ValidationFailure {
  if (cidr.trim() === '') return { ok: false, errorKey: 'error.empty' }

  const trimmed = cidr.trim()
  const slashIdx = trimmed.indexOf('/')
  if (slashIdx === -1) return { ok: false, errorKey: 'error.ipv6_prefix_range' }

  const addrPart = trimmed.slice(0, slashIdx)
  const prefixPart = trimmed.slice(slashIdx + 1)
  const prefix = Number(prefixPart)

  if (
    prefixPart.trim() === '' ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 128
  ) {
    return { ok: false, errorKey: 'error.ipv6_prefix_range' }
  }

  const addr = parseAddress(addrPart)
  if (addr === null) return { ok: false, errorKey: 'error.ipv6_invalid' }

  const hostBits = BigInt(128 - prefix)
  const mask = prefix === 0 ? 0n : (((1n << BigInt(prefix)) - 1n) << hostBits)
  const network = addr & mask
  const total = 1n << hostBits
  const last = network + total - 1n

  const top8 = addr >> 120n
  const isLinkLocal = (addr >> 118n) === 0x3fan // fe80::/10
  const isUniqueLocal = (addr >> 121n) === 0x7en // fc00::/7
  const isMulticast = top8 === 0xffn
  const isLoopback = addr === 1n
  const isUnspecified = addr === 0n
  const isGlobalUnicast =
    !isLoopback && !isUnspecified && !isLinkLocal && !isUniqueLocal && !isMulticast

  return {
    address: normalise(addr),
    expanded: expanded(addr),
    prefix,
    network: normalise(network),
    lastAddress: normalise(last),
    totalAddresses: total.toString(),
    usableSize: total.toString(),
    isLoopback,
    isUnspecified,
    isLinkLocal,
    isUniqueLocal,
    isMulticast,
    isGlobalUnicast,
  }
}
