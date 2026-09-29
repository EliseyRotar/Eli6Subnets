/**
 * Single subnet calculation (FR-01).
 * RFC 3021: /31 has 2 usable hosts; /32 has 1 usable host.
 */

import {
  ipToUint32,
  uint32ToIp,
  prefixToMask,
  validateIpCidr,
  type ValidationFailure,
} from './ip'

export interface SubnetInfo {
  networkAddress:   string
  broadcastAddress: string
  subnetMask:       string
  wildcardMask:     string
  firstHost:        string
  lastHost:         string
  totalAddresses:   number
  usableHosts:      number
  prefix:           number
  historicalClass:  'A' | 'B' | 'C' | 'D' | 'E'
  isPrivate:        boolean   // RFC 1918
  isLoopback:       boolean   // 127.0.0.0/8
  isLinkLocal:      boolean   // 169.254.0.0/16
  isMulticast:      boolean   // 224.0.0.0/4
  isPointToPoint:   boolean   // /31 (RFC 3021)
  isHostRoute:      boolean   // /32
}

/**
 * Calculate full subnet information from a CIDR string.
 * Returns SubnetInfo on success, a validation failure on invalid input.
 */
export function calcSubnet(cidr: string): SubnetInfo | ValidationFailure {
  const v = validateIpCidr(cidr)
  if (!v.ok) return v

  const { ip, prefix } = v
  const mask       = prefixToMask(prefix)
  const wildcard   = (~mask) >>> 0
  const network    = (ip & mask) >>> 0
  const broadcast  = (network | wildcard) >>> 0

  // Total addresses in the block.
  // JavaScript bitwise shift is 32-bit: (1 << 32) === 1, not 4294967296.
  // For /0 we must use the numeric literal directly.
  const totalAddresses = prefix === 0 ? 4294967296 : prefix <= 31 ? (1 << (32 - prefix)) >>> 0 : 1

  // Usable hosts per RFC 3021:
  //   /32 → 1 (the host itself)
  //   /31 → 2 (point-to-point, no network/broadcast reserved)
  //   /0–/30 → total - 2
  let usableHosts: number
  let firstHost: string
  let lastHost: string

  if (prefix === 32) {
    usableHosts = 1
    firstHost   = uint32ToIp(network)
    lastHost    = uint32ToIp(network)
  } else if (prefix === 31) {
    usableHosts = 2
    firstHost   = uint32ToIp(network)
    lastHost    = uint32ToIp(broadcast)
  } else {
    usableHosts = totalAddresses - 2
    firstHost   = uint32ToIp((network + 1) >>> 0)
    lastHost    = uint32ToIp((broadcast - 1) >>> 0)
  }

  // Historical class from the first octet of the network address
  const firstOctet = (network >>> 24) & 0xff
  const historicalClass = classifyOctet(firstOctet)

  // Address type flags
  const isLoopback   = (network & 0xff000000) >>> 0 === ipToUint32('127.0.0.0')
  const isLinkLocal  = (network & 0xffff0000) >>> 0 === ipToUint32('169.254.0.0')
  const isMulticast  = (network & 0xf0000000) >>> 0 === ipToUint32('224.0.0.0')
  const isPrivate    = checkPrivate(network)

  return {
    networkAddress:   uint32ToIp(network),
    broadcastAddress: uint32ToIp(broadcast),
    subnetMask:       uint32ToIp(mask),
    wildcardMask:     uint32ToIp(wildcard),
    firstHost,
    lastHost,
    totalAddresses,
    usableHosts,
    prefix,
    historicalClass,
    isPrivate,
    isLoopback,
    isLinkLocal,
    isMulticast,
    isPointToPoint: prefix === 31,
    isHostRoute:    prefix === 32,
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function classifyOctet(first: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (first >= 1   && first <= 126) return 'A'
  if (first >= 128 && first <= 191) return 'B'
  if (first >= 192 && first <= 223) return 'C'
  if (first >= 224 && first <= 239) return 'D'
  return 'E'
}

function checkPrivate(network: number): boolean {
  const n = network >>> 0
  // 10.0.0.0/8
  if ((n & 0xff000000) >>> 0 === 0x0a000000) return true
  // 172.16.0.0/12
  if ((n & 0xfff00000) >>> 0 === 0xac100000) return true
  // 192.168.0.0/16
  if ((n & 0xffff0000) >>> 0 === 0xc0a80000) return true
  return false
}
