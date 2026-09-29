/**
 * VLSM allocator (FR-02).
 * Sorts requests largest-first, allocates sequentially within the base
 * network, reports overflow with the minimum prefix needed.
 */

import {
  validateIpCidr,
  prefixToMask,
  uint32ToIp,
  nextPowerOfTwo,
  log2,
  type ValidationFailure,
} from './ip'
import { calcSubnet, type SubnetInfo } from './subnet'

export interface VlsmRequest {
  name:          string
  requiredHosts: number
}

export interface VlsmAllocation {
  request: VlsmRequest
  subnet:  SubnetInfo
  cidr:    string
}

export interface VlsmResult {
  allocations:         VlsmAllocation[]
  unallocated:         VlsmRequest[]
  minBasePrefixNeeded: number | null   // null when all requests fit
}

export function allocateVlsm(
  baseCidr: string,
  requests: VlsmRequest[],
): VlsmResult | ValidationFailure {
  // Validate base network
  const base = validateIpCidr(baseCidr)
  if (!base.ok) return base

  // Validate request list
  if (requests.length === 0) {
    return { ok: false, errorKey: 'error.vlsm_empty' }
  }

  // Check for duplicate names
  const names = new Set<string>()
  for (const r of requests) {
    if (names.has(r.name)) {
      return { ok: false, errorKey: 'error.vlsm_duplicate_name' }
    }
    names.add(r.name)
  }

  const { ip: baseIp, prefix: basePrefix } = base
  const baseMask      = prefixToMask(basePrefix)
  const baseNetwork   = (baseIp & baseMask) >>> 0
  const baseBroadcast = (baseNetwork | (~baseMask >>> 0)) >>> 0

  // Sort largest-first: each block needs requiredHosts + 2 addresses
  // (network and broadcast), then round up to next power of two.
  const sorted = [...requests].sort((a, b) => b.requiredHosts - a.requiredHosts)

  let cursor = baseNetwork
  const allocations:  VlsmAllocation[] = []
  const unallocated:  VlsmRequest[]    = []

  for (const req of sorted) {
    if (req.requiredHosts <= 0) {
      return { ok: false, errorKey: 'error.host_count_invalid' }
    }

    const blockSize  = nextPowerOfTwo(req.requiredHosts + 2)
    const subPrefix  = 32 - log2(blockSize)

    // Align cursor to blockSize boundary
    const remainder = cursor % blockSize
    if (remainder !== 0) {
      cursor = (cursor + blockSize - remainder) >>> 0
    }

    // Check if this block fits within the base network
    const blockEnd = (cursor + blockSize - 1) >>> 0

    if (blockEnd > baseBroadcast || cursor > baseBroadcast) {
      unallocated.push(req)
      continue
    }

    const cidr   = `${uint32ToIp(cursor)}/${subPrefix}`
    const subnet = calcSubnet(cidr)

    if (!('networkAddress' in subnet)) {
      // Should not happen since we computed a valid CIDR
      unallocated.push(req)
      continue
    }

    allocations.push({ request: req, subnet, cidr })
    cursor = (cursor + blockSize) >>> 0
  }

  // If some requests could not be allocated, compute the minimum base
  // prefix that would fit ALL requests combined.
  let minBasePrefixNeeded: number | null = null
  if (unallocated.length > 0) {
    let totalNeeded = 0
    for (const req of requests) {
      totalNeeded += nextPowerOfTwo(req.requiredHosts + 2)
    }
    const totalBlock = nextPowerOfTwo(totalNeeded)
    minBasePrefixNeeded = 32 - log2(totalBlock)
  }

  return { allocations, unallocated, minBasePrefixNeeded }
}
