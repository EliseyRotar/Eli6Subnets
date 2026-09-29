/**
 * Shareable URL encoding (FR-08).
 *
 * Only inputs travel through the URL — never computed results — so links stay
 * short and reproducible. The payload is URL-safe base64 of a JSON subset;
 * any decoding failure returns null and the caller falls back to localStorage.
 */

import { normalizeState, SCHEMA_VERSION, type AppState } from './persist'

const PARAM = 's'

/** URL-safe base64 without padding; the payload is UTF-8 encoded first. */
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/**
 * Extract the input-only subset that travels through a shared link.
 * Language and theme are personal preferences and stay out of the URL.
 */
export function shareableSubset(state: AppState): Partial<AppState> {
  return {
    version:    state.version,
    activeTool: state.activeTool,
    tools:      state.tools,
    cisco:      state.cisco,
  }
}

/** Build the `?s=…` query string for the given state. */
export function encodeStateToUrl(state: AppState): string {
  return `?${PARAM}=${toBase64Url(JSON.stringify(shareableSubset(state)))}`
}

/** Read `?s=…` back. Returns null for a missing or malformed payload. */
export function decodeStateFromUrl(search: string): Partial<AppState> | null {
  if (!search) return null
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const encoded = params.get(PARAM)
  if (!encoded) return null

  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    if ((parsed as Record<string, unknown>)['version'] !== SCHEMA_VERSION) return null

    // Re-run the full normaliser: it validates shape and drops unknown fields.
    const full = normalizeState(parsed)
    return full ? shareableSubset(full) : null
  } catch {
    return null
  }
}
