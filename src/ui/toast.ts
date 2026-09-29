/**
 * Transient notification (design §3.5).
 *
 * One element, one message at a time: a new toast replaces the visible one
 * instead of queueing, so rapid actions cannot stack notifications.
 */

import { html } from './dom'

export type ToastType = 'info' | 'success' | 'error'

let element: HTMLElement | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

export function initToast(): void {
  if (element) return
  element = html('<div class="toast" role="status" aria-live="polite"></div>')
  document.body.appendChild(element)
}

export function showToast(message: string, type: ToastType = 'info'): void {
  if (!element) initToast()
  if (!element) return

  if (hideTimer !== null) clearTimeout(hideTimer)

  element.textContent = message
  element.className = `toast toast--${type}`
  // force a reflow so the transition replays when a toast replaces another
  void element.offsetWidth
  element.classList.add('is-visible')

  hideTimer = setTimeout(() => {
    element?.classList.remove('is-visible')
    hideTimer = null
  }, 3000)
}
