import React, { createContext, useContext, useReducer } from 'react'
import type { Project, User, AIMessage, Reference, Comment, CommentReply, DocumentVersion, SectionStatus } from '@/types'

interface AppState {
  user: User | null
  projects: Project[]
  currentProject: Project | null
  aiMessages: AIMessage[]
  sidebarCollapsed: boolean
  rightPanelTab: 'structure' | 'ai' | 'comments' | 'versions'
  aiEnabled: boolean
  isAuthenticated: boolean
  comments: Comment[]
  versions: DocumentVersion[]
}

type Action =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'SET_PROJECTS'; projects: Project[] }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; project: Project }
  | { type: 'SET_CURRENT_PROJECT'; project: Project | null }
  | { type: 'ADD_AI_MESSAGE'; message: AIMessage }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_RIGHT_PANEL_TAB'; tab: 'structure' | 'ai' | 'comments' | 'versions' }
  | { type: 'TOGGLE_AI' }
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_SECTION'; projectId: string; sectionId: string; content: string }
  | { type: 'ADD_REFERENCE'; projectId: string; reference: Reference }
  | { type: 'ADD_COMMENT'; comment: Comment }
  | { type: 'RESOLVE_COMMENT'; commentId: string }
  | { type: 'ADD_COMMENT_REPLY'; commentId: string; reply: CommentReply }
  | { type: 'UPDATE_SECTION_STATUS'; projectId: string; sectionId: string; status: SectionStatus }
  | { type: 'ADD_SECTION'; projectId: string; section: Section }
  | { type: 'REMOVE_SECTION'; projectId: string; sectionId: string }
  | { type: 'REORDER_SECTIONS'; projectId: string; sectionIds: string[] }
  | { type: 'SAVE_VERSION'; version: DocumentVersion }
  | { type: 'RESTORE_VERSION'; projectId: string; versionId: string }
  | { type: 'SET_AI_MESSAGES'; messages: AIMessage[] }

function loadUser(): User | null {
  const stored = localStorage.getItem('iris_user')
  if (stored) {
    try { return JSON.parse(stored) } catch { return null }
  }
  return null
}

function hasToken(): boolean {
  const token = localStorage.getItem('iris_token')
  return !!token && token !== 'guest-token'
}

export const initialState: AppState = {
  user: hasToken() ? loadUser() : null,
  projects: [],
  currentProject: null,
  aiMessages: [],
  comments: [],
  versions: [],
  sidebarCollapsed: false,
  rightPanelTab: 'structure',
  aiEnabled: true,
  isAuthenticated: hasToken(),
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      if (action.user) {
        localStorage.setItem('iris_user', JSON.stringify(action.user))
      } else {
        localStorage.removeItem('iris_user')
      }
      return { ...state, user: action.user }
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects }
    case 'ADD_PROJECT':
      return { ...state, projects: [action.project, ...state.projects] }
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.project.id ? action.project : p)),
        currentProject: state.currentProject?.id === action.project.id ? action.project : state.currentProject,
      }
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.project }
    case 'SET_AI_MESSAGES':
      return { ...state, aiMessages: action.messages }
    case 'ADD_AI_MESSAGE':
      return { ...state, aiMessages: [...state.aiMessages, action.message] }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.tab }
    case 'TOGGLE_AI':
      return { ...state, aiEnabled: !state.aiEnabled }
    case 'LOGIN':
      return { ...state, isAuthenticated: true }
    case 'LOGOUT':
      localStorage.removeItem('iris_token')
      localStorage.removeItem('iris_user')
      localStorage.removeItem('guest-token')
      return { ...state, isAuthenticated: false, user: null, projects: [], currentProject: null }
    case 'UPDATE_SECTION': {
      const updated = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return {
          ...p,
          sections: p.sections.map((s) => (s.id === action.sectionId ? { ...s, content: action.content } : s)),
        }
      })
      const cur = updated.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects: updated, currentProject: cur || state.currentProject }
    }
    case 'ADD_REFERENCE': {
      const updated = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return { ...p, bibliography: [...p.bibliography, action.reference] }
      })
      const cur = updated.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects: updated, currentProject: cur || state.currentProject }
    }
    case 'ADD_COMMENT':
      return { ...state, comments: [...state.comments, action.comment] }
    case 'RESOLVE_COMMENT':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.commentId ? { ...c, resolved: true, resolvedAt: new Date().toISOString() } : c
        ),
      }
    case 'ADD_COMMENT_REPLY':
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.commentId ? { ...c, replies: [...c.replies, action.reply] } : c
        ),
      }
    case 'ADD_SECTION': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return { ...p, sections: [...p.sections, action.section] }
      })
      const cur = projects.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects, currentProject: cur || state.currentProject }
    }
    case 'REORDER_SECTIONS': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        const reordered = action.sectionIds.map((id, i) => {
          const section = p.sections.find((s) => s.id === id)
          return section ? { ...section, orderIndex: i } : section
        }).filter(Boolean) as Section[]
        return { ...p, sections: reordered }
      })
      const cur = projects.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects, currentProject: cur || state.currentProject }
    }
    case 'REMOVE_SECTION': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return { ...p, sections: p.sections.filter((s) => s.id !== action.sectionId) }
      })
      const cur = projects.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects, currentProject: cur || state.currentProject }
    }
    case 'UPDATE_SECTION_STATUS': {
      const updated = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return {
          ...p,
          sections: p.sections.map((s) =>
            s.id === action.sectionId ? { ...s, status: action.status } : s
          ),
        }
      })
      const cur = updated.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects: updated, currentProject: cur || state.currentProject }
    }
    case 'SAVE_VERSION':
      return { ...state, versions: [action.version, ...state.versions] }
    case 'RESTORE_VERSION': {
      const version = state.versions.find((v) => v.id === action.versionId)
      if (!version) return state
      const updated = state.projects.map((p) => {
        if (p.id !== action.projectId) return p
        return {
          ...p,
          sections: p.sections.map((s) => {
            const vSection = version.sections.find((vs) => vs.id === s.id)
            return vSection ? { ...s, content: vSection.content } : s
          }),
        }
      })
      const cur = updated.find((p) => p.id === state.currentProject?.id)
      return { ...state, projects: updated, currentProject: cur || state.currentProject }
    }
    default:
      return state
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
