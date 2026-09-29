/**
 * Tab bar and panel switching (T-12).
 *
 * The active tool lives in the store, so restoring state, importing a file
 * and clicking a tab all travel through the same path.
 */

import { getState, patchState, subscribe } from '../state/store'
import type { ToolId } from '../state/persist'
import { qs, qsa } from './dom'

const TOOL_IDS: ToolId[] = ['single', 'vlsm', 'split', 'supernet']

const TAB_LABELS: Record<ToolId, string> = {
  single: 'nav.single',
  vlsm:   'nav.vlsm',
  split:  'nav.split',
  supernet: 'nav.supernet',
}

export interface TabsHandle {
  /** Show the given tool's panel; called on mount and on every store change. */
  activate: (tool: ToolId) => void
}

export function mountTabs(container: HTMLElement): TabsHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <nav class="tabbar-nav" data-i18n-aria="nav.tools">
      <div class="tabbar" role="tablist">
        ${TOOL_IDS.map(id => `
          <button type="button" class="tabbar__tab" role="tab"
                  id="tab-${id}" data-tool="${id}" aria-controls="panel-${id}"
                  data-i18n-key="${TAB_LABELS[id]}"></button>`).join('')}
      </div>
    </nav>`,
  )

  const root = qs(container, '.tabbar')
  const buttons = qsa(root, '.tabbar__tab')

  const activate = (tool: ToolId): void => {
    for (const button of buttons) {
      button.setAttribute('aria-selected', String(button.dataset['tool'] === tool))
    }
    for (const id of TOOL_IDS) {
      document.getElementById(`panel-${id}`)?.classList.toggle('is-active', id === tool)
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const tool = button.dataset['tool'] as ToolId
      patchState({ activeTool: tool })
      activate(tool)
    })

    button.addEventListener('keydown', event => {
      const key = (event as KeyboardEvent).key
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
      event.preventDefault()

      const index = buttons.indexOf(button)
      let next = index
      if (key === 'ArrowRight') next = (index + 1) % buttons.length
      if (key === 'ArrowLeft')  next = (index - 1 + buttons.length) % buttons.length
      if (key === 'Home')       next = 0
      if (key === 'End')        next = buttons.length - 1

      const target = buttons[next]
      target?.focus()
      if (target) {
        const tool = target.dataset['tool'] as ToolId
        patchState({ activeTool: tool })
        activate(tool)
      }
    })
  }

  subscribe(state => activate(state.activeTool))
  activate(getState().activeTool)

  return { activate }
}
