/**
 * Home / launcher view: the default page when the app opens.
 *
 * A hero banner with a rotating networking tip sits above a bento grid of
 * tool cards. The subnet calculator is the hero tile (2 columns); every
 * other tool is a uniform 1×1 card. Cards are plain <a> links so middle-
 * click, ctrl-click and keyboard navigation all work for free.
 */

import { t } from '../../i18n'
import {
  IconBook,
  IconBookmark,
  IconClasses,
  IconCloud,
  IconOverlap,
  IconRange,
  IconSingle,
  IconSplit,
  IconSupernet,
  IconTopology,
  IconV6,
  IconVlsm,
} from '../icons'
import { escapeHtml, html, qs } from '../dom'
import type { ViewHandle } from './types'

interface ToolCard {
  id: string
  icon: string
  labelKey: string
  descKey: string
  hero?: boolean
}

const CARDS: ToolCard[] = [
  { id: 'single',   icon: IconSingle,   labelKey: 'nav.single',   descKey: 'home.desc.single',   hero: true },
  { id: 'vlsm',     icon: IconVlsm,     labelKey: 'nav.vlsm',     descKey: 'home.desc.vlsm' },
  { id: 'split',    icon: IconSplit,    labelKey: 'nav.split',    descKey: 'home.desc.split' },
  { id: 'supernet', icon: IconSupernet, labelKey: 'nav.supernet', descKey: 'home.desc.supernet' },
  { id: 'cloud',    icon: IconCloud,    labelKey: 'nav.cloud',    descKey: 'home.desc.cloud' },
  { id: 'range',    icon: IconRange,    labelKey: 'nav.range',    descKey: 'home.desc.range' },
  { id: 'overlap',  icon: IconOverlap,  labelKey: 'nav.overlap',  descKey: 'home.desc.overlap' },
  { id: 'ipv6',     icon: IconV6,       labelKey: 'nav.ipv6',     descKey: 'home.desc.ipv6' },
  { id: 'topology', icon: IconTopology, labelKey: 'nav.topology', descKey: 'home.desc.topology' },
  { id: 'classes',  icon: IconClasses,  labelKey: 'nav.classes',  descKey: 'home.desc.classes' },
  { id: 'guide',    icon: IconBook,     labelKey: 'nav.guide',    descKey: 'home.desc.guide' },
  { id: 'projects', icon: IconBookmark, labelKey: 'nav.projects', descKey: 'home.desc.projects' },
]

/** Number of rotating tips; keys are home.tip.1 … home.tip.N. */
const TIP_COUNT = 8

function cardMarkup(card: ToolCard, index: number): string {
  return `
    <a class="home-card${card.hero ? ' home-card--hero' : ''}"
       href="#/${card.id}" style="--i:${index}" data-nav="${card.id}">
      <span class="home-card__icon" aria-hidden="true">${card.icon}</span>
      <span class="home-card__body">
        <span class="home-card__title">${escapeHtml(t(card.labelKey))}</span>
        <span class="home-card__desc">${escapeHtml(t(card.descKey))}</span>
      </span>
    </a>`
}

export function mountHome(container: HTMLElement): ViewHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel home-view" id="view-home" aria-label="${escapeHtml(t('nav.home'))}">
      <div class="home-hero">
        <p class="home-hero__kicker">${escapeHtml(t('home.hero.kicker'))}</p>
        <h2 class="home-hero__title">${escapeHtml(t('home.hero.title'))}</h2>
        <p class="home-hero__sub">${escapeHtml(t('home.hero.subtitle'))}</p>
        <div class="home-tip" role="status" aria-live="polite">
          <span class="home-tip__badge">${escapeHtml(t('home.tip.label'))}</span>
          <span class="home-tip__text js-home-tip"></span>
        </div>
      </div>
      <div class="home-grid">
        ${CARDS.map(cardMarkup).join('')}
      </div>
    </section>`,
  )

  const root = qs(container, '#view-home')
  const tipEl = qs(root, '.js-home-tip')

  // Cards are <a href="#/view"> so middle-click / ctrl-click work natively.
  // A click handler additionally sets the hash (and fires hashchange
  // synchronously) so navigation works even where the anchor default
  // action is not performed; the sidebar's hashchange listener is
  // idempotent and skips views that are already active.
  const wireCards = (): void => {
    for (const card of Array.from(root.querySelectorAll<HTMLAnchorElement>('.home-card'))) {
      card.addEventListener('click', event => {
        event.preventDefault()
        const view = card.getAttribute('data-nav')
        if (!view) return
        location.hash = `#/${view}`
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
    }
  }
  wireCards()

  // Rotating tip: swap textContent on an interval so screen readers
  // announce it through the role="status" live region.
  let tipIndex = 0
  const showTip = (): void => {
    tipIndex = (tipIndex % TIP_COUNT) + 1
    tipEl.textContent = t(`home.tip.${tipIndex}`)
  }
  showTip()
  const tipTimer = setInterval(showTip, 9000)

  // Cursor-tracking glow on cards (progressive enhancement: only when
  // the pointer is fine and the user hasn't asked for reduced motion).
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  if (finePointer && !reducedMotion) {
    for (const card of Array.from(root.querySelectorAll<HTMLElement>('.home-card'))) {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect()
        card.style.setProperty('--x', `${event.clientX - rect.left}px`)
        card.style.setProperty('--y', `${event.clientY - rect.top}px`)
      })
    }
  }

  return {
    root,
    refresh() {
      // Language switch: rebuild so every t() call re-evaluates.
      const grid = qs(root, '.home-grid')
      grid.innerHTML = CARDS.map(cardMarkup).join('')
      wireCards()
      qs(root, '.home-hero__kicker').textContent = t('home.hero.kicker')
      qs(root, '.home-hero__title').textContent = t('home.hero.title')
      qs(root, '.home-hero__sub').textContent = t('home.hero.subtitle')
      qs(root, '.home-tip__badge').textContent = t('home.tip.label')
      tipEl.textContent = t(`home.tip.${tipIndex}`)
      root.setAttribute('aria-label', t('nav.home'))
    },
  }
}
