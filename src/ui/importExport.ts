/**
 * Import / export toolbar (FR-06 / T-18).
 *
 * JSON carries the whole application state; CSV carries only the active
 * tool's inputs, which makes an export → import round trip lossless.
 */

import { normalizeState, type AppState, type CalculatorId } from '../state/persist'
import { getState, setState } from '../state/store'
import { t } from '../i18n'
import { qs } from './dom'
import { IconCross, IconExport, IconImport } from './icons'
import { showToast } from './toast'
import type { ToolPanel } from './tools/types'

const CSV_DELIMITER = ';'
const CSV_BOM = '\uFEFF'

export interface ImportExportHandle {
  /** Show a localised message in the footer's inline alert area. */
  showError: (message: string) => void
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Semicolon-separated, RFC 4180 quoting, UTF-8 BOM for Excel (Q3). */
export function toCsv(rows: string[][]): string {
  const body = rows
    .map(row =>
      row
        .map(cell => (/[;"\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(CSV_DELIMITER),
    )
    .join('\r\n')
  return `${CSV_BOM}${body}`
}

/** Split-delimited parser with double-quote support. */
export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '')
  const firstLine = cleaned.split(/\r?\n/).find(line => line.trim() !== '') ?? ''
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  const delimiter = semicolons >= commas ? CSV_DELIMITER : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i] ?? ''

    if (inQuotes) {
      if (char === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') inQuotes = true
    else if (char === delimiter) { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') field += char
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter(cells => cells.some(cell => cell.trim() !== ''))
}

export function mountImportExport(
  container: HTMLElement,
  panels: Record<CalculatorId, ToolPanel>,
): ImportExportHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="footer__group">
      <button type="button" class="btn btn--secondary btn--sm" id="export-json">
        ${IconExport}<span data-i18n-key="action.exportJson"></span>
      </button>
      <button type="button" class="btn btn--secondary btn--sm" id="export-csv">
        ${IconExport}<span data-i18n-key="action.exportCsv"></span>
      </button>
    </div>
    <div class="footer__separator" aria-hidden="true"></div>
    <div class="footer__group">
      <button type="button" class="btn btn--secondary btn--sm" id="import-json">
        ${IconImport}<span data-i18n-key="action.importJson"></span>
      </button>
      <button type="button" class="btn btn--secondary btn--sm" id="import-csv">
        ${IconImport}<span data-i18n-key="action.importCsv"></span>
      </button>
      <input type="file" id="import-json-file" accept=".json,application/json" class="sr-only"
             tabindex="-1" data-i18n-aria="action.importJson">
      <input type="file" id="import-csv-file" accept=".csv,text/csv" class="sr-only"
             tabindex="-1" data-i18n-aria="action.importCsv">
    </div>
    <div class="footer__separator" aria-hidden="true"></div>
    <div class="footer__alert alert alert--error" role="alert" hidden>
      ${IconImport}
      <span class="js-import-error"></span>
      <button type="button" class="btn btn--ghost btn--sm js-dismiss-error"
              data-i18n-aria="action.dismissError">${IconCross}</button>
    </div>`,
  )

  const errorAlert = qs(container, '.footer__alert')
  const errorText = qs(container, '.js-import-error')

  let errorTimer: ReturnType<typeof setTimeout> | null = null

  const showError = (message: string): void => {
    if (errorTimer !== null) clearTimeout(errorTimer)
    errorText.textContent = message
    errorAlert.hidden = false
    errorTimer = setTimeout(() => {
      errorAlert.hidden = true
      errorTimer = null
    }, 10000)
  }

  const clearError = (): void => {
    if (errorTimer !== null) clearTimeout(errorTimer)
    errorAlert.hidden = true
    errorText.textContent = ''
  }

  /**
   * The active view's panel when that view is a calculator; reference
   * views (guide, classes, …) carry no CSV schema and return null.
   */
  const activePanel = (): ToolPanel | null => {
    return panels[getState().activeView as CalculatorId] ?? null
  }

  const applyState = (state: AppState): void => {
    clearError()
    setState(state)
    for (const panel of Object.values(panels)) panel.hydrate(state)
    showToast(t('import.jsonSuccess'), 'success')
  }

  // ── Export ──────────────────────────────────────────────────────

  qs(container, '#export-json').addEventListener('click', () => {
    download('eli6subnets-state.json', JSON.stringify(getState(), null, 2), 'application/json')
    showToast(t('export.done', 'JSON'), 'success')
  })

  qs(container, '#export-csv').addEventListener('click', () => {
    const panel = activePanel()
    if (!panel) {
      showError(t('export.noCsvView'))
      return
    }
    const view = getState().activeView
    download(`eli6subnets-${view}.csv`, toCsv(panel.exportCsv()), 'text/csv')
    showToast(t('export.done', 'CSV'), 'success')
  })

  // ── Import JSON ─────────────────────────────────────────────────

  const jsonInput = qs<HTMLInputElement>(container, '#import-json-file')
  qs(container, '#import-json').addEventListener('click', () => jsonInput.click())

  jsonInput.addEventListener('change', () => {
    const file = jsonInput.files?.[0]
    jsonInput.value = ''
    if (!file) return

    void file.text().then(text => {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        showError(t('import.invalidJson', error instanceof Error ? error.message : String(error)))
        return
      }
      const state = normalizeState(parsed)
      if (!state) {
        showError(t('import.unsupportedState'))
        return
      }
      applyState(state)
    })
  })

  // ── Import CSV ──────────────────────────────────────────────────

  const csvInput = qs<HTMLInputElement>(container, '#import-csv-file')
  qs(container, '#import-csv').addEventListener('click', () => csvInput.click())

  csvInput.addEventListener('change', () => {
    const file = csvInput.files?.[0]
    csvInput.value = ''
    if (!file) return

    void file.text().then(text => {
      clearError()
      const rows = parseCsv(text)
      const header = rows[0]

      if (!header) {
        showError(t('import.csvEmpty'))
        return
      }

      const panel = activePanel()
      if (!panel) {
        showError(t('export.noCsvView'))
        return
      }
      const expected = panel.csvHeader.map(column => column.toLowerCase())
      const actual = header.map(column => column.trim().toLowerCase())

      if (actual.length !== expected.length || actual.some((column, i) => column !== expected[i])) {
        showError(t('import.csvMismatch'))
        return
      }

      const data = rows.slice(1)
      if (data.length === 0) {
        showError(t('import.csvEmpty'))
        return
      }

      const error = panel.importCsv(data)
      if (error) {
        showError(error)
        return
      }
      showToast(t('import.csvSuccess'), 'success')
    })
  })

  qs(container, '.js-dismiss-error').addEventListener('click', clearError)

  return { showError }
}
