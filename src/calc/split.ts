/**
 * Equal subnet subdivision (FR-03).
 * Splits a base network into N equal subnets, rounding N up to the
 * next power of two when N is not already a power of two.
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

export interface SplitResult {
  subnets:      SubnetInfo[]
  subnetPrefix: number
  // Actual number of subnets produced (≥ requested count, rounded to power of two)
  actualCount:  number
}

export function splitEqual(
  baseCidr: string,
  count: number,
): SplitResult | ValidationFailure {
  if (!Number.isInteger(count) || count <= 0) {
    return { ok: false, errorKey: 'error.split_count_invalid' }
  }

  const base = validateIpCidr(baseCidr)
  if (!base.ok) return base

  const { ip: baseIp, prefix: basePrefix } = base
  const baseMask    = prefixToMask(basePrefix)
  const baseNetwork = (baseIp & baseMask) >>> 0

  // Number of subnet bits needed = ceil(log2(count))
  const actualCount = count === 1 ? 1 : nextPowerOfTwo(count)
  const bitsNeeded  = count === 1 ? 0 : log2(actualCount)
  const subPrefix   = basePrefix + bitsNeeded

  if (subPrefix > 32) {
    return { ok: false, errorKey: 'error.split_count_invalid' }
  }

  const blockSize = subPrefix <= 31 ? (1 << (32 - subPrefix)) >>> 0 : 1

  const subnets: SubnetInfo[] = []
  for (let i = 0; i < actualCount; i++) {
    const networkAddr = (baseNetwork + i * blockSize) >>> 0
    const cidr        = `${uint32ToIp(networkAddr)}/${subPrefix}`
    const info        = calcSubnet(cidr)
    if ('networkAddress' in info) {
      subnets.push(info)
    }
  }

  return { subnets, subnetPrefix: subPrefix, actualCount }
}
