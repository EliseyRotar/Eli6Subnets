/**
 * Overlap checker tool panel: compare a list of CIDRs and report every
 * pair that shares addresses (FR-06).
 */

import { findOverlaps, type OverlapResult } from '../../calc/overlap'
import { isValidationFailure } from '../../calc/ip'
import { formatNumber, t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { escapeHtml, clear, qs, qsa, setFieldError } from '../dom'
import { IconCross, IconPlus } from '../icons'
import { kpiRow } from '../kpi'
import { alertBlock, emptyState, simpleTable } from '../subnetView'
import type { ToolPanel } from './types'

const BLANK_ROWS = 2

export function mountOverlap(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-overlap" aria-labelledby="nav-overlap">
      <div class="tool-panel__input">
        <form class="tool-form" id="overlap-form" novalidate>
          <fieldset class="field">
            <legend class="field__label" data-i18n-key="field.networks"></legend>
            <div class="overlap-rows"></div>
            <p class="field__error" id="overlap-error" role="alert"></p>
          </fieldset>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.check"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root  = qs(container, '#view-overlap')
  const form  = qs(root, '#overlap-form')
  const rowsHost = qs(root, '.overlap-rows')
  const error = qs(root, '#overlap-error')
  const body  = qs(root, '.js-result-body')

  let lastResult: OverlapResult | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  let errorVisible = false

  const rowTemplate = (value = ''): string => `
    <div class="overlap-row">
      <input class="field__input overlap-row__input" type="text" autocomplete="off"
             spellcheck="false" placeholder="192.168.1.0/24" value="${escapeHtml(value)}">
      <button type="button" class="btn btn--icon overlap-row__remove"
              data-i18n-aria="action.removeRow" aria-label="${escapeHtml(t('action.removeRow'))}">
        ${IconCross}
      </button>
    </div>`

  const inputs = (): HTMLInputElement[] =>
    qsa<HTMLInputElement>(rowsHost, '.overlap-row__input')

  const rowValues = (): string[] =>
    inputs().map(input => input.value.trim()).filter(value => value !== '')

  const syncRows = (): void => {
    patchTool('overlap', { cidrs: inputs().map(input => input.value) })
  }

  const addRow = (value = ''): void => {
    rowsHost.insertAdjacentHTML('beforeend', rowTemplate(value))
    const added = rowsHost.querySelectorAll<HTMLInputElement>('.overlap-row__input')
    added[added.length - 1]?.focus()
    syncRows()
  }

  const removeRow = (button: HTMLElement): void => {
    const row = button.closest('.overlap-row')
    if (inputs().length > 1) row?.remove()
    else {
      const input = row?.querySelector<HTMLInputElement>('.overlap-row__input')
      if (input) input.value = ''
    }
    syncRows()
    calculate()
  }

  rowsHost.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('.overlap-row__remove')
    if (button) removeRow(button)
  })

  const showError = (key: string, suggestion: string | null): void => {
    lastError = { key, suggestion }
    errorVisible = true
    setFieldError(error, t(key, suggestion ?? ''))
  }

  const hideError = (): void => {
    lastError = null
    errorVisible = false
    setFieldError(error, null)
  }

  const render = (): void => {
    clear(body)
    if (!lastResult) {
      body.appendChild(emptyState('empty.overlap'))
      return
    }

    const { pairs, networks } = lastResult
    const largest = pairs.reduce((max, pair) => Math.max(max, pair.size), 0)
    body.appendChild(
      kpiRow([
        { label: t('kpi.pairs'), value: formatNumber(pairs.length) },
        { label: t('kpi.compared'), value: formatNumber(networks.length) },
        { label: t('kpi.span'), value: pairs.length > 0 ? formatNumber(largest) : '—' },
        {
          label: t('kpi.prefix'),
          value: pairs.length > 0 ? pairs[0]?.cidr ?? '—' : '—',
        },
      ]),
    )

    if (pairs.length === 0) {
      body.appendChild(alertBlock('success', t('overlap.none')))
      return
    }

    body.appendChild(alertBlock('warning', t('overlap.found', pairs.length)))
    const relationLabel = (relation: string): string => {
      if (relation === 'equal') return t('overlap.rel.equal')
      if (relation === 'a-contains-b') return t('overlap.rel.aContainsB')
      return t('overlap.rel.bContainsA')
    }
    body.appendChild(
      simpleTable(
        ['A', 'B', t('label.relation'), t('overlap.span'), t('label.totalAddresses'), t('label.cidr')],
        pairs.map(pair => [
          pair.a,
          pair.b,
          relationLabel(pair.relation),
          `${pair.first} – ${pair.last}`,
          formatNumber(pair.size),
          pair.cidr ?? '—',
        ]),
      ),
    )
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const values = rowValues()

    if (values.length === 0) {
      lastResult = null
      if (silent) {
        lastError = { key: 'error.overlap_min_entries', suggestion: null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError('error.overlap_min_entries', null)
      }
      render()
      return
    }

    const result = findOverlaps(values)
    if (isValidationFailure(result)) {
      lastResult = null
      if (silent) {
        lastError = { key: result.errorKey, suggestion: result.suggestion ?? null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError(result.errorKey, result.suggestion ?? null)
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
    syncRows()
    calculate()
  })

  rowsHost.addEventListener('input', syncRows)

  const panel: ToolPanel = {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(error, t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(error, null)
      }
      render()
    },
    hydrate(state: AppState) {
      const saved = state.tools.overlap.cidrs
      rowsHost.innerHTML = ''
      const list = saved.length > 0 ? saved : Array.from({ length: BLANK_ROWS }, () => '')
      for (const value of list) rowsHost.insertAdjacentHTML('beforeend', rowTemplate(value))
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['cidr']]
      for (const value of rowValues()) rows.push([value])
      return rows
    },
    csvHeader: ['cidr'],
    importCsv(rows) {
      const values: string[] = []
      for (const row of rows) {
        const value = (row[0] ?? '').trim()
        if (value !== '') values.push(value)
      }
      if (values.length === 0) return t('csv.error.row', 1, 1, t('csv.error.required'))
      rowsHost.innerHTML = ''
      for (const value of values) rowsHost.insertAdjacentHTML('beforeend', rowTemplate(value))
      syncRows()
      calculate()
      return lastResult ? null : t(lastError?.key ?? 'error.empty', lastError?.suggestion ?? '')
    },
  }

  hydrateBlank()
  function hydrateBlank(): void {
    rowsHost.innerHTML = ''
    for (let i = 0; i < BLANK_ROWS; i++) rowsHost.insertAdjacentHTML('beforeend', rowTemplate())
    calculate({ silent: true })
  }

  return panel
}
