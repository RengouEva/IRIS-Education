import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api'
import {
  LayoutDashboard, FileText, Users, BookOpen, Settings, LogOut, Plus, Pencil, Trash2,
  GraduationCap, Building2, BarChart3, ChevronLeft, Check, X, Loader2,
} from 'lucide-react'

type Tab = 'dashboard' | 'templates' | 'users' | 'universities' | 'config' | 'projects'

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api.isAuthenticated()) { navigate('/'); return }
    api.me().then(u => {
      if (u.role !== 'admin') { navigate('/dashboard'); return }
      setUser(u)
    }).catch(() => { api.logout(); navigate('/') }).finally(() => setLoading(false))
  }, [navigate])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
  if (!user) return null

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar tab={tab} onTabChange={setTab} onLogout={() => { api.logout(); navigate('/') }} />
      <main className="flex-1 overflow-auto p-6">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'universities' && <UniversitiesTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'projects' && <ProjectsTab />}
      </main>
    </div>
  )
}

function Sidebar({ tab, onTabChange, onLogout }: { tab: Tab; onTabChange: (t: Tab) => void; onLogout: () => void }) {
  const items: { key: Tab; icon: any; label: string }[] = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { key: 'templates', icon: FileText, label: 'Templates' },
    { key: 'users', icon: Users, label: 'Utilisateurs' },
    { key: 'universities', icon: Building2, label: 'Universités' },
    { key: 'projects', icon: BookOpen, label: 'Projets' },
    { key: 'config', icon: Settings, label: 'Configuration' },
  ]
  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-amber-500">IRIS Admin</h1>
        <p className="text-xs text-zinc-500">Panneau d'administration</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(item => (
          <button key={item.key} onClick={() => onTabChange(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === item.key ? 'bg-amber-600/20 text-amber-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800 space-y-2">
        <button onClick={() => window.location.href = '/dashboard'}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour au site
        </button>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

function DashboardTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.stats().then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
  if (!stats) return <p className="text-red-400">Erreur de chargement des statistiques</p>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tableau de bord</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Utilisateurs" value={stats.usersCount} color="bg-blue-600/20 text-blue-400" />
        <StatCard icon={GraduationCap} label="Étudiants" value={stats.studentsCount} color="bg-emerald-600/20 text-emerald-400" />
        <StatCard icon={BookOpen} label="Projets" value={stats.projectsCount} color="bg-amber-600/20 text-amber-400" />
        <StatCard icon={FileText} label="Templates" value={stats.templatesCount} color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={Users} label="Encadreurs" value={stats.supervisorsCount} color="bg-cyan-600/20 text-cyan-400" />
        <StatCard icon={FileText} label="Commentaires" value={stats.commentsCount} color="bg-rose-600/20 text-rose-400" />
      </div>

      <h3 className="text-lg font-semibold mt-8">Projets par niveau</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(stats.projectsByLevel as any[]).map((p: any) => (
          <div key={p.level} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className="text-lg font-bold capitalize">{p.level}</p>
            <p className="text-2xl font-bold text-amber-400">{p.count}</p>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold mt-8">Projets récents</h3>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="text-left p-3 text-zinc-400">Titre</th>
              <th className="text-left p-3 text-zinc-400">Étudiant</th>
              <th className="text-left p-3 text-zinc-400">Niveau</th>
              <th className="text-left p-3 text-zinc-400">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(stats.recentProjects as any[]).map((p: any) => (
              <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-zinc-400">{p.studentName}</td>
                <td className="p-3 capitalize text-zinc-400">{p.level}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${
                  p.status === 'draft' ? 'bg-zinc-700 text-zinc-300' :
                  p.status === 'review' ? 'bg-amber-900/50 text-amber-300' :
                  'bg-emerald-900/50 text-emerald-300'
                }`}>{p.status === 'draft' ? 'Brouillon' : p.status === 'review' ? 'En relecture' : 'Soumis'}</span></td>
              </tr>
            ))}
            {stats.recentProjects.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-zinc-500">Aucun projet récent</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    api.templates.list().then(setTemplates).catch(console.error).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleSave = async (data: any) => {
    try {
      if (editing?.id) {
        await api.templates.update(editing.id, data)
      } else {
        await api.templates.create(data)
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return
    try { await api.templates.delete(id); load() } catch (e: any) { alert(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Templates</h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors"
        ><Plus className="w-4 h-4" /> Nouveau template</button>
      </div>

      {showForm && <TemplateForm template={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group">
            <div className="h-32 bg-zinc-800 flex items-center justify-center overflow-hidden">
              {t.image ? <img src={t.image} alt={t.name} className="w-full h-full object-cover" /> :
                <FileText className="w-12 h-12 text-zinc-600" />}
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-xs text-zinc-500 mt-1">{t.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs px-2 py-1 rounded-full bg-amber-600/20 text-amber-400 capitalize">{t.level}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(t); setShowForm(true) }}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">{t.defaultSections?.length || 0} sections</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TemplateForm({ template, onSave, onCancel }: { template: any | null; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(template?.name || '')
  const [level, setLevel] = useState(template?.level || 'master')
  const [description, setDescription] = useState(template?.description || '')
  const [image, setImage] = useState(template?.image || '')
  const [sections, setSections] = useState<{ title: string; type: string; subsections: { title: string }[] }[]>(
    template?.defaultSections?.map((s: any) => ({ title: s.title, type: s.type, subsections: s.subsections || [] })) || []
  )
  const [saving, setSaving] = useState(false)

  const addSection = () => setSections([...sections, { title: '', type: 'chapter', subsections: [] }])
  const removeSection = (i: number) => setSections(sections.filter((_, idx) => idx !== i))
  const updateSection = (i: number, field: string, value: string) => {
    const copy = [...sections]; (copy[i] as any)[field] = value; setSections(copy)
  }
  const addSub = (i: number) => {
    const copy = [...sections]; copy[i].subsections.push({ title: '' }); setSections(copy)
  }
  const updateSub = (si: number, subIdx: number, value: string) => {
    const copy = [...sections]; copy[si].subsections[subIdx].title = value; setSections(copy)
  }
  const removeSub = (si: number, subIdx: number) => {
    const copy = [...sections]; copy[si].subsections = copy[si].subsections.filter((_, i) => i !== subIdx); setSections(copy)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name, level, description,
      image: image || `/images/template-${level}.jpg`,
      defaultSections: sections.filter(s => s.title.trim()),
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold">{template ? 'Modifier le template' : 'Nouveau template'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Nom</label>
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Niveau</label>
          <select value={level} onChange={e => setLevel(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="licence">Licence</option>
            <option value="master">Master</option>
            <option value="doctorat">Doctorat</option>
            <option value="stage">Stage</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Image (URL)</label>
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="/images/template-master.jpg"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Sections par défaut</h4>
          <button type="button" onClick={addSection}
            className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-300">
            <Plus className="w-3 h-3" /> Ajouter une section
          </button>
        </div>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <input value={s.title} onChange={e => updateSection(i, 'title', e.target.value)} placeholder="Titre de la section"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500" />
                <select value={s.type} onChange={e => updateSection(i, 'type', e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                  {['cover','dedication','thanks','abstract','sigles','introduction','chapter','conclusion','bibliography','annexes'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button type="button" onClick={() => addSub(i)}
                  className="text-xs text-amber-400 hover:text-amber-300 px-1">+Ss</button>
                <button type="button" onClick={() => removeSection(i)}
                  className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
              </div>
              {s.subsections.map((sub, si) => (
                <div key={si} className="flex items-center gap-2 ml-4 mt-1">
                  <span className="text-xs text-zinc-500">—</span>
                  <input value={sub.title} onChange={e => updateSub(i, si, e.target.value)} placeholder="Sous-section"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500" />
                  <button type="button" onClick={() => removeSub(i, si)} className="text-red-400 hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Annuler</button>
        <button type="submit" disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {template ? 'Mettre à jour' : 'Créer le template'}
        </button>
      </div>
    </form>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => { setLoading(true); api.admin.users.list().then(setUsers).catch(console.error).finally(() => setLoading(false)) }
  useEffect(load, [])

  const handleSave = async (data: any) => {
    try {
      if (editing?.id) await api.admin.users.update(editing.id, data)
      else await api.admin.users.create(data)
      setShowForm(false); setEditing(null); load()
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    try { await api.admin.users.delete(id); load() } catch (e: any) { alert(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      {showForm && <UserForm user={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null) }} />}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="text-left p-3 text-zinc-400">Nom</th>
              <th className="text-left p-3 text-zinc-400">Email</th>
              <th className="text-left p-3 text-zinc-400">Rôle</th>
              <th className="text-left p-3 text-zinc-400">Date</th>
              <th className="text-right p-3 text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                <td className="p-3 font-medium">{u.firstname} {u.lastname}</td>
                <td className="p-3 text-zinc-400">{u.email}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${
                  u.role === 'admin' ? 'bg-red-900/50 text-red-300' :
                  u.role === 'supervisor' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-emerald-900/50 text-emerald-300'
                } capitalize`}>{u.role}</span></td>
                <td className="p-3 text-zinc-500 text-xs">{u.createdAt}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing(u); setShowForm(true) }}
                    className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 inline-block">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {u.role !== 'admin' && (
                    <button onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-400 hover:text-red-400 inline-block">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserForm({ user, onSave, onCancel }: { user: any | null; onSave: (data: any) => void; onCancel: () => void }) {
  const [firstname, setFirstname] = useState(user?.firstname || '')
  const [lastname, setLastname] = useState(user?.lastname || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role || 'student')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const data: any = { firstname, lastname, email, role }
    if (password) data.password = password
    await onSave(data); setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold">{user ? 'Modifier' : 'Ajouter'} un utilisateur</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Prénom</label>
          <input value={firstname} onChange={e => setFirstname(e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Nom</label>
          <input value={lastname} onChange={e => setLastname(e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Rôle</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="student">Étudiant</option>
            <option value="supervisor">Encadreur</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">{user ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe'}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!user}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Annuler</button>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-sm font-medium">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {user ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </form>
  )
}

function UniversitiesTab() {
  const [universities, setUniversities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => { setLoading(true); api.admin.universities.list().then(setUniversities).catch(console.error).finally(() => setLoading(false)) }
  useEffect(load, [])

  const handleSave = async (data: any) => {
    try {
      if (editing?.id) await api.admin.universities.update(editing.id, data)
      else await api.admin.universities.create(data)
      setShowForm(false); setEditing(null); load()
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette université ?')) return
    try { await api.admin.universities.delete(id); load() } catch (e: any) { alert(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestion des Universités</h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      {showForm && (
        <form onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.target as HTMLFormElement); await handleSave(Object.fromEntries(fd)) }}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold">{editing ? 'Modifier' : 'Ajouter'} une université</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nom</label>
              <input name="name" defaultValue={editing?.name} required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Pays</label>
              <input name="country" defaultValue={editing?.country || ''}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Logo URL</label>
              <input name="logo" defaultValue={editing?.logo || ''}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Annuler</button>
            <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
              {editing ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {universities.map(u => (
          <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 group">
            {u.logo ? <img src={u.logo} alt="" className="w-12 h-12 rounded-lg object-cover bg-zinc-800" /> :
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center"><Building2 className="w-6 h-6 text-zinc-600" /></div>}
            <div className="flex-1">
              <h3 className="font-medium text-sm">{u.name}</h3>
              <p className="text-xs text-zinc-500">{u.country}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(u); setShowForm(true) }}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(u.id)}
                className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConfigTab() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.admin.config.get().then(setConfig).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setSaved(false)
    try { await api.admin.config.update(config); setSaved(true); setTimeout(() => setSaved(false), 3000) } catch (e: any) { alert(e.message) }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>

  const labels: Record<string, string> = {
    appName: 'Nom de l\'application',
    appDescription: 'Description',
    contactEmail: 'Email de contact',
    maxProjectsFree: 'Projets max (gratuit)',
    aiSuggestionsPerDay: 'Suggestions IA par jour',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuration du site</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        {Object.entries(config).map(([key, value]) => (
          <div key={key}>
            <label className="block text-xs text-zinc-400 mb-1 capitalize">{labels[key] || key}</label>
            <input value={value} onChange={e => setConfig({ ...config, [key]: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
          </div>
        ))}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-sm font-medium">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? 'Enregistrement...' : saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectsTab() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); api.admin.projects.list().then(setProjects).catch(console.error).finally(() => setLoading(false)) }
  useEffect(load, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce projet définitivement ?')) return
    try { await api.admin.projects.delete(id); load() } catch (e: any) { alert(e.message) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tous les Projets</h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th className="text-left p-3 text-zinc-400">Titre</th>
              <th className="text-left p-3 text-zinc-400">Étudiant</th>
              <th className="text-left p-3 text-zinc-400">Niveau</th>
              <th className="text-left p-3 text-zinc-400">Progression</th>
              <th className="text-left p-3 text-zinc-400">Statut</th>
              <th className="text-right p-3 text-zinc-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 text-zinc-400">{p.studentName}</td>
                <td className="p-3 capitalize text-zinc-400">{p.level}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500">{Math.round(p.progress)}%</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    p.status === 'draft' ? 'bg-zinc-700 text-zinc-300' :
                    p.status === 'review' ? 'bg-amber-900/50 text-amber-300' :
                    'bg-emerald-900/50 text-emerald-300'
                  }`}>{p.status === 'draft' ? 'Brouillon' : p.status === 'review' ? 'Relecture' : 'Soumis'}</span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-900/30 text-zinc-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-zinc-500">Aucun projet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
