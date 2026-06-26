const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('iris_token')
}

function setToken(token: string) {
  localStorage.setItem('iris_token', token)
}

function clearToken() {
  localStorage.removeItem('iris_token')
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erreur serveur')
  }
  return res.json()
}

function parseAuthorsStr(str?: string): { firstname: string; lastname: string }[] {
  if (!str) return []
  return str.split(', ').filter(Boolean).map((name) => {
    const parts = name.trim().split(' ')
    const firstname = parts.slice(0, -1).join(' ') || ''
    const lastname = parts.slice(-1)[0] || ''
    return { firstname, lastname }
  })
}

function normalizeProject(p: any) {
  if (!p) return p
  if (p.bibliography) {
    p.bibliography = (p.bibliography || []).map((r: any) => ({
      ...r,
      authors: r.authors || parseAuthorsStr(r.authorsStr),
    }))
  }
  if (p.sections) {
    p.sections = (p.sections || []).map((s: any) => {
      if (s.subsections) {
        const subs = s.subsections.map((ss: any) => ({
          id: ss.id || ss.defaultSectionId,
          title: ss.title,
          orderIndex: ss.orderIndex,
        }))
        return { ...s, subsections: subs }
      }
      return s
    })
  }
  return p
}

function normalizeReference(r: any) {
  if (!r) return r
  return {
    ...r,
    authors: r.authors || parseAuthorsStr(r.authorsStr),
  }
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    return data
  },

  async register(firstname: string, lastname: string, email: string, password: string, role?: string, universityId?: string) {
    const data = await request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstname, lastname, email, password, role, universityId }),
    })
    setToken(data.token)
    return data
  },

  async me() {
    return request<any>('/auth/me')
  },

  async updateProfile(data: any) {
    return request<any>('/auth/me', { method: 'PUT', body: JSON.stringify(data) })
  },

  logout() {
    clearToken()
  },

  getToken() {
    return getToken()
  },

  isAuthenticated() {
    return !!getToken()
  },

  // Projects
  projects: {
    async list() {
      const data = await request<any[]>('/projects')
      return data.map(normalizeProject)
    },
    async get(id: string) {
      const data = await request<any>(`/projects/${id}`)
      return normalizeProject(data)
    },
    async create(data: any) {
      const project = await request<any>('/projects', { method: 'POST', body: JSON.stringify(data) })
      return normalizeProject(project)
    },
    async update(id: string, data: any) {
      const project = await request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) })
      return normalizeProject(project)
    },
    delete(id: string) { return request(`/projects/${id}`, { method: 'DELETE' }) },
    reorderSections(projectId: string, order: { id: string; orderIndex: number }[]) {
      return request(`/projects/${projectId}/sections/reorder`, { method: 'PUT', body: JSON.stringify({ order }) })
    },
    addSection(projectId: string, data: { title: string; type: string }) {
      return request<any>(`/projects/${projectId}/sections`, { method: 'POST', body: JSON.stringify(data) })
    },
    deleteSection(projectId: string, sectionId: string) {
      return request(`/projects/${projectId}/sections/${sectionId}`, { method: 'DELETE' })
    },
    updateSection(projectId: string, sectionId: string, data: any) {
      return request<any>(`/projects/${projectId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    async all() {
      const data = await request<any[]>('/projects/all')
      return data.map(normalizeProject)
    },
  },

  // Templates
  templates: {
    list() { return request<any[]>('/templates') },
    get(id: string) { return request<any>(`/templates/${id}`) },
    create(data: any) { return request<any>('/templates', { method: 'POST', body: JSON.stringify(data) }) },
    update(id: string, data: any) { return request<any>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
    delete(id: string) { return request(`/templates/${id}`, { method: 'DELETE' }) },
  },

  // References
  references: {
    async list(projectId: string) {
      const data = await request<any[]>(`/references?projectId=${projectId}`)
      return data.map(normalizeReference)
    },
    create(data: any) { return request<any>('/references', { method: 'POST', body: JSON.stringify(data) }) },
    update(id: string, data: any) { return request<any>(`/references/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
    delete(id: string) { return request(`/references/${id}`, { method: 'DELETE' }) },
  },

  // Comments
  comments: {
    list(params: { sectionId?: string; projectId?: string }) {
      const qs = params.sectionId ? `sectionId=${params.sectionId}` : `projectId=${params.projectId}`
      return request<any[]>(`/comments?${qs}`)
    },
    create(data: any) { return request<any>('/comments', { method: 'POST', body: JSON.stringify(data) }) },
    resolve(id: string) { return request(`/comments/${id}/resolve`, { method: 'PUT' }) },
    addReply(id: string, content: string) { return request<any>(`/comments/${id}/replies`, { method: 'POST', body: JSON.stringify({ content }) }) },
  },

  // Versions
  versions: {
    list(projectId: string) { return request<any[]>(`/versions?projectId=${projectId}`) },
    create(data: any) { return request<any>('/versions', { method: 'POST', body: JSON.stringify(data) }) },
    restore(id: string) { return request(`/versions/${id}/restore`, { method: 'POST' }) },
  },

  // Notifications
  notifications: {
    list() { return request<{ notifications: any[]; unread: number }>('/notifications') },
    markRead(id: string) { return request(`/notifications/${id}/read`, { method: 'PUT' }) },
    markAllRead() { return request('/notifications/read-all', { method: 'PUT' }) },
  },

  // AI
  ai: {
    messages(projectId: string) { return request<any[]>(`/ai/messages?projectId=${projectId}`) },
    chat(projectId: string, message: string) {
      return request<any>('/ai/chat', { method: 'POST', body: JSON.stringify({ projectId, message }) })
    },
  },

  // Shares
  shares: {
    list(projectId: string) { return request<any[]>(`/shares/${projectId}`) },
    invite(projectId: string, email: string, role: string) {
      return request<any>(`/shares/${projectId}/invite`, { method: 'POST', body: JSON.stringify({ email, role }) })
    },
    respond(token: string, action: 'accept' | 'decline') {
      return request(`/shares/respond/${token}`, { method: 'PUT', body: JSON.stringify({ action }) })
    },
    remove(shareId: string) { return request(`/shares/${shareId}`, { method: 'DELETE' }) },
  },

  // Uploads
  async uploadImage(file: File): Promise<{ url: string }> {
    const token = getToken()
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error("Upload d'image échoué")
    return res.json()
  },

  async uploadAudio(blob: Blob): Promise<{ url: string }> {
    const token = getToken()
    const formData = new FormData()
    formData.append('audio', blob, 'voice.webm')
    const res = await fetch(`${API_BASE}/upload/audio`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error('Upload échoué')
    return res.json()
  },

  // Universities
  universities: {
    list() { return request<any[]>('/universities') },
  },

  // Admin
  admin: {
    stats() { return request<any>('/admin/stats') },
    users: {
      list() { return request<any[]>('/admin/users') },
      create(data: any) { return request<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }) },
      update(id: string, data: any) { return request<any>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
      delete(id: string) { return request(`/admin/users/${id}`, { method: 'DELETE' }) },
    },
    config: {
      get() { return request<Record<string, string>>('/admin/config') },
      update(data: Record<string, string>) { return request<Record<string, string>>('/admin/config', { method: 'PUT', body: JSON.stringify(data) }) },
    },
    universities: {
      list() { return request<any[]>('/admin/universities') },
      create(data: any) { return request<any>('/admin/universities', { method: 'POST', body: JSON.stringify(data) }) },
      update(id: string, data: any) { return request<any>(`/admin/universities/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
      delete(id: string) { return request(`/admin/universities/${id}`, { method: 'DELETE' }) },
    },
    projects: {
      list() { return request<any[]>('/admin/projects') },
      delete(id: string) { return request(`/admin/projects/${id}`, { method: 'DELETE' }) },
    },
  },
}
