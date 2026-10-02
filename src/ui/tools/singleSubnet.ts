/**
 * Single subnet tool panel (FR-01 / T-14).
 */

import { isValidationFailure, validateIpCidr } from '../../calc/ip'
import { calcSubnet, type SubnetInfo } from '../../calc/subnet'
import { t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { interfaceBlock, interfaceHint, mountCisco, snippet, type CiscoHandle } from '../cisco'
import { clear, qs, setFieldError } from '../dom'
import { emptyState, subnetSection } from '../subnetView'
import type { ToolPanel } from './types'

export function mountSingleSubnet(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-single" aria-labelledby="nav-single">
      <div class="tool-panel__input">
        <form class="tool-form" id="single-form" novalidate>
          <div class="field">
            <label class="field__label" for="single-cidr" data-i18n-key="field.cidr"></label>
            <input class="field__input" id="single-cidr" type="text" autocomplete="off"
                   spellcheck="false" placeholder="192.168.1.0/24">
            <p class="field__error" id="single-error" role="alert"></p>
          </div>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.calculate"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root    = qs(container, '#view-single')
  const form    = qs(root, '#single-form')
  const input   = qs<HTMLInputElement>(root, '#single-cidr')
  const error   = qs(root, '#single-error')
  const results = qs(root, '.tool-panel__results')
  const body    = qs(root, '.js-result-body')

  let lastInfo: SubnetInfo | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
  /** Whether the inline error is currently shown (silent runs suppress it). */
  let errorVisible = false

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

  const showEmpty = (): void => {
    clear(body)
    body.appendChild(emptyState('empty.single'))
  }

  const render = (): void => {
    clear(body)
    if (lastInfo) {
      body.appendChild(subnetSection(null, lastInfo))
    } else {
      body.appendChild(emptyState('empty.single'))
    }
    cisco.refresh()
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const value = input.value.trim()

    if (value === '') {
      lastInfo = null
      if (silent) {
        lastError = { key: 'error.empty', suggestion: null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError('error.empty', null)
      }
      showEmpty()
      cisco.refresh()
      return
    }

    const result = calcSubnet(value)
    if (isValidationFailure(result)) {
      lastInfo = null
      if (silent) {
        lastError = { key: result.errorKey, suggestion: result.suggestion ?? null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError(result.errorKey, result.suggestion ?? null)
      }
      showEmpty()
      cisco.refresh()
      return
    }

    lastInfo = result
    hideError()
    render()
  }

  const cisco: CiscoHandle = mountCisco(results, 'single', () =>
    lastInfo ? snippet(interfaceHint(), [interfaceBlock(lastInfo)]) : null,
  )

  form.addEventListener('submit', event => {
    event.preventDefault()
    patchTool('single', { cidr: input.value })
    calculate()
  })

  input.addEventListener('input', () => {
    patchTool('single', { cidr: input.value })
  })

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
      cisco.refresh()
    },
    hydrate(state: AppState) {
      input.value = state.tools.single.cidr
      calculate({ silent: true })
    },
    exportCsv() {
      const value = input.value.trim()
      const rows: string[][] = [['cidr']]
      if (value !== '') rows.push([value])
      return rows
    },
    csvHeader: ['cidr'],
    importCsv(rows) {
      const row = rows[0]
      if (!row || row.length !== 1) {
        return t('csv.error.row', 1, 1, t('csv.error.columnCount', 1, row?.length ?? 0))
      }
      if (rows.length > 1) {
        return t('csv.error.extraRows', rows.length)
      }
      const value = (row[0] ?? '').trim()
      if (value === '') return t('csv.error.row', 1, 1, t('csv.error.required'))

      const validation = validateIpCidr(value)
      if (!validation.ok) {
        return t('csv.error.row', 1, 1, t(validation.errorKey, validation.suggestion ?? ''))
      }

      input.value = value
      patchTool('single', { cidr: value })
      calculate()
      return null
    },
  }

  calculate({ silent: true })
  return panel
}
