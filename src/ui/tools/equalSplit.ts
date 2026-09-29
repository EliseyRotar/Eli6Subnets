/**
 * Equal subdivision tool panel (FR-03 / T-16).
 */

import { isValidationFailure, validateIpCidr } from '../../calc/ip'
import { splitEqual, type SplitResult } from '../../calc/split'
import { calcSubnet, type SubnetInfo } from '../../calc/subnet'
import { t } from '../../i18n'
import type { AppState } from '../../state/persist'
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
import { clear, escapeHtml, html, qs, setFieldError } from '../dom'
import { emptyState, flagChips, subnetListTable } from '../subnetView'
import { csvError, type ToolPanel } from './types'

export function mountEqualSplit(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="panel-split" role="tabpanel" aria-labelledby="tab-split">
      <div class="tool-panel__input">
        <form class="tool-form" id="split-form" novalidate>
          <div class="field">
            <label class="field__label" for="split-cidr" data-i18n-key="field.baseCidr"></label>
            <input class="field__input" id="split-cidr" type="text" autocomplete="off"
                   spellcheck="false" placeholder="10.0.0.0/24">
            <p class="field__error" id="split-cidr-error" role="alert"></p>
          </div>
          <div class="field">
            <label class="field__label" for="split-count" data-i18n-key="field.count"></label>
            <input class="field__input" id="split-count" type="number" min="1" step="1"
                   placeholder="4">
            <p class="field__error" id="split-count-error" role="alert"></p>
          </div>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.split"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root       = qs(container, '#panel-split')
  const form       = qs(root, '#split-form')
  const cidrInput  = qs<HTMLInputElement>(root, '#split-cidr')
  const cidrError  = qs(root, '#split-cidr-error')
  const countInput = qs<HTMLInputElement>(root, '#split-count')
  const countError = qs(root, '#split-count-error')
  const results    = qs(root, '.tool-panel__results')
  const body       = qs(root, '.js-result-body')

  let lastResult: SplitResult | null = null
  let baseInfo: SubnetInfo | null = null
  let requestedCount = 0
  let lastError: { key: string; suggestion: string | null; field: 'cidr' | 'count' } | null = null
  let errorVisible = false

  const errorSlot = (field: 'cidr' | 'count'): HTMLElement =>
    field === 'cidr' ? cidrError : countError

  const showError = (field: 'cidr' | 'count', key: string, suggestion: string | null): void => {
    lastError = { key, suggestion, field }
    errorVisible = true
    setFieldError(errorSlot(field), t(key, suggestion ?? ''))
  }

  const clearErrors = (): void => {
    lastError = null
    errorVisible = false
    setFieldError(cidrError, null)
    setFieldError(countError, null)
  }

  const showEmpty = (): void => {
    clear(body)
    body.appendChild(emptyState('empty.split'))
  }

  const render = (): void => {
    clear(body)

    if (!lastResult) {
      body.appendChild(emptyState('empty.split'))
      cisco.refresh()
      return
    }

    if (lastResult.actualCount !== requestedCount) {
      body.appendChild(
        html(`<p class="result-note">${escapeHtml(
          t('split.rounded', requestedCount, lastResult.actualCount),
        )}</p>`),
      )
    }

    if (baseInfo) body.appendChild(flagChips(baseInfo))
    body.appendChild(subnetListTable(lastResult.subnets))
    cisco.refresh()
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const fail = (field: 'cidr' | 'count', key: string, suggestion: string | null): void => {
      lastResult = null
      baseInfo = null
      if (silent) {
        lastError = { key, suggestion, field }
        errorVisible = false
        setFieldError(errorSlot(field), null)
      } else {
        showError(field, key, suggestion)
      }
      showEmpty()
      cisco.refresh()
    }

    const base = cidrInput.value.trim()
    if (base === '') return fail('cidr', 'error.empty', null)

    const baseValidation = validateIpCidr(base)
    if (!baseValidation.ok) {
      return fail('cidr', baseValidation.errorKey, baseValidation.suggestion ?? null)
    }

    const countRaw = countInput.value.trim()
    if (countRaw === '') return fail('count', 'error.empty', null)

    const count = Number(countRaw)
    if (!Number.isInteger(count) || count <= 0) {
      return fail('count', 'error.split_count_invalid', null)
    }

    const result = splitEqual(base, count)
    if (isValidationFailure(result)) {
      return fail('count', result.errorKey, result.suggestion ?? null)
    }

    const info = calcSubnet(base)
    baseInfo = isValidationFailure(info) ? null : info
    lastResult = result
    requestedCount = count
    clearErrors()
    render()
  }

  const cisco: CiscoHandle = mountCisco(results, 'split', () => {
    if (!lastResult || !baseInfo) return null
    const lines = [
      interfaceHint(),
      ...lastResult.subnets.map(subnet => interfaceBlock(subnet)),
      '',
      routeHint(),
      summaryRoute(baseInfo),
    ]
    return lines.join('\n')
  })

  form.addEventListener('submit', event => {
    event.preventDefault()
    calculate()
  })

  cidrInput.addEventListener('input', () => patchTool('split', { cidr: cidrInput.value }))
  countInput.addEventListener('input', () => patchTool('split', { count: countInput.value }))

  calculate({ silent: true })

  return {
    root,
    calculate,
    refresh() {
      if (lastError && errorVisible) {
        setFieldError(errorSlot(lastError.field), t(lastError.key, lastError.suggestion ?? ''))
      } else {
        setFieldError(cidrError, null)
        setFieldError(countError, null)
      }
      render()
    },
    hydrate(state: AppState) {
      cidrInput.value = state.tools.split.cidr
      countInput.value = state.tools.split.count
      calculate({ silent: true })
    },
    exportCsv() {
      const cidr = cidrInput.value.trim()
      const count = countInput.value.trim()
      const rows: string[][] = [['cidr', 'count']]
      if (cidr !== '' || count !== '') rows.push([cidr, count])
      return rows
    },
    csvHeader: ['cidr', 'count'],
    importCsv(rows) {
      const row = rows[0]
      if (!row || row.length !== 2) {
        return csvError(1, 1, t('csv.error.columnCount', 2, row?.length ?? 0))
      }
      if (rows.length > 1) return t('csv.error.extraRows', rows.length)

      const cidr = (row[0] ?? '').trim()
      const countRaw = (row[1] ?? '').trim()

      if (cidr === '') return csvError(1, 1, t('csv.error.required'))
      const validation = validateIpCidr(cidr)
      if (!validation.ok) {
        return csvError(1, 1, t(validation.errorKey, validation.suggestion ?? ''))
      }

      if (countRaw === '') return csvError(1, 2, t('csv.error.required'))
      const count = Number(countRaw)
      if (!Number.isInteger(count) || count <= 0) {
        return csvError(1, 2, t('csv.error.hostCount', countRaw))
      }

      cidrInput.value = cidr
      countInput.value = countRaw
      patchTool('split', { cidr, count: countRaw })
      calculate()
      return null
    },
  }
}
