/**
 * Sidebar navigation model: sections, views and icons live here so adding
 * a view is a single entry (plus its panel registration in main.ts).
 */

import type { ViewId } from '../../state/persist'
import {
  IconBookmark,
  IconBook,
  IconClasses,
  IconOverlap,
  IconRange,
  IconSingle,
  IconSplit,
  IconSupernet,
  IconTopology,
  IconV6,
  IconVlsm,
} from '../icons'

export interface NavItem {
  id: ViewId
  icon: string
  labelKey: string
}

export interface NavSection {
  titleKey: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.section.tools',
    items: [
      { id: 'single',  icon: IconSingle,   labelKey: 'nav.single' },
      { id: 'vlsm',    icon: IconVlsm,     labelKey: 'nav.vlsm' },
      { id: 'split',   icon: IconSplit,    labelKey: 'nav.split' },
      { id: 'supernet', icon: IconSupernet, labelKey: 'nav.supernet' },
    ],
  },
  {
    titleKey: 'nav.section.planning',
    items: [
      { id: 'range',    icon: IconRange,    labelKey: 'nav.range' },
      { id: 'overlap',  icon: IconOverlap,  labelKey: 'nav.overlap' },
      { id: 'ipv6',     icon: IconV6,       labelKey: 'nav.ipv6' },
      { id: 'topology', icon: IconTopology, labelKey: 'nav.topology' },
    ],
  },
  {
    titleKey: 'nav.section.reference',
    items: [
      { id: 'classes', icon: IconClasses, labelKey: 'nav.classes' },
      { id: 'guide',   icon: IconBook,    labelKey: 'nav.guide' },
      { id: 'projects', icon: IconBookmark, labelKey: 'nav.projects' },
    ],
  },
]

/** Every navigable view id, in sidebar order. */
export const NAV_IDS: ViewId[] = NAV_SECTIONS.flatMap(section =>
  section.items.map(item => item.id),
)

export function isViewId(value: string): value is ViewId {
  return (NAV_IDS as string[]).includes(value)
}
