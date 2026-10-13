/**
 * Per-view dashboards: KPI row + charts composed from calculation results.
 *
 * Each builder returns a ready-to-append block; the chart host is wired to
 * the charts registry right away (the option factory re-runs on theme and
 * language changes, and on view activation when the panel becomes visible).
 */

import { donutOption, treemapOption, type DonutSlice, type MapNode } from '../charts/builders'
import { renderChart } from '../charts/index'
import type { SupernetResult } from '../calc/supernet'
import type { SplitResult } from '../calc/split'
import type { SubnetInfo } from '../calc/subnet'
import type { VlsmResult } from '../calc/vlsm'
import { formatNumber, t } from '../i18n'
import { escapeHtml, html } from './dom'
import { kpiRow, type KpiItem } from './kpi'

function dash(): HTMLElement {
  return html('<div class="dash"></div>')
}

/** Card with a title and a fixed-size chart host; the host is returned too. */
function chartCard(title: string): { card: HTMLElement; host: HTMLElement } {
  const card = html(`
    <section class="card chart-card">
      <h3 class="card__title">${escapeHtml(title)}</h3>
      <div class="chart"></div>
    </section>`)
  return { card, host: card.querySelector<HTMLElement>('.chart') as HTMLElement }
}

function appendCharts(
  root: HTMLElement,
  title: string,
  build: () => ReturnType<typeof donutOption>,
): void {
  const { card, host } = chartCard(title)
  root.appendChild(card)
  renderChart(host, build)
}

function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

/** Single subnet: usable/reserved donut over the four key figures. */
export function singleDashboard(info: SubnetInfo): HTMLElement {
  const reserved = info.totalAddresses - info.usableHosts

  const items: KpiItem[] = [
    { label: t('kpi.prefix'), value: `/${info.prefix}` },
    { label: t('kpi.usableHosts'), value: formatNumber(info.usableHosts) },
    { label: t('kpi.class'), value: t('flag.class', info.historicalClass) },
    {
      label: t('kpi.size'),
      value: formatNumber(info.totalAddresses),
      hint: `${info.firstHost} – ${info.lastHost}`,
    },
  ]

  const slices: DonutSlice[] = [{ name: t('kpi.usableHosts'), value: info.usableHosts }]
  if (reserved > 0) slices.push({ name: t('kpi.reservedAddresses'), value: reserved, free: true })

  const root = dash()
  root.appendChild(kpiRow(items))
  appendCharts(root, t('chart.usableSplit'), () =>
    donutOption(slices, formatNumber(info.usableHosts), t('kpi.usableHosts')),
  )
  return root
}

/** VLSM: allocation usage inside the base network plus the subnet map. */
export function vlsmDashboard(base: SubnetInfo, result: VlsmResult): HTMLElement {
  const used = result.allocations.reduce((sum, a) => sum + a.subnet.totalAddresses, 0)
  const usable = result.allocations.reduce((sum, a) => sum + a.subnet.usableHosts, 0)
  const free = Math.max(0, base.totalAddresses - used)
  const requested = result.allocations.length + result.unallocated.length
  const usedPct = percentOf(used, base.totalAddresses)
  const efficiency = percentOf(usable, used)

  const items: KpiItem[] = [
    {
      label: t('kpi.subnets'),
      value: `${result.allocations.length}/${requested}`,
      hint: result.unallocated.length > 0
        ? t('kpi.unallocated', result.unallocated.length)
        : t('kpi.allAllocated'),
    },
    {
      label: t('kpi.usedAddresses'),
      value: formatNumber(used),
      hint: `${usedPct}% ${t('kpi.ofBase')}`,
      percent: usedPct,
    },
    {
      label: t('kpi.freeAddresses'),
      value: formatNumber(free),
      hint: `${percentOf(free, base.totalAddresses)}% ${t('kpi.ofBase')}`,
    },
    {
      label: t('kpi.efficiency'),
      value: `${efficiency}%`,
      hint: t('kpi.efficiencyHint'),
      percent: efficiency,
    },
  ]

  const slices: DonutSlice[] = result.allocations.map(allocation => ({
    name: `${allocation.request.name.trim() || allocation.cidr} — ${allocation.cidr}`,
    value: allocation.subnet.totalAddresses,
  }))
  if (free > 0) slices.push({ name: t('kpi.freeAddresses'), value: free, free: true })

  const mapNodes: MapNode[] = result.allocations.map(allocation => ({
    name: allocation.request.name.trim() || allocation.cidr,
    value: allocation.subnet.totalAddresses,
  }))
  if (free > 0) mapNodes.push({ name: t('kpi.freeAddresses'), value: free, free: true })

  const root = dash()
  root.appendChild(kpiRow(items))

  const charts = html('<div class="dash__charts"></div>')
  appendCharts(charts, t('chart.allocation'), () =>
    donutOption(slices, `${usedPct}%`, t('kpi.usedAddresses')),
  )
  appendCharts(charts, t('chart.map'), () => treemapOption(mapNodes))
  root.appendChild(charts)
  return root
}

