/**
 * Application state: shape, defaults and localStorage persistence (FR-07).
 *
 * The stored blob is versioned; a missing or mismatched version is treated
 * as "no saved state" rather than an error, so schema changes reset cleanly
 * instead of crashing on load.
 */

export const STATE_KEY = 'eli6subnets_state'
export const SCHEMA_VERSION = 1

/**
 * Views that are calculators: they hold persisted inputs, render a panel
 * and support CSV import/export.
 */
export type CalculatorId = 'single' | 'vlsm' | 'split' | 'supernet'

/** Callee-facing list used to register panels and sidebar entries. */
export const CALCULATOR_IDS: CalculatorId[] = ['single', 'vlsm', 'split', 'supernet']

/**
 * Every navigable view in the sidebar. Widened as the redesign rolls out
 * (range → CIDR, overlap, IPv6, topology, classes, guide, projects).
 */
export type ViewId =
  | CalculatorId
  | 'range'
  | 'overlap'
  | 'ipv6'
  | 'topology'
  | 'classes'
  | 'guide'
  | 'projects'

export const VIEW_IDS: ViewId[] = [
  'single', 'vlsm', 'split', 'supernet',
  'range', 'overlap', 'ipv6', 'topology',
  'classes', 'guide', 'projects',
]

export type ThemeName = 'light' | 'dark'

export interface VlsmRow {
  name: string
  hosts: string
}

export interface AppState {
  version:    typeof SCHEMA_VERSION
  activeView: ViewId
  lang:       'it' | 'en'
  theme:      ThemeName
  tools: {
    single:   { cidr: string }
    vlsm:     { baseCidr: string; requests: VlsmRow[] }
    split:    { cidr: string; count: string }
    supernet: { cidrs: string[] }
  }
  cisco: {
    interfaceName: string
    nextHop:       string
  }
}

export function defaultState(): AppState {
  return {
    version:    SCHEMA_VERSION,
    activeView: 'single',
    lang:       'it',
    theme:      'dark',
    tools: {
      single:   { cidr: '' },
      vlsm:     { baseCidr: '', requests: [] },
      split:    { cidr: '', count: '' },
      supernet: { cidrs: [] },
    },
    cisco: {
      interfaceName: '',
      nextHop:       '',
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function vlsmRows(value: unknown): VlsmRow[] {
  if (!Array.isArray(value)) return []
  const rows: VlsmRow[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    rows.push({
      name:  str(item['name'], ''),
      hosts: str(item['hosts'], ''),
    })
  }
  return rows
}

/**
 * Coerce an arbitrary parsed value into a complete AppState.
 * Returns null when the blob is unusable (wrong type or schema version).
 * Unknown fields are dropped; missing fields fall back to defaults, so a
 * partially written state still loads. Legacy states written before the
 * sidebar redesign used `activeTool`; the alias keeps them readable.
 */
export function normalizeState(raw: unknown): AppState | null {
  if (!isRecord(raw)) return null
  if (raw['version'] !== SCHEMA_VERSION) return null

  const base = defaultState()
  const tools = isRecord(raw['tools']) ? raw['tools'] : {}

  const activeView = str(raw['activeView'], str(raw['activeTool'], base.activeView))
  const theme      = str(raw['theme'], base.theme)
  const lang       = str(raw['lang'], base.lang)
  const cisco      = isRecord(raw['cisco']) ? raw['cisco'] : {}

  const single   = isRecord(tools['single'])   ? tools['single']   : {}
  const vlsm     = isRecord(tools['vlsm'])     ? tools['vlsm']     : {}
  const split    = isRecord(tools['split'])    ? tools['split']    : {}
  const supernet = isRecord(tools['supernet']) ? tools['supernet'] : {}

  return {
    version:    SCHEMA_VERSION,
    activeView: (VIEW_IDS as string[]).includes(activeView)
      ? (activeView as ViewId)
      : base.activeView,
    lang:       lang === 'en' ? 'en' : 'it',
    theme:      theme === 'dark' ? 'dark' : 'light',
    tools: {
      single:   { cidr: str(single['cidr'], '') },
      vlsm: {
        baseCidr: str(vlsm['baseCidr'], ''),
        requests: vlsmRows(vlsm['requests']),
      },
      split: {
        cidr:  str(split['cidr'], ''),
        count: str(split['count'], ''),
      },
      supernet: { cidrs: strList(supernet['cidrs']) },
    },
    cisco: {
      interfaceName: str(cisco['interfaceName'], base.cisco.interfaceName),
      nextHop:       str(cisco['nextHop'], base.cisco.nextHop),
    },
  }
}

/** Read the saved state, or null when absent / unreadable / outdated. */
export function loadState(): AppState | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(STATE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    return normalizeState(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

let pendingWrite: number | null = null

/**
 * Persist the state. Rapid successive calls coalesce into a single write on
 * the next animation frame; environments without rAF (tests, SSR) write
 * synchronously so behaviour stays observable.
 */
export function saveState(state: AppState): void {
  const write = (): void => {
    pendingWrite = null
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch {
      // quota or blocked storage — session continues in memory only
    }
  }

  if (typeof requestAnimationFrame !== 'function') {
    write()
    return
  }
  if (pendingWrite !== null) cancelAnimationFrame(pendingWrite)
  pendingWrite = requestAnimationFrame(write)
}

/** Drop the saved state (New Session). */
export function clearState(): void {
  if (pendingWrite !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(pendingWrite)
    pendingWrite = null
  }
  try {
    localStorage.removeItem(STATE_KEY)
  } catch {
    // non-fatal
  }
}
