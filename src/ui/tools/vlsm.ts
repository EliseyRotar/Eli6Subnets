/**
 * VLSM tool panel (FR-02 / T-15).
 *
 * The request list is a dynamic row editor; rows are re-read from the DOM
 * on every change so the store and the visible inputs cannot drift apart.
 */

import { isValidationFailure, validateIpCidr } from '../../calc/ip'
import { allocateVlsm, type VlsmResult, type VlsmRequest } from '../../calc/vlsm'
import { calcSubnet, type SubnetInfo } from '../../calc/subnet'
import { t } from '../../i18n'
import type { AppState, VlsmRow } from '../../state/persist'
import { patchTool } from '../../state/store'
import {
  interfaceBlock,
  interfaceHint,
  mountCisco,
  routeHint,
  snippet,
  summaryRoute,
  type CiscoHandle,
} from '../cisco'
import { clear, escapeHtml, html, qs, qsa, setFieldError } from '../dom'
import { IconCross, IconPlus } from '../icons'
import { alertBlock, emptyState, subnetSection } from '../subnetView'
import { csvError, type ToolPanel } from './types'

const BLANK_ROWS = 2

export function mountVlsm(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="panel-vlsm" role="tabpanel" aria-labelledby="tab-vlsm">
      <div class="tool-panel__input">
        <form class="tool-form" id="vlsm-form" novalidate>
          <div class="field">
            <label class="field__label" for="vlsm-base" data-i18n-key="field.baseCidr"></label>
            <input class="field__input" id="vlsm-base" type="text" autocomplete="off"
                   spellcheck="false" placeholder="10.0.0.0/16">
            <p class="field__error" id="vlsm-base-error" role="alert"></p>
          </div>
          <fieldset class="tool-fieldset">
            <legend class="field__label" data-i18n-key="field.requests"></legend>
            <div class="request-list js-rows"></div>
            <div class="form-toolbar">
              <button type="button" class="btn btn--secondary btn--sm js-add-row">
                ${IconPlus}<span data-i18n-key="action.addRow"></span>
              </button>
            </div>
          </fieldset>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.allocate"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root      = qs(container, '#panel-vlsm')
  const form      = qs(root, '#vlsm-form')
  const baseInput = qs<HTMLInputElement>(root, '#vlsm-base')
  const baseError = qs(root, '#vlsm-base-error')
  const list      = qs(root, '.js-rows')
  const results   = qs(root, '.tool-panel__results')
  const body      = qs(root, '.js-result-body')

  let lastResult: VlsmResult | null = null
  let baseInfo: SubnetInfo | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  let errorVisible = false

  // ── Row editor ──────────────────────────────────────────────────

  const rowMarkup = (row: VlsmRow): string => `
    <div class="request-row">
      <input class="field__input js-row-name" type="text" autocomplete="off" spellcheck="false"
             placeholder="VLAN10" value="${row.name.replace(/"/g, '&quot;')}">
      <input class="field__input js-row-hosts" type="number" min="1" step="1"
             placeholder="50" value="${row.hosts.replace(/"/g, '&quot;')}">
      <button type="button" class="btn btn--ghost js-row-remove"
              data-i18n-aria="action.removeRow" data-i18n-title="action.removeRow">
        ${IconCross}
      </button>
    </div>`

  const labelRows = (): void => {
    for (const row of qsa(list, '.request-row')) {
      qs<HTMLInputElement>(row, '.js-row-name').setAttribute('aria-label', t('field.name'))
      qs<HTMLInputElement>(row, '.js-row-hosts').setAttribute('aria-label', t('field.requiredHosts'))
    }
  }

  const renderRows = (rows: VlsmRow[]): void => {
    list.innerHTML = rows.map(rowMarkup).join('')
    labelRows()
  }

  const readRows = (): VlsmRow[] =>
    qsa(list, '.request-row').map(row => ({
      name:  qs<HTMLInputElement>(row, '.js-row-name').value,
      hosts: qs<HTMLInputElement>(row, '.js-row-hosts').value,
    }))

  const filledRows = (): VlsmRow[] =>
    readRows().filter(row => row.name.trim() !== '' || row.hosts.trim() !== '')

  const syncRows = (): void => patchTool('vlsm', { requests: readRows() })

  const seedRows = (): void => {
    if (qsa(list, '.request-row').length === 0) {
      renderRows(Array.from({ length: BLANK_ROWS }, () => ({ name: '', hosts: '' })))
    }
  }

  list.addEventListener('input', event => {
    if ((event.target as HTMLElement).closest('.request-row')) syncRows()
  })

  list.addEventListener('click', event => {
    const remove = (event.target as HTMLElement).closest<HTMLElement>('.js-row-remove')
    if (!remove) return
    const rows = readRows()
    const index = qsa(list, '.request-row').indexOf(remove.closest('.request-row') as HTMLElement)
    if (index >= 0) rows.splice(index, 1)
    renderRows(rows)
    syncRows()
    if (rows.length === 0) seedRows()
  })

  qs<HTMLButtonElement>(root, '.js-add-row').addEventListener('click', () => {
    const rows = readRows()
    rows.push({ name: '', hosts: '' })
    renderRows(rows)
    syncRows()
    const inputs = qsa<HTMLInputElement>(list, '.js-row-name')
    inputs[inputs.length - 1]?.focus()
  })

  // ── Calculation ─────────────────────────────────────────────────

  const showError = (key: string, suggestion: string | null, target: HTMLElement): void => {
    lastError = { key, suggestion }
    errorVisible = true
    setFieldError(target, t(key, suggestion ?? ''))
  }

  const showEmpty = (): void => {
    clear(body)
    body.appendChild(emptyState('empty.vlsm'))
  }

  const render = (): void => {
    clear(body)

    if (!lastResult) {
      body.appendChild(emptyState('empty.vlsm'))
      cisco.refresh()
      return
    }

    if (lastResult.allocations.length > 0) {
      body.appendChild(
        html(`<h2 class="result-section__subheading">${escapeHtml(t('vlsm.resultHeading'))}</h2>`),
      )

      for (const allocation of lastResult.allocations) {
        const heading = allocation.request.name.trim() === ''
          ? allocation.cidr
          : `${allocation.request.name} — ${allocation.cidr}`
        body.appendChild(subnetSection(heading, allocation.subnet))
      }
    }

    if (lastResult.unallocated.length > 0) {
      const names = lastResult.unallocated
        .map(request => request.name.trim() === '' ? String(request.requiredHosts) : request.name)
        .join(', ')
      const messages = [t('vlsm.unallocated', names)]
      if (lastResult.minBasePrefixNeeded !== null) {
        messages.push(t('vlsm.minPrefixNeeded', lastResult.minBasePrefixNeeded))
      }
      body.appendChild(alertBlock('warning', messages.join(' ')))
    }

    cisco.refresh()
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const base = baseInput.value.trim()

    const fail = (key: string, suggestion: string | null): void => {
      lastResult = null
      baseInfo = null
      if (silent) {
        lastError = { key, suggestion }
        errorVisible = false
        setFieldError(baseError, null)
      } else {
        showError(key, suggestion, baseError)
      }
      showEmpty()
      cisco.refresh()
    }

    if (base === '') return fail('error.empty', null)

    const baseValidation = validateIpCidr(base)
    if (!baseValidation.ok) {
      return fail(baseValidation.errorKey, baseValidation.suggestion ?? null)
    }

    const rows = filledRows()
    if (rows.length === 0) return fail('error.vlsm_empty', null)

    const requests: VlsmRequest[] = []
    for (const row of rows) {
      const hosts = Number(row.hosts)
      if (!Number.isInteger(hosts) || hosts <= 0) return fail('error.host_count_invalid', null)
      requests.push({ name: row.name.trim(), requiredHosts: hosts })
    }

    const result = allocateVlsm(base, requests)
    if (isValidationFailure(result)) {
      return fail(result.errorKey, result.suggestion ?? null)
    }

    const info = calcSubnet(base)
    baseInfo = isValidationFailure(info) ? null : info
    lastResult = result
    lastError = null
    errorVisible = false
    setFieldError(baseError, null)
    render()
  }

  const cisco: CiscoHandle = mountCisco(results, 'vlsm', () => {
    if (!lastResult || lastResult.allocations.length === 0) return null
    const lines = [
      interfaceHint(),
      ...lastResult.allocations.map(allocation => interfaceBlock(allocation.subnet)),
    ]
    if (baseInfo) lines.push('', routeHint(), summaryRoute(baseInfo))
    return lines.join('\n')
  })

  form.addEventListener('submit', event => {
    event.preventDefault()
    syncRows()
    calculate()
  })

  baseInput.addEventListener('input', () => {
    patchTool('vlsm', { baseCidr: baseInput.value })
  })

  seedRows()
  calculate({ silent: true })

  return {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(baseError, t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(baseError, null)
      }
      labelRows()
      render()
    },
    hydrate(state: AppState) {
      baseInput.value = state.tools.vlsm.baseCidr
      renderRows(state.tools.vlsm.requests)
      seedRows()
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['name', 'requiredHosts']]
      for (const row of filledRows()) rows.push([row.name, row.hosts])
      return rows
    },
    csvHeader: ['name', 'requiredHosts'],
    importCsv(rows) {
      if (rows.length === 0) return t('import.csvEmpty')

      const parsed: VlsmRow[] = []
      const names = new Set<string>()

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] ?? []
        if (row.length !== 2) {
          return csvError(i + 1, 1, t('csv.error.columnCount', 2, row.length))
        }
        const name = (row[0] ?? '').trim()
        const hostsRaw = (row[1] ?? '').trim()

        if (name === '') return csvError(i + 1, 1, t('csv.error.required'))
        if (hostsRaw === '') return csvError(i + 1, 2, t('csv.error.required'))

        const hosts = Number(hostsRaw)
        if (!Number.isInteger(hosts) || hosts <= 0) {
          return csvError(i + 1, 2, t('csv.error.hostCount', hostsRaw))
        }
        if (names.has(name)) return csvError(i + 1, 1, t('csv.error.duplicateName', name))

        names.add(name)
        parsed.push({ name, hosts: hostsRaw })
      }

      renderRows(parsed)
      syncRows()
      calculate()
      return null
    },
  }
}
