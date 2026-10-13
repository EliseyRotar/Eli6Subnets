/**
 * ECharts integration.
 *
 * A tiny registry: every view mounts a chart with an option factory, and
 * the factory is kept around so charts can be rebuilt when the theme, the
 * language or the layout change (dark/light palette is read from CSS
 * custom properties at render time, never baked in).
 *
 * Chart init is best-effort: in non-rendering environments (jsdom tests)
 * it fails silently and the view simply shows no chart.
 */

import * as echarts from 'echarts/core'
import { PieChart, TreemapChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'

echarts.use([PieChart, TreemapChart, TooltipComponent, LegendComponent, SVGRenderer])

type OptionFactory = () => EChartsCoreOption

const factories = new Map<HTMLElement, OptionFactory>()

/** Read a design token from the live CSS custom properties. */
export function cssVar(name: string): string {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function isLight(): boolean {
  return document.documentElement.dataset['theme'] === 'light'
}

/**
 * Deterministic slice palette: fans out from the teal accent through
 * cyan/blue so the secondary colour appears naturally in every chart.
 */
export function seriesColor(index: number): string {
  const hue = (172 + index * 26) % 360
  const lightness = isLight() ? 44 - (index % 3) * 7 : 58 - (index % 3) * 7
  return `hsl(${hue} 62% ${lightness}%)`
}

export function textColor(): string {
  return cssVar('--color-text')
}

export function mutedColor(): string {
  return cssVar('--color-text-muted')
}

export function surfaceColor(): string {
  return cssVar('--color-surface')
}

/** Colour for "remaining/free" slices: deliberately neutral. */
export function dimColor(): string {
  return cssVar('--color-border-strong')
}

/** Mount (or update) the chart living inside `host`. */
export function renderChart(host: HTMLElement, factory: OptionFactory): void {
  factories.set(host, factory)
  // Hidden hosts (inactive view, jsdom tests) have no size: skip until a
  // refresh runs while the container is actually visible.
  if (host.clientWidth === 0 || host.clientHeight === 0) return
  try {
    const chart: EChartsType = echarts.getInstanceByDom(host) ?? echarts.init(host, undefined, {
      renderer: 'svg',
    })
    chart.setOption(factory(), true)
  } catch {
    // No rendering engine available (tests): leave the container empty.
  }
}

/** Dispose the chart of a container that is about to be discarded. */
export function clearChart(host: HTMLElement): void {
  factories.delete(host)
  try {
    echarts.getInstanceByDom(host)?.dispose()
  } catch {
    // nothing to dispose
  }
}

/**
 * Rebuild every live chart: resize (views start hidden with width 0) and
 * re-apply the factory so colours and labels follow theme/language.
 */
export function refreshCharts(): void {
  for (const [host, factory] of factories) {
    if (!host.isConnected) {
      factories.delete(host)
      continue
    }
    try {
      const chart = echarts.getInstanceByDom(host)
      if (!chart) {
        renderChart(host, factory)
        continue
      }
      chart.resize()
      chart.setOption(factory(), true)
    } catch {
      // keep going: one broken chart must not break the others
    }
  }
}

let refreshPending = false

/** Coalesce chart rebuilds onto the next animation frame. */
export function scheduleRefresh(): void {
  if (refreshPending) return
  refreshPending = true
  const run = (): void => {
    refreshPending = false
    refreshCharts()
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run)
  else run()
}

if (typeof window !== 'undefined') {
  let resizePending = false
  window.addEventListener('resize', () => {
    if (resizePending) return
    resizePending = true
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        resizePending = false
        refreshCharts()
      })
    } else {
      resizePending = false
      refreshCharts()
    }
  })
}
