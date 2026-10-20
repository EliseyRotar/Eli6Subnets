/**
 * Topology view: a drag-and-drop network diagram editor on an SVG canvas
 * (FR-13).
 *
 * Nodes (router/switch/pc/server) are placed with pointer events, links are
 * created from the inspector and every change is committed to the
 * `topology` state slice, so the diagram survives reloads. The store is the
 * single source of truth: render() reads it, mutations patch it.
 */

import {
  TOPO_CANVAS,
  type AppState,
  type TopoLink,
  type TopoNode,
  type TopoNodeKind,
} from '../../state/persist'
import { applyTranslations, t } from '../../i18n'
import { getState, patchState } from '../../state/store'
import { clear, escapeHtml, html, qs } from '../dom'
import { emptyState } from '../subnetView'
import { showToast } from '../toast'
import type { ViewHandle } from './types'

const KIND_LABEL_KEYS: Record<TopoNodeKind, string> = {
  router: 'topology.kind.router',
  switch: 'topology.kind.switch',
  pc:     'topology.kind.pc',
  server: 'topology.kind.server',
}

const KIND_PREFIX: Record<TopoNodeKind, string> = {
  router: 'R',
  switch: 'SW',
  pc:     'PC',
  server: 'SRV',
}

const KIND_ORDER: TopoNodeKind[] = ['router', 'switch', 'pc', 'server']

/** Simple stroke glyphs drawn around the node origin (circle r = 26). */
const GLYPHS: Record<TopoNodeKind, string> = {
  router: '<rect x="-14" y="-8" width="28" height="16" rx="4"/>'
    + '<path d="M-9 -2.5H5M2.5-5.5 5.5-2.5 2.5 0.5"/>'
    + '<path d="M9 2.5H-5M-2.5-0.5-5.5 2.5-2.5 5.5"/>',
  switch: '<rect x="-14" y="-8" width="28" height="16" rx="3"/>'
    + '<path d="M-8 8v4M-3 8v4M3 8v4M8 8v4"/>',
  pc:     '<rect x="-11" y="-10" width="22" height="15" rx="2"/>'
    + '<path d="M0 5v4M-6 9h12"/>',
  server: '<rect x="-10" y="-12" width="20" height="9" rx="2"/>'
    + '<rect x="-10" y="-1" width="20" height="9" rx="2"/>'
    + '<circle cx="6" cy="-7.5" r="1.2" fill="currentColor"/>'
    + '<circle cx="6" cy="3.5" r="1.2" fill="currentColor"/>',
}

const NODE_RADIUS = 26

