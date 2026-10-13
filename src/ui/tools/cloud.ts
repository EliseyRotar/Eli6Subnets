/**
 * Cloud tool panel: reserved addresses for AWS VPC subnets and Azure
 * subnets (FR-06).
 */

import { calcCloud, type CloudProvider, type CloudResult } from '../../calc/cloud'
import { isValidationFailure } from '../../calc/ip'
import { formatNumber, t } from '../../i18n'
import type { AppState } from '../../state/persist'
import { patchTool } from '../../state/store'
import { clear, qs, setFieldError } from '../dom'
import { kpiRow } from '../kpi'
import { alertBlock, emptyState, simpleTable } from '../subnetView'
import type { ToolPanel } from './types'

export function mountCloud(container: HTMLElement): ToolPanel {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel" id="view-cloud" aria-labelledby="nav-cloud">
      <div class="tool-panel__input">
        <form class="tool-form" id="cloud-form" novalidate>
          <div class="field">
            <label class="field__label" for="cloud-cidr" data-i18n-key="field.cidr"></label>
            <input class="field__input" id="cloud-cidr" type="text" autocomplete="off"
                   spellcheck="false" placeholder="10.0.1.0/24">
            <p class="field__error" id="cloud-error" role="alert"></p>
          </div>
          <div class="field">
            <label class="field__label" for="cloud-provider" data-i18n-key="field.provider"></label>
            <select class="field__input" id="cloud-provider">
              <option value="aws" data-i18n-key="cloud.provider.aws"></option>
              <option value="azure" data-i18n-key="cloud.provider.azure"></option>
            </select>
          </div>
          <button type="submit" class="btn btn--primary" data-i18n-key="action.calculate"></button>
        </form>
      </div>
      <div class="tool-panel__results" role="region" data-i18n-aria="label.results">
        <div class="js-result-body"></div>
      </div>
    </section>`,
  )

  const root     = qs(container, '#view-cloud')
  const form     = qs(root, '#cloud-form')
  const input    = qs<HTMLInputElement>(root, '#cloud-cidr')
  const provider = qs<HTMLSelectElement>(root, '#cloud-provider')
  const error    = qs(root, '#cloud-error')
  const body     = qs(root, '.js-result-body')

  let lastResult: CloudResult | null = null
  let lastError: { key: string; suggestion: string | null } | null = null
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

  const render = (): void => {
    clear(body)
    if (!lastResult) {
      body.appendChild(emptyState('empty.cloud'))
      return
    }

    const providerName = lastResult.provider === 'aws'
      ? t('cloud.provider.aws')
      : t('cloud.provider.azure')

    body.appendChild(
      kpiRow([
        { label: t('label.totalAddresses'), value: formatNumber(lastResult.totalAddresses) },
        { label: t('kpi.reservedAddresses'), value: formatNumber(lastResult.reservedCount) },
        { label: t('kpi.usableHosts'), value: formatNumber(lastResult.usableHosts) },
        { label: t('kpi.prefix'), value: `${providerName} /${lastResult.prefix}` },
      ]),
    )

    if (!lastResult.prefixOk) {
      body.appendChild(
        alertBlock(
          'warning',
          t('cloud.prefixWarn', lastResult.prefix, providerName, lastResult.maxPrefix),
        ),
      )
    }

    body.appendChild(
      simpleTable(
        [t('label.address'), t('label.role')],
        lastResult.rows.map(row => [row.address, t(row.roleKey)]),
      ),
    )

    body.appendChild(
      simpleTable(
        [t('label.firstHost'), t('label.lastHost')],
        [[
          lastResult.firstUsable ?? '—',
          lastResult.lastUsable ?? '—',
        ]],
      ),
    )
  }

  const calculate = (options?: { silent?: boolean }): void => {
    const silent = options?.silent ?? false
    const value = input.value.trim()
    const selected = provider.value === 'azure' ? 'azure' : 'aws'

    if (value === '') {
      lastResult = null
      if (silent) {
        lastError = { key: 'error.empty', suggestion: null }
        errorVisible = false
        setFieldError(error, null)
      } else {
        showError('error.empty', null)
      }
      render()
      return
    }

    const result = calcCloud(value, selected as CloudProvider)
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
    patchTool('cloud', { cidr: input.value, provider: provider.value === 'azure' ? 'azure' : 'aws' })
    calculate()
  })
  input.addEventListener('input', () => patchTool('cloud', { cidr: input.value }))
  provider.addEventListener('change', () => {
    patchTool('cloud', { provider: provider.value === 'azure' ? 'azure' : 'aws' })
    calculate()
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
    },
    hydrate(state: AppState) {
      input.value = state.tools.cloud.cidr
      provider.value = state.tools.cloud.provider
      calculate({ silent: true })
    },
    exportCsv() {
      const rows: string[][] = [['cidr', 'provider']]
      const value = input.value.trim()
      if (value !== '') rows.push([value, provider.value])
      return rows
    },
    csvHeader: ['cidr', 'provider'],
    importCsv(rows) {
      const row = rows[0]
      if (!row || row.length !== 2) {
        return t('csv.error.row', 1, 2, t('csv.error.columnCount', 2, row?.length ?? 0))
      }
      if (rows.length > 1) return t('csv.error.extraRows', rows.length)
      const value = (row[0] ?? '').trim()
      const wanted = (row[1] ?? '').trim().toLowerCase()
      if (value === '') return t('csv.error.row', 1, 2, t('csv.error.required'))
      if (wanted !== 'aws' && wanted !== 'azure') {
        return t('csv.error.row', 1, 2, t('csv.error.invalid', wanted))
      }

      input.value = value
      provider.value = wanted
      patchTool('cloud', { cidr: value, provider: wanted === 'azure' ? 'azure' : 'aws' })
      calculate()
      return null
    },
  }

  calculate({ silent: true })
  return panel
}
