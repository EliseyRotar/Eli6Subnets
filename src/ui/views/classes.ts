/**
 * Classes view: the historical A–E addressing classes as an address-space
 * donut with a clickable legend and per-class drill-down. The reference
 * implementation lives in network_planner.html (#classes).
 */

import { donutOption } from '../../charts/builders'
import { renderChart, seriesColor } from '../../charts/index'
import { formatNumber, t } from '../../i18n'
import { clear, escapeHtml, html, qs } from '../dom'
import type { ViewHandle } from './types'

type ClassId = 'A' | 'B' | 'C' | 'D' | 'E'

interface ClassSub {
  kind: 'public' | 'private' | 'loopback'
  cidr?: string
  range: string
  count: number
}

interface ClassDef {
  id: ClassId
  /** Share of the whole IPv4 space, in percent (wedge area). */
  share: number
  fullRange: string
  mask: string | null
  privateCidr: string | null
  useKey: string
  subs: ClassSub[] | null
}

const TOTAL_IPV4 = 4294967296

const CLASS_DEFS: ClassDef[] = [
  {
    id: 'A', share: 50,
    fullRange: '0.0.0.0 – 127.255.255.255',
    mask: '255.0.0.0 (/8)', privateCidr: '10.0.0.0/8',
    useKey: 'classes.use.A',
    subs: [
      { kind: 'public', range: '1.0.0.0 – 9.255.255.255, 11.0.0.0 – 126.255.255.255', count: 2113929216 },
      { kind: 'private', cidr: '10.0.0.0/8', range: '10.0.0.0 – 10.255.255.255', count: 16777216 },
      { kind: 'loopback', cidr: '127.0.0.0/8', range: '127.0.0.0 – 127.255.255.255', count: 16777216 },
    ],
  },
  {
    id: 'B', share: 25,
    fullRange: '128.0.0.0 – 191.255.255.255',
    mask: '255.255.0.0 (/16)', privateCidr: '172.16.0.0/12',
    useKey: 'classes.use.B',
    subs: [
      { kind: 'public', range: '128.0.0.0 – 172.15.255.255, 172.32.0.0 – 191.255.255.255', count: 1072693248 },
      { kind: 'private', cidr: '172.16.0.0/12', range: '172.16.0.0 – 172.31.255.255', count: 1048576 },
    ],
  },
  {
    id: 'C', share: 12.5,
    fullRange: '192.0.0.0 – 223.255.255.255',
    mask: '255.255.255.0 (/24)', privateCidr: '192.168.0.0/16',
    useKey: 'classes.use.C',
    subs: [
      { kind: 'public', range: '192.0.0.0 – 192.167.255.255, 192.169.0.0 – 223.255.255.255', count: 536805376 },
      { kind: 'private', cidr: '192.168.0.0/16', range: '192.168.0.0 – 192.168.255.255', count: 65536 },
    ],
  },
  {
    id: 'D', share: 6.25,
    fullRange: '224.0.0.0 – 239.255.255.255',
    mask: null, privateCidr: null,
    useKey: 'classes.use.D',
    subs: null,
  },
  {
    id: 'E', share: 6.25,
    fullRange: '240.0.0.0 – 255.255.255.255',
    mask: null, privateCidr: null,
    useKey: 'classes.use.E',
    subs: null,
  },
]

const SUB_KEYS: Record<ClassSub['kind'], string> = {
  public:   'classes.sub.public',
  private:  'classes.sub.private',
  loopback: 'classes.sub.loopback',
}

function detailField(label: string, value: string): string {
  return `<div class="classes-detail__field">
    <dt>${escapeHtml(label)}</dt>
    <dd class="mono">${escapeHtml(value)}</dd>
  </div>`
}

