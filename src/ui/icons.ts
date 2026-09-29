/**
 * Inline SVG icon set (design §7.4).
 *
 * Outline style throughout: 24×24 viewBox, 1.5px stroke, currentColor,
 * no fill — so icons inherit size and colour from their container.
 */

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ` +
  `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ` +
  `aria-hidden="true" focusable="false">${body}</svg>`

/** Two overlapping squares. */
export const IconCopy = svg(
  '<rect x="9" y="9" width="11" height="11" rx="2"/>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
)

export const IconSun = svg(
  '<circle cx="12" cy="12" r="4"/>' +
  '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
)

export const IconMoon = svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>')

export const IconGlobe = svg(
  '<circle cx="12" cy="12" r="9"/>' +
  '<path d="M3 12h18"/>' +
  '<path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z"/>',
)

/** Arrow up leaving a box. */
export const IconShare = svg(
  '<path d="M7 13v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6"/>' +
  '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/>',
)

/** Arrow down onto a tray. */
export const IconExport = svg(
  '<path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M4 17h16"/>',
)

/** Arrow up leaving a tray. */
export const IconImport = svg(
  '<path d="M12 14V3"/><path d="m8 7 4-4 4 4"/><path d="M4 17h16"/>',
)

export const IconWarning = svg(
  '<path d="M12 4 2.7 20h18.6L12 4Z"/><path d="M12 10v4"/><path d="M12 17.2h.01"/>',
)

export const IconError = svg(
  '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
)

export const IconSuccess = svg(
  '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
)

/** X in a circle — New Session. */
export const IconNewSession = IconError

/** Bare cross — remove a row from a dynamic list. */
export const IconCross = svg('<path d="M6 6l12 12"/><path d="M18 6 6 18"/>')

export const IconPlus = svg('<path d="M12 5v14"/><path d="M5 12h14"/>')