type Selection =
  | { type: 'node'; id: string }
  | { type: 'link'; id: string }
  | null

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function mountTopology(container: HTMLElement): ViewHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel tool-panel--wide" id="view-topology" aria-labelledby="nav-topology">
      <div class="view-topology">
        <div class="card topo-toolbar">
          <div class="topo-toolbar__add">
            <button type="button" class="btn btn--secondary btn--sm" data-add="router"
                    data-i18n-key="topology.addRouter"></button>
            <button type="button" class="btn btn--secondary btn--sm" data-add="switch"
                    data-i18n-key="topology.addSwitch"></button>
            <button type="button" class="btn btn--secondary btn--sm" data-add="pc"
                    data-i18n-key="topology.addPc"></button>
            <button type="button" class="btn btn--secondary btn--sm" data-add="server"
                    data-i18n-key="topology.addServer"></button>
          </div>
          <p class="topo-toolbar__hint" data-i18n-key="topology.hint"></p>
          <button type="button" class="btn btn--danger btn--sm js-topo-clear"
                  data-action="clear" data-i18n-key="topology.clear"></button>
        </div>

        <div class="card topo-stage">
          <svg class="topo-svg js-topo-svg" viewBox="0 0 ${TOPO_CANVAS.width} ${TOPO_CANVAS.height}"
               preserveAspectRatio="xMidYMid meet" role="group"
               data-i18n-aria="topology.canvas">
            <g class="topo-links js-topo-links"></g>
            <g class="topo-nodes js-topo-nodes"></g>
          </svg>
          <div class="topo-empty js-topo-empty"></div>
        </div>

        <div class="card topo-inspector js-topo-inspector"></div>
      </div>
    </section>`,
  )

  const root          = qs(container, '#view-topology')
  const svg           = qs<SVGSVGElement>(root, '.js-topo-svg')
  const linksHost     = qs(root, '.js-topo-links')
  const nodesHost     = qs(root, '.js-topo-nodes')
  const emptyHost     = qs(root, '.js-topo-empty')
  const inspectorHost = qs(root, '.js-topo-inspector')
  const clearButton   = qs<HTMLElement>(root, '.js-topo-clear')

  let selection: Selection = null
  let clearArmed = false
  let clearTimer: ReturnType<typeof setTimeout> | null = null
  let seq = 0

  const model = (): AppState['topology'] => getState().topology

  const commit = (): void => {
    patchState({ topology: model() })
  }

  const findNode = (id: string): TopoNode | undefined =>
    model().nodes.find(node => node.id === id)

  const findLink = (id: string): TopoLink | undefined =>
    model().links.find(link => link.id === id)

  const nextId = (prefix: string): string =>
    `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`

  // ── Rendering ──────────────────────────────────────────────────────

  const linkMarkup = (link: TopoLink): string => {
    const from = findNode(link.from)
    const to = findNode(link.to)
    if (!from || !to) return ''
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const ux = dx / length
    const uy = dy / length
    const x1 = from.x + ux * NODE_RADIUS
    const y1 = from.y + uy * NODE_RADIUS
    const x2 = to.x - ux * NODE_RADIUS
    const y2 = to.y - uy * NODE_RADIUS
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const selected = selection?.type === 'link' && selection.id === link.id
    const aria = link.label === ''
      ? `${from.name} → ${to.name}`
      : `${from.name} → ${to.name} — ${link.label}`
    return `
      <g class="topo-link${selected ? ' is-selected' : ''}" data-id="${escapeHtml(link.id)}"
         tabindex="0" role="button" aria-label="${escapeHtml(aria)}">
        <line class="topo-link__hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        <line class="topo-link__line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
        ${link.label === '' ? '' : `<text class="topo-link__label" x="${mx}" y="${my - 6}">${escapeHtml(link.label)}</text>`}
      </g>`
  }

  const nodeMarkup = (node: TopoNode): string => {
    const selected = selection?.type === 'node' && selection.id === node.id
    const aria = `${node.name} — ${t(KIND_LABEL_KEYS[node.kind])}`
    return `
      <g class="topo-node topo-node--${node.kind}${selected ? ' is-selected' : ''}"
         data-id="${escapeHtml(node.id)}" transform="translate(${node.x} ${node.y})"
         tabindex="0" role="button" aria-label="${escapeHtml(aria)}">
        <circle class="topo-node__body" r="${NODE_RADIUS}"/>
        <g class="topo-node__glyph" fill="none" stroke="currentColor"
           stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[node.kind]}</g>
        <text class="topo-node__label" y="${NODE_RADIUS + 16}" text-anchor="middle">${escapeHtml(node.name)}</text>
      </g>`
  }

  const renderCanvas = (): void => {
    const { nodes, links } = model()
    linksHost.innerHTML = links.map(linkMarkup).join('')
    nodesHost.innerHTML = nodes.map(nodeMarkup).join('')

    const empty = nodes.length === 0
    svg.toggleAttribute('hidden', empty)
    clear(emptyHost)
    // The overlay only exists while the canvas is empty, so it never
    // intercepts pointer events on the SVG.
    emptyHost.toggleAttribute('hidden', !empty)
    if (empty) emptyHost.appendChild(emptyState('empty.topology'))
  }

  const renderInspector = (): void => {
    clear(inspectorHost)

    if (selection?.type === 'node') {
      const node = findNode(selection.id)
      if (!node) {
        selection = null
        return renderInspector()
      }
      const others = model().nodes.filter(item => item.id !== node.id)
      const options = others
        .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
        .join('')
      const card = html(`
        <div class="topo-inspector">
          <div class="topo-inspector__head">
            <h3 class="view-subheading"></h3>
            <span class="topo-kind-chip">${escapeHtml(t(KIND_LABEL_KEYS[node.kind]))}</span>
          </div>
          <div class="field">
            <label class="field__label" for="topo-node-name">${escapeHtml(t('field.name'))}</label>
            <input class="field__input" id="topo-node-name" type="text" maxlength="40"
                   autocomplete="off" spellcheck="false" value="${escapeHtml(node.name)}">
          </div>
          <div class="topo-connect">
            <label class="field__label" for="topo-connect-target">${escapeHtml(t('topology.connectTo'))}</label>
            <select class="field__input" id="topo-connect-target"${others.length === 0 ? ' disabled' : ''}>
              ${options}
            </select>
            <button type="button" class="btn btn--secondary js-topo-connect"
                    ${others.length === 0 ? 'disabled' : ''}>${escapeHtml(t('topology.connect'))}</button>
          </div>
          <button type="button" class="btn btn--danger btn--sm js-topo-delete-node">
            ${escapeHtml(t('topology.deleteNode'))}
          </button>
        </div>`)
      qs<HTMLElement>(card, '.view-subheading').textContent = node.name

      const nameField = qs<HTMLInputElement>(card, '#topo-node-name')
      nameField.addEventListener('input', () => {
        node.name = nameField.value.slice(0, 40)
        const label = nodesHost.querySelector<SVGTextElement>(
          `.topo-node[data-id="${CSS.escape(node.id)}"] .topo-node__label`,
        )
        if (label) label.textContent = node.name
        commit()
      })

      const target = qs<HTMLSelectElement>(card, '#topo-connect-target')
      qs<HTMLElement>(card, '.js-topo-connect').addEventListener('click', () => {
        const toId = target.value
        if (toId === '') return
        const exists = model().links.some(link =>
          (link.from === node.id && link.to === toId)
          || (link.from === toId && link.to === node.id),
        )
        if (exists) {
          showDuplicate()
          return
        }
        model().links.push({ id: nextId('l'), from: node.id, to: toId, label: '' })
        commit()
        renderCanvas()
        renderInspector()
      })

      qs<HTMLElement>(card, '.js-topo-delete-node').addEventListener('click', () => {
        const topology = model()
        topology.nodes = topology.nodes.filter(item => item.id !== node.id)
        topology.links = topology.links.filter(
          link => link.from !== node.id && link.to !== node.id,
        )
        selection = null
        commit()
        render()
      })

      inspectorHost.appendChild(card)
      return
    }

    if (selection?.type === 'link') {
      const link = findLink(selection.id)
      if (!link) {
        selection = null
        return renderInspector()
      }
      const from = findNode(link.from)
      const to = findNode(link.to)
      const card = html(`
        <div class="topo-inspector">
          <div class="topo-inspector__head">
            <h3 class="view-subheading"></h3>
          </div>
          <div class="field">
            <label class="field__label" for="topo-link-label">${escapeHtml(t('topology.linkLabel'))}</label>
            <input class="field__input mono" id="topo-link-label" type="text" maxlength="40"
                   autocomplete="off" spellcheck="false" placeholder="192.168.1.0/24"
                   value="${escapeHtml(link.label)}">
          </div>
          <button type="button" class="btn btn--danger btn--sm js-topo-delete-link">
            ${escapeHtml(t('topology.deleteLink'))}
          </button>
        </div>`)
      const head = qs<HTMLElement>(card, '.view-subheading')
      head.textContent = `${from?.name ?? '?'} → ${to?.name ?? '?'}`

      const labelField = qs<HTMLInputElement>(card, '#topo-link-label')
      labelField.addEventListener('input', () => {
        link.label = labelField.value.slice(0, 40)
        renderCanvas()
        commit()
      })

      qs<HTMLElement>(card, '.js-topo-delete-link').addEventListener('click', () => {
        const topology = model()
        topology.links = topology.links.filter(item => item.id !== link.id)
        selection = null
        commit()
        render()
      })

      inspectorHost.appendChild(card)
      return
    }

    inspectorHost.appendChild(emptyState('topology.inspectorEmpty'))
  }

  const render = (): void => {
    // Drop selections that no longer exist (project opened, canvas cleared).
    if (selection?.type === 'node' && !findNode(selection.id)) selection = null
    if (selection?.type === 'link' && !findLink(selection.id)) selection = null
    renderCanvas()
    renderInspector()
  }

  // ── Small feedback helpers ────────────────────────────────────────

  const showDuplicate = (): void => showToast(t('topology.duplicate'), 'error')

  const syncClearButton = (): void => {
    clearButton.classList.toggle('is-armed', clearArmed)
    if (clearArmed) {
      clearButton.removeAttribute('data-i18n-key')
      clearButton.textContent = t('topology.confirmClear')
    } else {
      clearButton.setAttribute('data-i18n-key', 'topology.clear')
      applyTranslations(clearButton)
    }
  }

  // ── Canvas interaction ─────────────────────────────────────────────

  /**
   * Toggle the is-selected class on canvas elements without rebuilding the
   * DOM. Replacing innerHTML during pointerdown destroys the element under
   * the cursor, which breaks setPointerCapture and makes dragging silently
   * fail in real browsers (jsdom is lenient, so tests don't catch it).
   */
  const updateSelectionClasses = (): void => {
    for (const el of nodesHost.querySelectorAll('.topo-node')) {
      el.classList.toggle(
        'is-selected',
        selection?.type === 'node' && el.getAttribute('data-id') === selection.id,
      )
    }
    for (const el of linksHost.querySelectorAll('.topo-link')) {
      el.classList.toggle(
        'is-selected',
        selection?.type === 'link' && el.getAttribute('data-id') === selection.id,
      )
    }
  }

  const clientToCanvas = (event: { clientX: number; clientY: number }): { x: number; y: number } => {
    const rect = svg.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: (event.clientX - rect.left) * (TOPO_CANVAS.width / rect.width),
        y: (event.clientY - rect.top) * (TOPO_CANVAS.height / rect.height),
      }
    }
    // No layout (jsdom): treat client coordinates as canvas units.
    return { x: event.clientX, y: event.clientY }
  }

  const updateLinkGeometry = (node: TopoNode): void => {
    for (const link of model().links) {
      if (link.from !== node.id && link.to !== node.id) continue
      const from = findNode(link.from)
      const to = findNode(link.to)
      if (!from || !to) continue
      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.hypot(dx, dy) || 1
      const ux = dx / length
      const uy = dy / length
      const x1 = from.x + ux * NODE_RADIUS
      const y1 = from.y + uy * NODE_RADIUS
      const x2 = to.x - ux * NODE_RADIUS
      const y2 = to.y - uy * NODE_RADIUS
      const group = linksHost.querySelector(`.topo-link[data-id="${CSS.escape(link.id)}"]`)
      if (!group) continue
      for (const line of Array.from(group.querySelectorAll('line'))) {
        line.setAttribute('x1', String(x1))
        line.setAttribute('y1', String(y1))
        line.setAttribute('x2', String(x2))
        line.setAttribute('y2', String(y2))
      }
      const text = group.querySelector('text')
      if (text) {
        text.setAttribute('x', String((x1 + x2) / 2))
        text.setAttribute('y', String((y1 + y2) / 2 - 6))
      }
    }
  }

  type DragState = { id: string; offsetX: number; offsetY: number; moved: boolean }
  let drag: DragState | null = null

  const startDrag = (node: TopoNode, event: PointerEvent): void => {
    const point = clientToCanvas(event)
    drag = { id: node.id, offsetX: node.x - point.x, offsetY: node.y - point.y, moved: false }
    try {
      svg.setPointerCapture(event.pointerId)
    } catch {
      // pointer capture is best-effort (missing in jsdom)
    }
  }

  svg.addEventListener('pointerdown', event => {
    const target = event.target as Element
    const nodeEl = target.closest?.('.topo-node') as SVGGElement | null
    const linkEl = target.closest?.('.topo-link') as SVGGElement | null

    if (nodeEl) {
      const node = findNode(nodeEl.dataset['id'] ?? '')
      if (!node) return
      selection = { type: 'node', id: node.id }
      // Light-weight selection update: never rebuild the canvas here or
      // pointer capture (and therefore drag) breaks in real browsers.
      updateSelectionClasses()
      renderInspector()
      nodeEl.focus?.()
      startDrag(node, event)
      event.preventDefault()
      return
    }

    if (linkEl) {
      selection = { type: 'link', id: linkEl.dataset['id'] ?? '' }
      updateSelectionClasses()
      renderInspector()
      event.preventDefault()
      return
    }

    if (selection !== null) {
      selection = null
      updateSelectionClasses()
      renderInspector()
    }
  })

  svg.addEventListener('pointermove', event => {
    if (!drag) return
    const node = findNode(drag.id)
    if (!node) {
      drag = null
      return
    }
    const point = clientToCanvas(event)
    const nextX = clamp(point.x + drag.offsetX, 0, TOPO_CANVAS.width)
    const nextY = clamp(point.y + drag.offsetY, 0, TOPO_CANVAS.height)
    if (nextX === node.x && nextY === node.y) return
    drag.moved = true
    node.x = nextX
    node.y = nextY
    nodesHost
      .querySelector(`.topo-node[data-id="${CSS.escape(node.id)}"]`)
      ?.setAttribute('transform', `translate(${node.x} ${node.y})`)
    updateLinkGeometry(node)
  })

  const endDrag = (): void => {
    if (!drag) return
    const moved = drag.moved
    drag = null
    if (moved) commit()
  }

  svg.addEventListener('pointerup', endDrag)
  svg.addEventListener('pointercancel', endDrag)

  svg.addEventListener('keydown', event => {
    const key = (event as KeyboardEvent).key
    if (key !== 'Enter' && key !== ' ') return
    const target = event.target as Element
    const nodeEl = target.closest?.('.topo-node') as SVGGElement | null
    const linkEl = target.closest?.('.topo-link') as SVGGElement | null
    const hit = nodeEl ?? linkEl
    if (!hit) return
    event.preventDefault()
    const id = hit.dataset['id'] ?? ''
    if (nodeEl) selection = { type: 'node', id }
    else selection = { type: 'link', id }
    updateSelectionClasses()
    renderInspector()
    // Re-query after the class update: focus the (same) element.
    const selector = nodeEl ? '.topo-node' : '.topo-link'
    const next = svg.querySelector(`${selector}[data-id="${CSS.escape(id)}"]`) as SVGElement | null
    next?.focus?.()
  })

  // ── Toolbar ────────────────────────────────────────────────────────

  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-add]'))) {
    button.addEventListener('click', () => {
      const kind = button.dataset['add'] as TopoNodeKind | undefined
      if (!kind || !KIND_ORDER.includes(kind)) return
      const topology = model()
      const count = topology.nodes.filter(node => node.kind === kind).length + 1
      const index = topology.nodes.length
      topology.nodes.push({
        id: nextId('n'),
        kind,
        name: `${KIND_PREFIX[kind]}${count}`,
        x: clamp(80 + (index % 5) * 130, 0, TOPO_CANVAS.width - 40),
        y: clamp(80 + Math.floor(index / 5) * 130, 0, TOPO_CANVAS.height - 40),
      })
      commit()
      render()
    })
  }

  clearButton.addEventListener('click', () => {
    if (!clearArmed) {
      clearArmed = true
      syncClearButton()
      clearTimer = setTimeout(() => {
        clearArmed = false
        clearTimer = null
        syncClearButton()
      }, 3000)
      return
    }
    if (clearTimer !== null) {
      clearTimeout(clearTimer)
      clearTimer = null
    }
    clearArmed = false
    selection = null
    const topology = model()
    topology.nodes = []
    topology.links = []
    commit()
    render()
    syncClearButton()
  })

  render()

  return {
    root,
    refresh() {
      if (clearTimer !== null) {
        clearTimeout(clearTimer)
        clearTimer = null
      }
      clearArmed = false
      syncClearButton()
      render()
    },
  }
}
