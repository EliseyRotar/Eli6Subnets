/**
 * Chart option builders — pure functions returning ECharts options so
 * every call site stays declarative and re-runs on theme/language change.
 */

import type { EChartsCoreOption } from 'echarts/core'
import { dimColor, mutedColor, seriesColor, surfaceColor, textColor } from './index'

export interface DonutSlice {
  name: string
  value: number
  /** Neutral colour for "free/unused" slices. */
  free?: boolean
}

/**
 * Address-space donut: one slice per block, optional neutral slice for the
 * remaining space, key figures in the middle, scrollable legend below.
 */
export function donutOption(
  slices: DonutSlice[],
  centerValue: string,
  centerLabel: string,
): EChartsCoreOption {
  const data = slices
    .filter(slice => slice.value > 0)
    .map((slice, index) => ({
      name: slice.name,
      value: slice.value,
      itemStyle: { color: slice.free ? dimColor() : seriesColor(index) },
    }))

  return {
    animationDuration: 300,
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    legend: {
      type: 'scroll',
      bottom: 0,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: mutedColor(), fontSize: 11 },
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '36%',
        style: {
          text: centerValue,
          fill: textColor(),
          font: '600 20px monospace',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '50%',
        style: {
          text: centerLabel,
          fill: mutedColor(),
          font: '11px sans-serif',
          textAlign: 'center',
        },
      },
    ],
    series: [
      {
        type: 'pie',
        radius: ['62%', '80%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { show: false },
        itemStyle: { borderColor: surfaceColor(), borderWidth: 2 },
        data,
      },
    ],
  }
}

export interface MapNode {
  name: string
  value: number
  free?: boolean
}

/**
 * Subnet map: proportional treemap of every block inside the parent
 * network — the visual counterpart of the result table below it.
 */
export function treemapOption(nodes: MapNode[]): EChartsCoreOption {
  const data = nodes
    .filter(node => node.value > 0)
    .map((node, index) => ({
      name: node.name,
      value: node.value,
      itemStyle: { color: node.free ? dimColor() : seriesColor(index) },
    }))

  return {
    animationDuration: 300,
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          fontSize: 11,
          color: '#ffffff',
        },
        itemStyle: {
          borderColor: surfaceColor(),
          borderWidth: 2,
          gapWidth: 2,
        },
        data,
      },
    ],
  }
}
