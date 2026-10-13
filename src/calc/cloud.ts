/**
 * Reserved-address rules for AWS VPC subnets and Azure subnets (FR-06).
 *
 * Given a CIDR and a provider, reports which addresses the platform
 * reserves so students see why the usable count is lower than
 * 2^n - 2. Rules (public docs):
 *
 * AWS subnet — reserves the first four addresses (subnet router,
 * then three reserved) and the last one. Smallest size /28.
 *
 * Azure subnet — reserves the first five addresses (network,
 * Azure gateway, DNS, then two reserved); the last address is usable.
 * Smallest size /29.
 */

import { validateIpCidr, prefixToMask, ipToUint32, uint32ToIp, isValidationFailure, type ValidationFailure } from './ip'
import { calcSubnet } from './subnet'

export type CloudProvider = 'aws' | 'azure'

export interface CloudReservedRow {
  offset: number  // 0-based position inside the CIDR
  address: string
  roleKey: string // i18n key: cloud.role.*
}

export interface CloudResult {
  provider:      CloudProvider
  cidr:          string
  prefix:        number
  totalAddresses: number
  reservedCount: number // addresses taken by the platform
  usableHosts:   number
  firstUsable:   string | null  // null when nothing is usable
  lastUsable:    string | null
  maxPrefix:     number         // largest prefix number allowed (smallest subnet)
  prefixOk:      false | true   // false when the subnet is smaller than allowed
  rows:          CloudReservedRow[]
}

const AWS_RESERVED_LEADING = [
  { offset: 0, roleKey: 'cloud.role.router' },
  { offset: 1, roleKey: 'cloud.role.reserved' },
  { offset: 2, roleKey: 'cloud.role.reserved' },
  { offset: 3, roleKey: 'cloud.role.reserved' },
]

const AZURE_RESERVED_LEADING = [
  { offset: 0, roleKey: 'cloud.role.network' },
  { offset: 1, roleKey: 'cloud.role.gateway' },
  { offset: 2, roleKey: 'cloud.role.dns' },
  { offset: 3, roleKey: 'cloud.role.reserved' },
  { offset: 4, roleKey: 'cloud.role.reserved' },
]

const PROVIDER_RULES: Record<CloudProvider, {
  leading: { offset: number; roleKey: string }[]
  reserveLast: boolean
  maxPrefix: number
}> = {
  aws:   { leading: AWS_RESERVED_LEADING, reserveLast: true, maxPrefix: 28 },
  azure: { leading: AZURE_RESERVED_LEADING, reserveLast: false, maxPrefix: 29 },
}

export function calcCloud(
  cidr: string,
  provider: CloudProvider,
): CloudResult | ValidationFailure {
  const v = validateIpCidr(cidr)
  if (isValidationFailure(v)) return v

  const info = calcSubnet(cidr)
  if (isValidationFailure(info)) return info

  const rules = PROVIDER_RULES[provider]
  const network = (v.ip & prefixToMask(v.prefix)) >>> 0
  const total = info.totalAddresses

  const reservedSet = new Set<number>()
  const rows: CloudReservedRow[] = []

  for (const rule of rules.leading) {
    if (rule.offset < total) {
      reservedSet.add(rule.offset)
      rows.push({
        offset: rule.offset,
        address: uint32ToIp((network + rule.offset) >>> 0),
        roleKey: rule.roleKey,
      })
    }
  }
  if (rules.reserveLast && total > 0 && !reservedSet.has(total - 1)) {
    reservedSet.add(total - 1)
    rows.push({
      offset: total - 1,
      address: uint32ToIp((network + total - 1) >>> 0),
      roleKey: 'cloud.role.lastReserved',
    })
  }

  const reservedCount = reservedSet.size
  const usableHosts = Math.max(0, total - reservedCount)

  let firstUsable: string | null = null
  let lastUsable: string | null = null
  for (let i = 0; i < total && firstUsable === null; i++) {
    if (!reservedSet.has(i)) firstUsable = uint32ToIp((network + i) >>> 0)
  }
  for (let i = total - 1; i >= 0 && lastUsable === null; i--) {
    if (!reservedSet.has(i)) lastUsable = uint32ToIp((network + i) >>> 0)
  }

  return {
    provider,
    cidr: `${uint32ToIp(network)}/${v.prefix}`,
    prefix: v.prefix,
    totalAddresses: total,
    reservedCount,
    usableHosts,
    firstUsable,
    lastUsable,
    maxPrefix: rules.maxPrefix,
    prefixOk: v.prefix <= rules.maxPrefix,
    rows,
  }
}
