/**
 * Sidebar shell: brand, grouped navigation, hash routing and the
 * off-canvas drawer used on narrow viewports.
 *
 * Routing contract: the URL fragment (`#/vlsm`) is the addressable source
 * for deep links, mirrored into the store so imports/New Session travel
 * the same path as a click. Only views with a registered panel are
 * rendered, so the sidebar grows as new views land.
 */

import { applyTranslations } from '../../i18n'
import { getState, patchState, subscribe } from '../../state/store'
import type { ViewId } from '../../state/persist'
import { qs } from '../dom'
import { NAV_SECTIONS } from './nav'

export interface SidebarHandle {
  /** Highlight the given view and close the drawer; called on mount and store changes. */
  activate: (view: ViewId) => void
  /** Open/close the mobile drawer (wired to the topbar menu button). */
  toggleDrawer: () => void
  closeDrawer: () => void
}

/** Read a valid view id out of `location.hash` (`#/vlsm` → `vlsm`). */
export function viewFromHash(hash: string, registered: ViewId[]): ViewId | null {
  const id = hash.replace(/^#\/?/, '')
  return (registered as string[]).includes(id) ? (id as ViewId) : null
}

/** Build the canonical hash for a view. */
export function hashFor(view: ViewId): string {
  return `#/${view}`
}

export function mountSidebar(
  container: HTMLElement,
  registered: ViewId[],
): SidebarHandle {
  /** View id → i18n label key, derived from the nav model. */
  const labelKeys: Record<string, string> = Object.fromEntries(
    NAV_SECTIONS.flatMap(section => section.items.map(item => [item.id, item.labelKey])),
  )

  const sections = NAV_SECTIONS.map(section => {
    const items = section.items.filter(item => registered.includes(item.id))
    if (items.length === 0) return ''
    return `
      <div>
        <div class="sidebar__section-title" data-i18n-key="${section.titleKey}"></div>
        <ul class="sidebar__list">
          ${items.map(item => `
            <li>
              <a class="sidebar__link" id="nav-${item.id}" href="${hashFor(item.id)}"
                 data-view="${item.id}">
                ${item.icon}
                <span data-i18n-key="${item.labelKey}"></span>
              </a>
            </li>`).join('')}
        </ul>
      </div>`
  }).join('')

  container.insertAdjacentHTML(
    'afterbegin',
    `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="sidebar__logo" aria-hidden="true">/24</span>
        <h1 class="sidebar__title">Eli6<span>Subnets</span></h1>
      </div>
      <nav class="sidebar__nav" data-i18n-aria="nav.main">${sections}</nav>
    </aside>
    <div class="sidebar-overlay" data-sidebar-overlay aria-hidden="true"></div>`,
  )

  const root = qs(container, '.sidebar')
  const overlay = qs<HTMLElement>(container, '[data-sidebar-overlay]')
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.sidebar__link'))
  const topbarTitle = () => document.querySelector<HTMLElement>('.topbar__view')

  const closeDrawer = (): void => {
    root.classList.remove('is-open')
    overlay.classList.remove('is-open')
  }

  const toggleDrawer = (): void => {
    const open = root.classList.toggle('is-open')
    overlay.classList.toggle('is-open', open)
  }

  const activate = (view: ViewId): void => {
    for (const link of links) {
      const isCurrent = link.dataset['view'] === view
      if (isCurrent) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    }
    for (const id of registered) {
      document.getElementById(`view-${id}`)?.classList.toggle('is-active', id === view)
    }
    // Topbar shows the active view's name; refresh its translation too.
    const title = topbarTitle()
    if (title) {
      title.setAttribute('data-i18n-key', labelKeys[view] ?? 'nav.single')
      applyTranslations(title.parentElement ?? title)
    }
  }

  const go = (view: ViewId): void => {
    if (location.hash !== hashFor(view)) location.hash = hashFor(view)
    if (getState().activeView !== view) patchState({ activeView: view })
    activate(view)
    closeDrawer()
  }

  for (const link of links) {
    link.addEventListener('click', event => {
      event.preventDefault()
      const view = link.dataset['view'] as ViewId | undefined
      if (view) go(view)
    })
  }

  overlay.addEventListener('click', closeDrawer)
  document.addEventListener('keydown', event => {
    if ((event as KeyboardEvent).key === 'Escape') closeDrawer()
  })

  // Deep link in the fragment wins over the persisted view.
  const fromHash = viewFromHash(location.hash, registered)
  const persisted = getState().activeView
  const initial: ViewId = fromHash
    ?? ((registered as string[]).includes(persisted) ? persisted : registered[0] ?? 'single')

  if (location.hash !== hashFor(initial)) {
    history.replaceState(null, '', `${location.pathname}${location.search}${hashFor(initial)}`)
  }
  if (persisted !== initial) patchState({ activeView: initial })
  activate(initial)

  window.addEventListener('hashchange', () => {
    const view = viewFromHash(location.hash, registered)
    if (!view || view === getState().activeView) return
    patchState({ activeView: view })
    activate(view)
    closeDrawer()
  })

  subscribe(state => {
    if ((registered as string[]).includes(state.activeView)) activate(state.activeView)
  })

  // The sidebar renders its labels once; language switches re-translate
  // through applyTranslations(document) in the i18n layer.
  applyTranslations(root)

  return { activate, toggleDrawer, closeDrawer }
}
