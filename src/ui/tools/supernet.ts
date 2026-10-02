/**
 * Supernetting tool panel (FR-04 / T-17).
 */

import { isValidationFailure, validateIpCidr } from '../../calc/ip'
import { summarise, type SupernetResult } from '../../calc/supernet'
import { calcSubnet, type SubnetInfo } from '../../calc/subnet'
import { t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { mountCisco, routeHint, snippet, summaryRoute, type CiscoHandle } from '../cisco'
import { clear, escapeHtml, html, qs, qsa, setFieldError } from '../dom'
import { IconCross, IconPlus } from '../icons'
import {
  alertBlock,
  emptyState,
  subnetListTable,
  subnetSection,
} from '../subnetView'
import { csvError, type ToolPanel } from './types'

const BLANK_ROWS = 2
const MAX_LISTED_EXTRAS = 64

export function mountSupernet(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-supernet" aria-labelledby="nav-supernet">
      <div class="tool-panel__input">
        <form class="tool-form" id="supernet-form" novalidate>
          <fieldset class="tool-fieldset">
            <legend class="field__label" data-i18n-key="field.networks"></legend>
            <div class="request-list js-rows"></div>
            <div class="form-toolbar">
              <button type="button" class="btn btn--secondary btn--sm js-add-row">
                ${IconPlus}<span data-i18n-key="action.addRow"></span>
              </button>
            </div>
            <p class="field__error js-list-error" role="alert"></p>
          </fieldset>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.summarise"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root    = qs(container, '#view-supernet')
  const form    = qs(root, '#supernet-form')
  const list    = qs(root, '.js-rows')
  const listErr = qs(root, '.js-list-error')
  const results = qs(root, '.tool-panel__results')
  const body    = qs(root, '.js-result-body')

  let lastResult: SupernetResult | null = null
  let superInfo: SubnetInfo | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  let errorVisible = false

  // ── Row editor ──────────────────────────────────────────────────

  const rowMarkup = (cidr: string): string => `
    <div class="supernet-row">
      <input class="field__input js-row-cidr" type="text" autocomplete="off" spellcheck="false"
             placeholder="192.168.0.0/24" value="${escapeHtml(cidr)}">
      <button type="button" class="btn btn--ghost js-row-remove"
              data-i18n-aria="action.removeRow" data-i18n-title="action.removeRow">
        ${IconCross}
      </button>
    </div>`

  const labelRows = (): void => {
    for (const input of qsa<HTMLInputElement>(list, '.js-row-cidr')) {
      input.setAttribute('aria-label', t('field.cidr'))
      input.classList.remove('has-error')
    }
  }

  const renderRows = (cidrs: string[]): void => {
    list.innerHTML = cidrs.map(rowMarkup).join('')
    labelRows()
  }

  const readRows = (): string[] =>
    qsa<HTMLInputElement>(list, '.js-row-cidr').map(input => input.value)

  const filledRows = (): string[] => readRows().map(value => value.trim()).filter(value => value !== '')

  const syncRows = (): void => patchTool('supernet', { cidrs: readRows() })

  const seedRows = (): void => {
    if (qsa(list, '.supernet-row').length === 0) {
      renderRows(Array.from({ length: BLANK_ROWS }, () => ''))
    }
  }

  list.addEventListener('input', event => {
    if ((event.target as HTMLElement).closest('.supernet-row')) syncRows()
  })

  list.addEventListener('click', event => {
    const remove = (event.target as HTMLElement).closest<HTMLElement>('.js-row-remove')
    if (!remove) return
    const rows = readRows()
    const index = qsa(list, '.supernet-row').indexOf(remove.closest('.supernet-row') as HTMLElement)
    if (index >= 0) rows.splice(index, 1)
    renderRows(rows)
    syncRows()
    if (rows.length === 0) seedRows()
  })

  qs<HTMLButtonElement>(root, '.js-add-row').addEventListener('click', () => {
    const rows = readRows()
    rows.push('')
    renderRows(rows)
    syncRows()
    const inputs = qsa<HTMLInputElement>(list, '.js-row-cidr')
    inputs[inputs.length - 1]?.focus()
  })

  // ── Calculation ─────────────────────────────────────────────────

  const showListError = (key: string, suggestion: string | null, row = -1): void => {
    lastError = { key, suggestion }
    errorVisible = true
    setFieldError(listErr, t(key, suggestion ?? ''))
    if (row >= 0) qsa(list, '.js-row-cidr')[row]?.classList.add('has-error')
  }

  const clearListError = (): void => {
    lastError = null
    errorVisible = false
    setFieldError(listErr, null)
    labelRows()
  }

  const showEmpty = (): void => {
    clear(body)
    body.appendChild(emptyState('empty.supernet'))
  }

  const render = (): void => {
    clear(body)

    if (!lastResult || !superInfo) {
      body.appendChild(emptyState('empty.supernet'))
      cisco.refresh()
      return
    }

    body.appendChild(subnetSection(t('supernet.resultHeading'), superInfo))
    body.appendChild(
      lastResult.isPure
        ? alertBlock('success', t('supernet.pure'))
        : alertBlock('warning', t('supernet.impure')),
    )

    body.appendChild(
      html(`<h2 class="result-section__subheading">${escapeHtml(t('supernet.inputsHeading'))}</h2>`),
    )
    body.appendChild(subnetListTable(lastResult.inputNetworks, false))

    if (!lastResult.isPure && lastResult.extraAddresses.length > 0) {
      body.appendChild(
        html(`<h2 class="result-section__subheading">${escapeHtml(t('supernet.extraHeading'))}</h2>`),
      )
      const chipRow = html('<div class="chip-row"></div>')
      for (const cidr of lastResult.extraAddresses.slice(0, MAX_LISTED_EXTRAS)) {
        chipRow.insertAdjacentHTML('beforeend', `<span class="chip mono">${escapeHtml(cidr)}</span>`)
      }
      const hidden = lastResult.extraAddresses.length - MAX_LISTED_EXTRAS
      if (hidden > 0) {
        chipRow.insertAdjacentHTML(
          'beforeend',
          `<span class="chip">${escapeHtml(t('supernet.extraMore', hidden))}</span>`,
        )
      }
      body.appendChild(chipRow)
    }

    cisco.refresh()
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const fail = (key: string, suggestion: string | null, row = -1): void => {
      lastResult = null
      superInfo = null
      if (silent) {
        lastError = { key, suggestion }
        errorVisible = false
        setFieldError(listErr, null)
      } else {
        showListError(key, suggestion, row)
      }
      showEmpty()
      cisco.refresh()
    }

    const cidrs = filledRows()
    if (cidrs.length < 2) return fail('error.supernet_min_entries', null)

    for (let i = 0; i < cidrs.length; i++) {
      const validation = validateIpCidr(cidrs[i] ?? '')
      if (!validation.ok) {
        return fail(validation.errorKey, validation.suggestion ?? null, i)
      }
    }

    const result = summarise(cidrs)
    if (isValidationFailure(result)) return fail(result.errorKey, result.suggestion ?? null)

    const info = calcSubnet(result.supernet)
    superInfo = isValidationFailure(info) ? null : info
    lastResult = result
    clearListError()
    render()
  }

  const cisco: CiscoHandle = mountCisco(results, 'supernet', () =>
    superInfo ? snippet(routeHint(), [summaryRoute(superInfo)]) : null,
  )

  form.addEventListener('submit', event => {
    event.preventDefault()
    syncRows()
    calculate()
  })

  seedRows()
  calculate({ silent: true })

  return {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(listErr, t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(listErr, null)
      }
      labelRows()
      render()
    },
    hydrate(state: AppState) {
      renderRows(state.tools.supernet.cidrs)
      seedRows()
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['cidr']]
      for (const cidr of filledRows()) rows.push([cidr])
      return rows
    },
    csvHeader: ['cidr'],
    importCsv(rows) {
      if (rows.length < 2) return t('error.supernet_min_entries')

      const parsed: string[] = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] ?? []
        if (row.length !== 1) {
          return csvError(i + 1, 1, t('csv.error.columnCount', 1, row.length))
        }
        const cidr = (row[0] ?? '').trim()
        if (cidr === '') return csvError(i + 1, 1, t('csv.error.required'))

        const validation = validateIpCidr(cidr)
        if (!validation.ok) {
          return csvError(i + 1, 1, t(validation.errorKey, validation.suggestion ?? ''))
        }
        parsed.push(cidr)
      }

      renderRows(parsed)
      syncRows()
      calculate()
      return null
    },
  }
}
