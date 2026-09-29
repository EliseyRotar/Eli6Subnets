/** Shared contract for the four tool panels. */

import { t } from '../../i18n'
import type { AppState } from '../../state/persist'

export interface ToolPanel {
  /** The panel's <section> element. */
  readonly root: HTMLElement
  /** Recompute and render from the current inputs. */
  calculate: (options?: { silent?: boolean }) => void
  /** Re-render dynamic content after a language switch. */
  refresh: () => void
  /** Replace inputs from a restored or imported state, then recalculate. */
  hydrate: (state: AppState) => void
  /** CSV rows describing this tool's inputs, header row first. */
  exportCsv: () => string[][]
  /** Column names of this tool's CSV schema, in export order. */
  readonly csvHeader: string[]
  /** Load CSV data rows; returns a localised error message, or null on success. */
  importCsv: (rows: string[][]) => string | null
}

/** Localised "row N, column M: reason" message used by CSV imports. */
export function csvError(row: number, column: number, reason: string): string {
  return t('csv.error.row', row, column, reason)
}