export function mountClasses(container: HTMLElement): ViewHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel tool-panel--wide" id="view-classes" aria-labelledby="nav-classes">
      <div class="view-classes">
        <div class="card">
          <p class="view-intro" data-i18n-key="classes.intro"></p>
        </div>
        <div class="dash__charts">
          <section class="card chart-card">
            <h3 class="card__title" data-i18n-key="classes.chartTitle"></h3>
            <div class="chart js-classes-chart"></div>
            <p class="result-note" data-i18n-key="classes.note"></p>
          </section>
          <div class="card classes-legend js-classes-legend"></div>
        </div>
        <div class="js-classes-detail"></div>
      </div>
    </section>`,
  )

  const root       = qs(container, '#view-classes')
  const chartHost  = qs(root, '.js-classes-chart')
  const legendHost = qs(root, '.js-classes-legend')
  const detailHost = qs(root, '.js-classes-detail')

  let selected: ClassId | null = null

  const buildChart = (): ReturnType<typeof donutOption> => donutOption(
    CLASS_DEFS.map(def => ({ name: `${t('kpi.class')} ${def.id}`, value: def.share })),
    formatNumber(TOTAL_IPV4),
    t('classes.total'),
  )

  const renderLegend = (): void => {
    clear(legendHost)
    CLASS_DEFS.forEach((def, index) => {
      const name = `${t('kpi.class')} ${def.id}`
      const meta = `${def.fullRange} · ${formatNumber(def.share)}%`
      const button = html(`
        <button type="button" class="legend-row" data-class="${def.id}"
                aria-pressed="${selected === def.id}">
          <span class="legend-row__swatch" style="background:${seriesColor(index)}"></span>
          <span class="legend-row__text">
            <span class="legend-row__name">${escapeHtml(name)}</span>
            <span class="legend-row__meta mono">${escapeHtml(meta)}</span>
          </span>
        </button>`)
      button.addEventListener('click', () => {
        selected = def.id
        renderLegend()
        renderDetail()
      })
      legendHost.appendChild(button)
    })
  }

  const renderDetail = (): void => {
    clear(detailHost)
    if (!selected) return
    const def = CLASS_DEFS.find(item => item.id === selected)
    if (!def) return

    let fields = detailField(t('kpi.range'), def.fullRange)
    if (def.mask) fields += detailField(t('classes.defaultMask'), def.mask)
    if (def.privateCidr) fields += detailField(t('classes.privatePrefix'), def.privateCidr)
    fields += detailField(t('classes.purpose'), t(def.useKey))

    let breakdown = ''
    if (def.subs) {
      const rows = def.subs.map(sub => {
        const label = sub.cidr
          ? `${t(SUB_KEYS[sub.kind])} — ${sub.cidr}`
          : t(SUB_KEYS[sub.kind])
        const count = `${formatNumber(sub.count)} ${t('classes.addresses')}`
        return `<div class="classes-sub">
          <span class="classes-sub__label">${escapeHtml(label)}</span>
          <span class="classes-sub__range mono">${escapeHtml(sub.range)}</span>
          <span class="classes-sub__count mono">${escapeHtml(count)}</span>
        </div>`
      }).join('')
      breakdown = `
        <h4 class="classes-detail__subhead">${escapeHtml(t('classes.breakdown'))}</h4>
        <div class="classes-sub-list">${rows}</div>`
    }

    const card = html(`
      <section class="card classes-detail">
        <div class="classes-detail__head">
          <h3 class="view-subheading">${escapeHtml(`${t('kpi.class')} ${def.id}`)}</h3>
          <button type="button" class="btn btn--ghost btn--sm js-classes-back"></button>
        </div>
        <dl class="classes-detail__fields">${fields}</dl>
        ${breakdown}
      </section>`)
    const back = qs<HTMLElement>(card, '.js-classes-back')
    back.textContent = `← ${t('classes.back')}`
    back.addEventListener('click', () => {
      selected = null
      renderLegend()
      renderDetail()
    })
    detailHost.appendChild(card)
  }

  const render = (): void => {
    renderChart(chartHost, buildChart)
    renderLegend()
    renderDetail()
  }

  render()

  return { root, refresh: render }
}
