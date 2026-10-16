/**
 * Projects view: named snapshots of the whole session (FR-12).
 *
 * The list lives under its own storage key; saving captures the current
 * store, opening restores it (language and theme stay personal and are
 * preserved), renaming happens inline and deletion is armed with a second
 * click so no blocking confirm() is needed.
 */

import { applyTranslations, getLang, t } from '../../i18n'
import {
  loadProjects,
  newProjectId,
  saveProjects,
  type ProjectRecord,
} from '../../state/projects'
import { getState, setState } from '../../state/store'
import { clear, escapeHtml, html, qs, setFieldError } from '../dom'
import { emptyState } from '../subnetView'
import { showToast } from '../toast'
import type { ViewHandle } from './types'

function formatDate(iso: string): string {
  if (iso === '') return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const locale = getLang() === 'it' ? 'it-IT' : 'en-GB'
  try {
    return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export function mountProjects(
  container: HTMLElement,
  onOpen: () => void,
): ViewHandle {
  container.insertAdjacentHTML(
    'beforeend',
    `
    <section class="tool-panel tool-panel--wide" id="view-projects" aria-labelledby="nav-projects">
      <div class="view-projects">
        <div class="card">
          <h3 class="view-subheading" data-i18n-key="projects.saveTitle"></h3>
          <form class="projects-save" id="projects-form" novalidate>
            <div class="field">
              <label class="field__label" for="projects-name" data-i18n-key="field.name"></label>
              <input class="field__input" id="projects-name" type="text" maxlength="60"
                     autocomplete="off" spellcheck="false"
                     data-i18n-placeholder="projects.namePlaceholder">
              <p class="field__error" id="projects-name-error" role="alert"></p>
            </div>
            <button type="submit" class="btn btn--primary" data-i18n-key="projects.save"></button>
          </form>
          <p class="result-note" data-i18n-key="projects.hint"></p>
        </div>

        <div class="card">
          <h3 class="view-subheading" data-i18n-key="projects.listTitle"></h3>
          <div class="js-projects-list"></div>
        </div>
      </div>
    </section>`,
  )

  const root       = qs(container, '#view-projects')
  const form       = qs(root, '#projects-form')
  const nameInput  = qs<HTMLInputElement>(root, '#projects-name')
  const nameError  = qs(root, '#projects-name-error')
  const listHost   = qs(root, '.js-projects-list')

  let projects: ProjectRecord[] = loadProjects()
  let armedId: string | null = null
  let renameId: string | null = null
  let disarmTimer: ReturnType<typeof setTimeout> | null = null

  const disarm = (): void => {
    armedId = null
    if (disarmTimer !== null) {
      clearTimeout(disarmTimer)
      disarmTimer = null
    }
  }

  const persist = (): void => {
    saveProjects(projects)
  }

  const rowHtml = (record: ProjectRecord): string => {
    if (renameId === record.id) {
      return `
        <div class="project-row is-renaming" data-id="${escapeHtml(record.id)}">
          <div class="project-row__info project-row__info--edit">
            <label class="sr-only" for="rename-${escapeHtml(record.id)}"
                   data-i18n-key="field.name"></label>
            <input class="field__input project-row__rename" id="rename-${escapeHtml(record.id)}"
                   type="text" maxlength="60" value="${escapeHtml(record.name)}">
          </div>
          <div class="project-row__actions">
            <button type="button" class="btn btn--primary btn--sm" data-action="rename-save"
                    data-i18n-key="action.save"></button>
            <button type="button" class="btn btn--ghost btn--sm" data-action="rename-cancel"
                    data-i18n-key="action.cancel"></button>
          </div>
        </div>`
    }
    const armed = armedId === record.id
    return `
      <div class="project-row" data-id="${escapeHtml(record.id)}">
        <div class="project-row__info">
          <span class="project-row__name">${escapeHtml(record.name)}</span>
          <span class="project-row__date">${escapeHtml(formatDate(record.savedAt))}</span>
        </div>
        <div class="project-row__actions">
          <button type="button" class="btn btn--primary btn--sm" data-action="open"
                  data-i18n-key="projects.open"></button>
          <button type="button" class="btn btn--ghost btn--sm" data-action="rename"
                  data-i18n-key="projects.rename"></button>
          <button type="button" class="btn btn--danger btn--sm ${armed ? 'is-armed' : ''}"
                  data-action="delete"
                  data-i18n-key="${armed ? 'projects.confirmDelete' : 'projects.delete'}"></button>
        </div>
      </div>`
  }

  const render = (): void => {
    clear(listHost)
    if (projects.length === 0) {
      listHost.appendChild(emptyState('empty.projects'))
      return
    }
    const list = html(`<div class="project-list">${projects.map(rowHtml).join('')}</div>`)
    // Rows are built after boot: translate them here (applyTranslations
    // only runs once on mount and on language switches).
    applyTranslations(list)
    for (const row of Array.from(list.querySelectorAll<HTMLElement>('.project-row'))) {
      const record = projects.find(item => item.id === row.dataset['id'])
      if (!record) continue
      wireRow(row, record)
    }
    listHost.appendChild(list)
  }

  const wireRow = (row: HTMLElement, record: ProjectRecord): void => {
    for (const button of Array.from(row.querySelectorAll<HTMLButtonElement>('button'))) {
      const action = button.dataset['action']
      if (action === 'open') {
        button.addEventListener('click', () => openProject(record))
      } else if (action === 'rename') {
        button.addEventListener('click', () => {
          disarm()
          renameId = record.id
          render()
          listHost.querySelector<HTMLInputElement>(`.project-row[data-id="${record.id}"] .project-row__rename`)?.focus()
        })
      } else if (action === 'rename-save') {
        button.addEventListener('click', () => saveRename(row, record))
      } else if (action === 'rename-cancel') {
        button.addEventListener('click', () => {
          renameId = null
          render()
        })
      } else if (action === 'delete') {
        button.addEventListener('click', () => {
          if (armedId !== record.id) {
            disarm()
            armedId = record.id
            render()
            disarmTimer = setTimeout(() => {
              armedId = null
              disarmTimer = null
              render()
            }, 3000)
            return
          }
          projects = projects.filter(item => item.id !== record.id)
          disarm()
          persist()
          render()
          showToast(t('projects.deleted'), 'success')
        })
      }
    }

    const renameField = row.querySelector<HTMLInputElement>('.project-row__rename')
    renameField?.addEventListener('keydown', event => {
      if ((event as KeyboardEvent).key === 'Enter') {
        event.preventDefault()
        saveRename(row, record)
      }
    })
  }

  const saveRename = (row: HTMLElement, record: ProjectRecord): void => {
    const field = row.querySelector<HTMLInputElement>('.project-row__rename')
    if (!field) return
    const next = field.value.trim()
    if (next === '') {
      field.classList.add('has-error')
      field.focus()
      return
    }
    record.name = next
    renameId = null
    persist()
    render()
  }

  const openProject = (record: ProjectRecord): void => {
    const current = getState()
    disarm()
    renameId = null
    // Language and theme are personal: keep the live ones, restore the rest.
    setState({ ...record.state, lang: current.lang, theme: current.theme })
    onOpen()
    showToast(t('projects.loaded'), 'success')
  }

  form.addEventListener('submit', event => {
    event.preventDefault()
    const name = nameInput.value.trim()
    if (name === '') {
      setFieldError(nameError, t('projects.error.name'))
      nameInput.focus()
      return
    }

    const existing = projects.find(
      item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
    if (existing) {
      existing.state = getState()
      existing.savedAt = new Date().toISOString()
      projects = [existing, ...projects.filter(item => item.id !== existing.id)]
    } else {
      projects.unshift({
        id: newProjectId(),
        name,
        savedAt: new Date().toISOString(),
        state: getState(),
      })
    }

    setFieldError(nameError, null)
    nameInput.value = ''
    disarm()
    persist()
    render()
    showToast(t('projects.saved'), 'success')
  })

  nameInput.addEventListener('input', () => setFieldError(nameError, null))

  render()

  return {
    root,
    refresh() {
      disarm()
      renameId = null
      setFieldError(nameError, null)
      render()
    },
  }
}
