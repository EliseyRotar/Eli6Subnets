/**
 * Supernetting / route summarisation (FR-04).
 *
 * Finds the shortest covering supernet for a list of CIDR prefixes.
 * Flags if the supernet covers addresses not in the input set (impure).
 */

import {
  validateIpCidr,
  prefixToMask,
  uint32ToIp,
  log2,
  nextPowerOfTwo,
  type ValidationFailure,
} from './ip'
import { calcSubnet, type SubnetInfo } from './subnet'

export interface SupernetResult {
  supernet:       string        // CIDR of the covering supernet
  isPure:         boolean       // true only if supernet exactly covers input
  extraAddresses: string[]      // CIDRs covered by supernet but not in input
  inputNetworks:  SubnetInfo[]
}

export function summarise(cidrs: string[]): SupernetResult | ValidationFailure {
  if (cidrs.length < 2) {
    return { ok: false, errorKey: 'error.supernet_min_entries' }
  }

  // Parse and validate every input CIDR
  const networks: SubnetInfo[] = []
  const networkInts: number[]  = []

  for (const cidr of cidrs) {
    const v = validateIpCidr(cidr)
    if (!v.ok) return v
    const info = calcSubnet(cidr)
    if (!('networkAddress' in info)) return info
    networks.push(info)
    networkInts.push(v.ip)
  }

  // Find the min and max network addresses
  const minAddr = Math.min(...networkInts) >>> 0
  const maxAddr = Math.max(...networkInts) >>> 0

  // When all addresses are identical the XOR span is 0; preserve the common
  // input prefix rather than collapsing to /32.
  const span = (minAddr ^ maxAddr) >>> 0
  let superPrefix: number
  if (span === 0) {
    superPrefix = Math.min(...networks.map(n => n.prefix))
  } else {
    const divergeBit = Math.ceil(Math.log2(span + 1))
    superPrefix = 32 - divergeBit
  }

  const superMask    = superPrefix > 0 ? (0xffffffff << (32 - superPrefix)) >>> 0 : 0
  const superNetwork = (minAddr & superMask) >>> 0
  const superCidr    = `${uint32ToIp(superNetwork)}/${superPrefix}`

  // Build the list of all /N subnets inside the supernet where N is the
  // most common (smallest) prefix among inputs — used to check purity.
  // "Pure" means the supernet contains exactly the input CIDRs and nothing else.
  const inputCidrSet  = new Set(cidrs.map(c => c.trim()))
  const extraAddresses: string[] = []

  // Enumerate all blocks of the smallest input prefix within the supernet
  const minInputPrefix = Math.min(...networks.map(n => n.prefix))
  const blockSize      = (1 << (32 - minInputPrefix)) >>> 0
  const superSize      = superPrefix <= 31 ? (1 << (32 - superPrefix)) >>> 0 : 1

  if (superSize >= blockSize) {
    const count = superSize / blockSize
    for (let i = 0; i < count; i++) {
      const addr = (superNetwork + i * blockSize) >>> 0
      const candidate = `${uint32ToIp(addr)}/${minInputPrefix}`
      if (!inputCidrSet.has(candidate)) {
        extraAddresses.push(candidate)
      }
    }
  }

  const isPure = extraAddresses.length === 0

  return {
    supernet: superCidr,
    isPure,
    extraAddresses,
    inputNetworks: networks,
  }
}
