import { describe, it, expect, beforeEach } from 'vitest'
import { appReducer, initialState } from '@/lib/store'

describe('appReducer', () => {
  let state: any

  beforeEach(() => {
    localStorage.clear()
    state = {
      ...initialState,
      projects: [
        {
          id: 'proj-1',
          title: 'Test Project',
          sections: [
            { id: 'sec-1', projectId: 'proj-1', title: 'Intro', type: 'introduction', content: '<p>Hello</p>', orderIndex: 0, status: 'en_cours' },
            { id: 'sec-2', projectId: 'proj-1', title: 'Chap 1', type: 'chapter', content: '<p>Chapter</p>', orderIndex: 1, status: 'en_cours' },
          ],
          bibliography: [],
        },
      ],
      aiMessages: [],
      comments: [],
      versions: [],
    }
  })

  it('should set user', () => {
    const user = { id: '1', firstname: 'John', lastname: 'Doe', email: 'john@test.com', role: 'student' as const }
    const result = appReducer(state, { type: 'SET_USER', user })
    expect(result.user).toEqual(user)
    expect(localStorage.getItem('iris_user')).toBeTruthy()
  })

  it('should add a project', () => {
    const project = { id: 'proj-2', title: 'New', sections: [], bibliography: [] }
    const result = appReducer(state, { type: 'ADD_PROJECT', project: project as any })
    expect(result.projects).toHaveLength(2)
    expect(result.projects[0].id).toBe('proj-2')
  })

  it('should update a project', () => {
    const updated = { ...state.projects[0], title: 'Updated Title' }
    const result = appReducer(state, { type: 'UPDATE_PROJECT', project: updated })
    expect(result.projects[0].title).toBe('Updated Title')
  })

  it('should add AI message', () => {
    const msg = { id: 'msg-1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() }
    const result = appReducer(state, { type: 'ADD_AI_MESSAGE', message: msg })
    expect(result.aiMessages).toHaveLength(1)
    expect(result.aiMessages[0].content).toBe('Hello')
  })

  it('should set AI messages', () => {
    const msgs = [
      { id: '1', role: 'user' as const, content: 'Hi', timestamp: new Date().toISOString() },
      { id: '2', role: 'assistant' as const, content: 'Hello!', timestamp: new Date().toISOString() },
    ]
    const result = appReducer(state, { type: 'SET_AI_MESSAGES', messages: msgs })
    expect(result.aiMessages).toHaveLength(2)
  })

  it('should update section content', () => {
    const result = appReducer(state, {
      type: 'UPDATE_SECTION',
      projectId: 'proj-1',
      sectionId: 'sec-1',
      content: '<p>Updated content</p>',
    })
    expect(result.projects[0].sections[0].content).toBe('<p>Updated content</p>')
  })

  it('should update section status', () => {
    const result = appReducer(state, {
      type: 'UPDATE_SECTION_STATUS',
      projectId: 'proj-1',
      sectionId: 'sec-1',
      status: 'valide',
    })
    expect(result.projects[0].sections[0].status).toBe('valide')
  })

  it('should add a section', () => {
    const section = { id: 'sec-3', projectId: 'proj-1', title: 'New Chapter', type: 'chapter', content: '', orderIndex: 2, status: 'en_cours' }
    const result = appReducer(state, { type: 'ADD_SECTION', projectId: 'proj-1', section })
    expect(result.projects[0].sections).toHaveLength(3)
  })

  it('should remove a section', () => {
    const result = appReducer(state, { type: 'REMOVE_SECTION', projectId: 'proj-1', sectionId: 'sec-1' })
    expect(result.projects[0].sections).toHaveLength(1)
    expect(result.projects[0].sections[0].id).toBe('sec-2')
  })

  it('should add a reference', () => {
    const ref = { id: 'ref-1', title: 'Test Ref', authors: [], year: 2024, type: 'book', format: 'apa' }
    const result = appReducer(state, { type: 'ADD_REFERENCE', projectId: 'proj-1', reference: ref as any })
    expect(result.projects[0].bibliography).toHaveLength(1)
  })

  it('should toggle AI', () => {
    const result = appReducer(state, { type: 'TOGGLE_AI' })
    expect(result.aiEnabled).toBe(false)
    const result2 = appReducer(result, { type: 'TOGGLE_AI' })
    expect(result2.aiEnabled).toBe(true)
  })

  it('should handle login/logout', () => {
    const loginResult = appReducer(state, { type: 'LOGIN' })
    expect(loginResult.isAuthenticated).toBe(true)

    const logoutResult = appReducer(loginResult, { type: 'LOGOUT' })
    expect(logoutResult.isAuthenticated).toBe(false)
    expect(logoutResult.user).toBeNull()
  })

  it('should set right panel tab', () => {
    const result = appReducer(state, { type: 'SET_RIGHT_PANEL_TAB', tab: 'ai' })
    expect(result.rightPanelTab).toBe('ai')
  })
})
