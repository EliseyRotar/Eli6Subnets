/** Shared contract for the non-calculator views (classes, guide, …). */

export interface ViewHandle {
  /** The view's <section> element. */
  readonly root: HTMLElement
  /** Re-render dynamic (t()-built) content after a language switch. */
  refresh: () => void
}
