/**
 * IPv4 primitives.
 *
 * All bit-arithmetic uses unsigned 32-bit integers (>>> 0) because
 * JavaScript's bitwise operators work on signed 32-bit integers;
 * without >>> 0 addresses ≥ 128.0.0.0 produce negative numbers.
 */

export type ValidationResult =
  | { ok: true; ip: number; prefix: number }
  | { ok: false; errorKey: string; suggestion?: string }

/**
 * The error-only variant. Calc tools never return the `ok: true` side
 * (only `validateIpCidr` does), so their signatures use this type and
 * callers can narrow with a single `in` check or isValidationFailure().
 */
export type ValidationFailure =
  Extract<ValidationResult, { ok: false }>

// ── Conversion ───────────────────────────────────────────────────

/**
 * Convert a dotted-decimal IPv4 string to an unsigned 32-bit integer.
 * Throws if the input is not a valid 4-octet address; callers that need
 * safe parsing should use validateIpCidr instead.
 */
export function ipToUint32(ip: string): number {
  const octets = ip.split('.')
  if (octets.length !== 4) throw new RangeError(`Invalid IP: ${ip}`)
  let n = 0
  for (const octet of octets) {
    const v = parseInt(octet, 10)
    if (isNaN(v) || v < 0 || v > 255) throw new RangeError(`Invalid octet: ${octet}`)
    n = ((n << 8) | v) >>> 0
  }
  return n
}

/** Convert an unsigned 32-bit integer to a dotted-decimal IPv4 string. */
export function uint32ToIp(n: number): string {
  const u = n >>> 0
  return [
    (u >>> 24) & 0xff,
    (u >>> 16) & 0xff,
    (u >>>  8) & 0xff,
     u         & 0xff,
  ].join('.')
}

/**
 * Convert a prefix length (0–32) to a subnet mask as uint32.
 * /0  → 0x00000000
 * /24 → 0xFFFFFF00
 * /32 → 0xFFFFFFFF
 */
export function prefixToMask(prefix: number): number {
  if (prefix === 0) return 0
  // Shift a 32-bit all-ones value right by (32 - prefix) then invert sign
  return (0xffffffff << (32 - prefix)) >>> 0
}

/** Derive a prefix length from a subnet mask uint32. */
export function maskToPrefix(mask: number): number {
  // Count leading ones in the 32-bit mask
  const m = mask >>> 0
  let prefix = 0
  for (let i = 31; i >= 0; i--) {
    if ((m >>> i) & 1) prefix++
    else break
  }
  return prefix
}

// ── Validation ───────────────────────────────────────────────────

/**
 * Parse and validate a CIDR string (e.g. "192.168.1.0/24").
 *
 * Returns { ok: true, ip, prefix } on success where `ip` is the
 * uint32 value of the address as written (NOT forced to network address).
 *
 * Returns { ok: false, errorKey, suggestion? } with a key from the
 * requirements error catalogue on failure.  When host bits are set,
 * `suggestion` holds the corrected network address in CIDR notation.
 */
export function validateIpCidr(cidr: string): ValidationResult {
  if (!cidr || cidr.trim() === '') {
    return { ok: false, errorKey: 'error.empty' }
  }

  const trimmed = cidr.trim()
  const slashIdx = trimmed.indexOf('/')
  if (slashIdx === -1) {
    // Treat a bare IP (no prefix) as needing a prefix
    return { ok: false, errorKey: 'error.prefix_range' }
  }

  const ipPart = trimmed.slice(0, slashIdx)
  const prefixPart = trimmed.slice(slashIdx + 1)

  // Validate prefix
  const prefix = parseInt(prefixPart, 10)
  if (
    isNaN(prefix) ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32 ||
    prefixPart.trim() === ''
  ) {
    return { ok: false, errorKey: 'error.prefix_range' }
  }

  // Validate octets
  const octets = ipPart.split('.')
  if (octets.length !== 4) {
    return { ok: false, errorKey: 'error.octet_count' }
  }

  let ip = 0
  for (let i = 0; i < 4; i++) {
    const raw = octets[i] ?? ''
    if (raw === '' || raw.trim() === '') {
      return { ok: false, errorKey: 'error.octet_count' }
    }
    const v = parseInt(raw, 10)
    if (isNaN(v) || v < 0 || v > 255 || String(v) !== raw.trim()) {
      return {
        ok: false,
        errorKey: 'error.octet_range',
        suggestion: String(i + 1), // first argument: octet index (1-based)
      }
    }
    ip = ((ip << 8) | v) >>> 0
  }

  // Check for host bits set in network address
  const mask = prefixToMask(prefix)
  const networkIp = (ip & mask) >>> 0
  if (networkIp !== ip) {
    const corrected = `${uint32ToIp(networkIp)}/${prefix}`
    return {
      ok: false,
      errorKey: 'error.host_bits_set',
      suggestion: corrected,
    }
  }

  return { ok: true, ip, prefix }
}

// ── Utilities used across calc modules ──────────────────────────

/** Smallest power of two ≥ n. For n=0 returns 1. */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1
  let p = 1
  while (p < n) p <<= 1
  return p
}

/** Integer log₂; only valid for exact powers of two. */
export function log2(n: number): number {
  if (n <= 0) return 0
  let k = 0
  let v = n
  while (v > 1) { v >>>= 1; k++ }
  return k
}

/**
 * Narrow a calc tool's return value to its validation-failure variant.
 * Written over `unknown` so the negative branch removes exactly the error
 * type and leaves the tool's success type intact.
 */
export function isValidationFailure(value: unknown): value is ValidationFailure {
  return (
    typeof value === 'object' && value !== null && 'ok' in value
    && (value as { ok: unknown }).ok === false
  )
}
