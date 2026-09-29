/**
 * Small DOM helpers shared by the UI components.
 *
 * Static markup is built with html()` (fast to read, content is trusted):
 * interpolation must always go through escapeHtml() because translated
 * strings can contain angle brackets (e.g. the Cisco "<interface>" hint).
 * Anything derived from user input is written with textContent instead.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Create a detached element from an HTML fragment. */
export function html(markup: string): HTMLElement {
  const template = document.createElement('template')
  template.innerHTML = markup.trim()
  return template.content.firstElementChild as HTMLElement
}

/**
 * Typed querySelector that throws instead of returning null.
 * Accepts either `qs(root, sel)` or `qs(sel)` against the document.
 */
export function qs<T extends Element = HTMLElement>(
  rootOrSelector: ParentNode | string,
  selector?: string,
): T {
  const isSelectorOnly = typeof rootOrSelector === 'string'
  const root: ParentNode = isSelectorOnly ? document : rootOrSelector
  const target = isSelectorOnly ? rootOrSelector : (selector ?? '')
  const found = root.querySelector(target)
  if (!found) throw new Error(`Missing element: ${target}`)
  return found as T
}

export function qsa<T extends Element = HTMLElement>(
  root: ParentNode,
  selector: string,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector))
}

export function clear(node: ParentNode): void {
  while (node.firstChild) node.removeChild(node.firstChild)
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, wait)
  }
}

/** Show or clear an inline `.field__error` message. */
export function setFieldError(element: HTMLElement | null, message: string | null): void {
  if (!element) return
  element.textContent = message ?? ''
  const input = element.parentElement?.querySelector('.field__input')
  input?.classList.toggle('has-error', message !== null)
}
