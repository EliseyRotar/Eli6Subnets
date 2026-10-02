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

/* ── Navigation icons ─────────────────────────────────────────── */

/** Hamburger — open the sidebar drawer on narrow viewports. */
export const IconMenu = svg('<path d="M4 6h16M4 12h16M4 18h16"/>')

/** Single network block. */
export const IconSingle = svg(
  '<rect x="3" y="6" width="18" height="12" rx="2"/>' +
  '<path d="M3 10h18"/><circle cx="7" cy="14" r="1"/>',
)

/** Stacked layers — VLSM. */
export const IconVlsm = svg(
  '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
)

/** Two blocks carved out of one — equal split. */
export const IconSplit = svg(
  '<rect x="3" y="5" width="8" height="14" rx="1.5"/>' +
  '<rect x="13" y="5" width="8" height="14" rx="1.5"/>',
)

/** Merging arrows — supernetting. */
export const IconSupernet = svg(
  '<path d="M3 7h5l3 5"/><path d="M3 17h5l3-5"/><path d="m14 12 4 0 3-3"/><path d="m18 9 3 3-3 3"/>',
)

/** Pie slice — IPv4 classes. */
export const IconClasses = svg(
  '<path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z"/>',
)

/** Connected nodes — topology. */
export const IconTopology = svg(
  '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/>' +
  '<circle cx="12" cy="18" r="2.5"/><path d="M8.5 6h7M7 8.5l3.5 7M17 8.5 13.5 15.5"/>',
)

/** Open book — guide. */
export const IconBook = svg(
  '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/>' +
  '<path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z"/>',
)

/** Bookmark — saved projects. */
export const IconBookmark = svg('<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z"/>')

/** Left-right arrows between bounds — IP range to CIDR. */
export const IconRange = svg(
  '<path d="M4 12h16"/><path d="m7 9-3 3 3 3"/><path d="m17 9 3 3-3 3"/>' +
  '<path d="M8 5v3M16 5v3M8 16v3M16 16v3"/>',
)

/** Two overlapping circles — CIDR overlap check. */
export const IconOverlap = svg(
  '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
)

/** IPv6 glyph. */
export const IconV6 = svg(
  '<path d="M4 6v8h5"/><path d="M4 10h4"/><path d="M11 14V6l4 8V6"/><path d="M18 6v8h3"/>',
)