/** Equal split: one slice per generated subnet inside the parent block. */
export function splitDashboard(base: SubnetInfo, result: SplitResult): HTMLElement {
  const used = result.subnets.reduce((sum, s) => sum + s.totalAddresses, 0)
  const usable = result.subnets.reduce((sum, s) => sum + s.usableHosts, 0)
  const free = Math.max(0, base.totalAddresses - used)
  const efficiency = percentOf(usable, used)
  const each = result.subnets[0]

  const items: KpiItem[] = [
    {
      label: t('kpi.subnets'),
      value: String(result.actualCount),
    },
    {
      label: t('kpi.childPrefix'),
      value: `/${result.subnetPrefix}`,
      hint: each ? `${formatNumber(each.totalAddresses)} ${t('kpi.eachSize')}` : undefined,
    },
    {
      label: t('kpi.usedAddresses'),
      value: formatNumber(used),
      hint: `${percentOf(used, base.totalAddresses)}% ${t('kpi.ofBase')}`,
      percent: percentOf(used, base.totalAddresses),
    },
    {
      label: t('kpi.efficiency'),
      value: `${efficiency}%`,
      hint: t('kpi.efficiencyHint'),
      percent: efficiency,
    },
  ]

  const slices: DonutSlice[] = result.subnets.map(subnet => ({
    name: `${subnet.networkAddress}/${subnet.prefix}`,
    value: subnet.totalAddresses,
  }))
  if (free > 0) slices.push({ name: t('kpi.freeAddresses'), value: free, free: true })

  const mapNodes: MapNode[] = result.subnets.map(subnet => ({
    name: `${subnet.networkAddress}/${subnet.prefix}`,
    value: subnet.totalAddresses,
  }))
  if (free > 0) mapNodes.push({ name: t('kpi.freeAddresses'), value: free, free: true })

  const root = dash()
  root.appendChild(kpiRow(items))

  const charts = html('<div class="dash__charts"></div>')
  appendCharts(charts, t('chart.allocation'), () =>
    donutOption(slices, String(result.actualCount), t('kpi.subnets')),
  )
  appendCharts(charts, t('chart.map'), () => treemapOption(mapNodes))
  root.appendChild(charts)
  return root
}

/** Supernetting: how much of the summary the inputs actually cover. */
export function supernetDashboard(summary: SubnetInfo, result: SupernetResult): HTMLElement {
  const covered = result.inputNetworks.reduce((sum, n) => sum + n.totalAddresses, 0)
  const extra = Math.max(0, summary.totalAddresses - covered)
  const coverage = percentOf(covered, summary.totalAddresses)

  const items: KpiItem[] = [
    { label: t('kpi.networks'), value: String(result.inputNetworks.length) },
    {
      label: t('kpi.summaryPrefix'),
      value: `/${summary.prefix}`,
      hint: summary.networkAddress,
    },
    {
      label: t('kpi.coverage'),
      value: `${coverage}%`,
      hint: `${formatNumber(covered)} / ${formatNumber(summary.totalAddresses)}`,
      percent: coverage,
    },
    {
      label: t('kpi.extraAddresses'),
      value: String(result.extraAddresses.length),
      hint: result.extraAddresses.length > 0 ? t('kpi.extraHint') : undefined,
    },
  ]

  const slices: DonutSlice[] = result.inputNetworks.map(network => ({
    name: `${network.networkAddress}/${network.prefix}`,
    value: network.totalAddresses,
  }))
  if (extra > 0) slices.push({ name: t('kpi.extraAddresses'), value: extra, free: true })

  const mapNodes: MapNode[] = result.inputNetworks.map(network => ({
    name: `${network.networkAddress}/${network.prefix}`,
    value: network.totalAddresses,
  }))
  if (extra > 0) mapNodes.push({ name: t('kpi.extraAddresses'), value: extra, free: true })

  const root = dash()
  root.appendChild(kpiRow(items))

  const charts = html('<div class="dash__charts"></div>')
  appendCharts(charts, t('chart.allocation'), () =>
    donutOption(slices, `${coverage}%`, t('kpi.coverage')),
  )
  appendCharts(charts, t('chart.map'), () => treemapOption(mapNodes))
  root.appendChild(charts)
  return root
}
