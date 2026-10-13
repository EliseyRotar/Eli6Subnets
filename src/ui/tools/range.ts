/**
 * Range → CIDR tool panel: decompose an IP span into the minimal
 * set of CIDR blocks (FR-06).
 */

import { isValidationFailure } from '../../calc/ip'
import { rangeToCidrs, type RangeResult } from '../../calc/range'
import { formatNumber, t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { clear, qs, setFieldError } from '../dom'
import { kpiRow } from '../kpi'
import { emptyState, simpleTable } from '../subnetView'
import type { ToolPanel } from './types'

export function mountRange(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-range" aria-labelledby="nav-range">
      <div class="tool-panel__input">
        <form class="tool-form" id="range-form" novalidate>
          <div class="field">
            <label class="field__label" for="range-start" data-i18n-key="field.start"></label>
            <input class="field__input" id="range-start" type="text" autocomplete="off"
                   spellcheck="false" placeholder="192.168.1.100">
            <p class="field__error" id="range-start-error" role="alert"></p>
          </div>
          <div class="field">
            <label class="field__label" for="range-end" data-i18n-key="field.end"></label>
            <input class="field__input" id="range-end" type="text" autocomplete="off"
                   spellcheck="false" placeholder="192.168.1.200">
            <p class="field__error" id="range-end-error" role="alert"></p>
          </div>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.calculate"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root    = qs(container, '#view-range')
  const form    = qs(root, '#range-form')
  const start   = qs<HTMLInputElement>(root, '#range-start')
  const end     = qs<HTMLInputElement>(root, '#range-end')
  const startError = qs(root, '#range-start-error')
  const endError   = qs(root, '#range-end-error')
  const body    = qs(root, '.js-result-body')

  let lastResult: RangeResult | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  let errorVisible = false

  const showError = (target: HTMLElement, key: string, suggestion: string | null): void => {
    lastError = { key, suggestion }
    errorVisible = true
    setFieldError(target, t(key, suggestion ?? ''))
  }

  const hideError = (): void => {
    lastError = null
    errorVisible = false
    setFieldError(startError, null)
    setFieldError(endError, null)
  }

  const render = (): void => {
    clear(body)
    if (!lastResult) {
      body.appendChild(emptyState('empty.range'))
      return
    }

    const shortest = Math.min(...lastResult.entries.map(e => Number(e.cidr.split('/')[1])))
    body.appendChild(
      kpiRow([
        { label: t('kpi.blocks'), value: formatNumber(lastResult.entries.length) },
        { label: t('label.totalAddresses'), value: formatNumber(lastResult.totalAddresses) },
        { label: t('kpi.range'), value: `${lastResult.start} – ${lastResult.end}` },
        { label: t('kpi.minPrefix'), value: `/${shortest}` },
      ]),
    )
    body.appendChild(
      simpleTable(
        [t('label.cidr'), t('field.start'), t('field.end'), t('label.totalAddresses')],
        lastResult.entries.map(e => [
          e.cidr,
          e.first,
          e.last,
          formatNumber(e.size),
        ]),
      ),
    )
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const startValue = start.value.trim()
    const endValue = end.value.trim()

    if (startValue === '' && endValue === '' && silent) {
      lastResult = null
      lastError = null
      render()
      return
    }

    const result = rangeToCidrs(startValue, endValue)
    if (isValidationFailure(result)) {
      lastResult = null
      const isEndError = startValue !== '' && (
        result.errorKey === 'error.range_order' || endValue === ''
      )
      if (silent) {
        lastError = { key: result.errorKey, suggestion: result.suggestion ?? null }
        errorVisible = false
        setFieldError(startError, null)
        setFieldError(endError, null)
      } else {
        showError(isEndError ? endError : startError, result.errorKey, result.suggestion ?? null)
      }
      render()
      return
    }

    lastResult = result
    hideError()
    render()
  }

  form.addEventListener('submit', event => {
    event.preventDefault()
    patchTool('range', { start: start.value, end: end.value })
    calculate()
  })
  start.addEventListener('input', () => patchTool('range', { start: start.value }))
  end.addEventListener('input', () => patchTool('range', { end: end.value }))

  const panel: ToolPanel = {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(startError, t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(startError, null)
        setFieldError(endError, null)
      }
      render()
    },
    hydrate(state: AppState) {
      start.value = state.tools.range.start
      end.value = state.tools.range.end
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['start', 'end']]
      const a = start.value.trim()
      const b = end.value.trim()
      if (a !== '' || b !== '') rows.push([a, b])
      return rows
    },
    csvHeader: ['start', 'end'],
    importCsv(rows) {
      const row = rows[0]
      if (!row || row.length !== 2) {
        return t('csv.error.row', 1, 2, t('csv.error.columnCount', 2, row?.length ?? 0))
      }
      if (rows.length > 1) return t('csv.error.extraRows', rows.length)
      const a = (row[0] ?? '').trim()
      const b = (row[1] ?? '').trim()
      if (a === '' || b === '') return t('csv.error.row', 1, 2, t('csv.error.required'))

      start.value = a
      end.value = b
      patchTool('range', { start: a, end: b })
      calculate()
      return lastResult ? null : t(lastError?.key ?? 'error.empty', lastError?.suggestion ?? '')
    },
  }

  calculate({ silent: true })
  return panel
}
