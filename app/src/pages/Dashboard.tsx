import { useNavigate } from 'react-router'
import {
  LayoutDashboard, BookOpen, PlusCircle, Library, Trash2,
  User, GraduationCap, CreditCard, Settings, Search, Bell,
  ChevronRight, FileText, Sparkles, Calendar, Clock, AlertCircle, Users
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { NotificationBell } from '@/components/NotificationDropdown'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import React, { useEffect } from 'react'

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
  { icon: BookOpen, label: 'Mes mémoires', path: '/dashboard' },
  { icon: PlusCircle, label: 'Nouveau mémoire', path: '/new-project' },
  { icon: Library, label: 'Bibliothèque', path: '/dashboard' },
  { icon: Trash2, label: 'Corbeille', path: '/dashboard' },
]

const settingsItems = [
  { icon: User, label: 'Profil', path: '/settings' },
  { icon: GraduationCap, label: 'Université', path: '/settings' },
  { icon: CreditCard, label: 'Abonnement', path: '/settings' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
]

const activityData = [
  { day: 'Lun', words: 450 },
  { day: 'Mar', words: 720 },
  { day: 'Mer', words: 310 },
  { day: 'Jeu', words: 890 },
  { day: 'Ven', words: 1200 },
  { day: 'Sam', words: 650 },
  { day: 'Dim', words: 980 },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { user, projects } = state
  const userId = user?.id
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    api.logout()
    dispatch({ type: 'LOGOUT' })
    navigate('/')
  }

  useEffect(() => {
    if (!api.isAuthenticated()) { setLoading(false); return }
    api.projects.list()
      .then((data) => { dispatch({ type: 'SET_PROJECTS', projects: data }); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [dispatch])

  const recentProjects = projects.slice(0, 3)

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    review: 'bg-orange-100 text-orange-700',
    submitted: 'bg-green-100 text-green-700',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    review: 'En révision',
    submitted: 'Soumis',
  }

  const activities = [
    { icon: GitBranchIcon, text: 'Vous avez ajouté un chapitre "Méthodologie"', time: 'il y a 2h' },
    { icon: Sparkles, text: 'L\'IA a suggéré 3 reformulations', time: 'il y a 3h' },
    { icon: FileText, text: 'Export PDF généré avec succès', time: 'il y a 5h' },
  ]

  return (
    <div className="min-h-screen bg-surface-light flex">
      {/* Sidebar */}
      <aside className="w-[260px] bg-brand-900 border-r border-brand-700 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <span className="font-heading text-lg font-bold text-white">IRIS-</span>
            <span className="bg-gold text-brand-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Education</span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path + item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.label === 'Tableau de bord'
                  ? 'bg-brand-800 text-white'
                  : 'text-brand-400 hover:text-white hover:bg-brand-800/50'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="border-t border-brand-700 my-4" />
          <p className="px-3 text-[10px] uppercase tracking-wider text-brand-500 mb-2 font-semibold">Paramètres</p>
          {settingsItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-400 hover:text-white hover:bg-brand-800/50 transition-colors"
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-700">
          <p className="text-caption text-brand-600">IRIS-Education v2.0</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-border-light flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-h5 text-text-primary">Tableau de bord</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-60 pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 focus:outline-none">
                <img
                  src={user?.avatar || '/images/avatar-user-1.jpg'}
                  alt={user?.firstname}
                  className="w-8 h-8 rounded-full object-cover cursor-pointer"
                />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-border-light rounded-xl shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-border-light">
                    <p className="text-sm font-medium text-text-primary truncate">{user?.firstname} {user?.lastname}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
                    Paramètres
                  </button>
                  {user?.role === 'admin' && (
                    <button onClick={() => { setMenuOpen(false); navigate('/admin') }}
                      className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors">
                      Administration
                    </button>
                  )}
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-border-light">
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {loading && (
            <div className="space-y-6">
              <Skeleton className="h-40 rounded-2xl" />
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <div className="space-y-6">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-1">Erreur de chargement</h3>
                <p className="text-sm text-text-muted mb-4">{error}</p>
                <button onClick={() => setError(null)} className="bg-gold text-brand-900 px-4 py-2 rounded-lg text-sm font-medium">
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <Empty className="h-full">
              <EmptyMedia><BookOpen size={48} className="text-text-muted" /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Aucun mémoire pour le moment</EmptyTitle>
                <EmptyDescription>Créez votre premier mémoire pour commencer à rédiger.</EmptyDescription>
              </EmptyHeader>
              <button
                onClick={() => navigate('/new-project')}
                className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-5 py-2.5 rounded-[10px] transition-colors text-sm"
              >
                Créer un mémoire
              </button>
            </Empty>
          )}

          {!loading && !error && projects.length > 0 && <>
          {/* Welcome Banner */}
          <div
            className="rounded-2xl p-8 mb-8 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0A1628, #1C3460)' }}
          >
            <div className="relative z-10">
              <h2 className="font-heading text-h3 text-white mb-1">Bonjour, {user?.firstname || 'Étudiant'}</h2>
              <p className="text-body text-brand-300 mb-4">
                Vous avez {projects.length} mémoire{projects.length > 1 ? 's' : ''} en cours de rédaction
              </p>
              <button
                onClick={() => navigate(`/editor/${projects[0]?.id}`)}
                className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-5 py-2.5 rounded-[10px] transition-colors text-sm"
              >
                Continuer mon mémoire
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard icon={BookOpen} label="Mémoires créés" value={projects.length.toString()} bg="bg-blue-50" iconColor="text-blue-500" />
            <StatCard icon={FileText} label="Sections rédigées" value={projects.reduce((acc, p) => acc + p.sections.filter(s => s.content).length, 0).toString()} bg="bg-indigo-50" iconColor="text-indigo-500" />
            <StatCard icon={Sparkles} label="Références" value={projects.reduce((acc, p) => acc + p.bibliography.length, 0).toString()} bg="bg-amber-50" iconColor="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h4 text-text-primary">Mémoires récents</h3>
                <button className="text-sm text-brand-500 hover:text-brand-600 font-medium">Voir tout</button>
              </div>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/editor/${project.id}`)}
                    className="bg-white rounded-xl p-5 border border-border-light hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${statusColors[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                        {userId && project.userId !== userId && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ml-1 bg-amber-50 text-amber-700">
                            <Users size={10} /> Partagé
                          </span>
                        )}
                        <h4 className="text-h5 text-text-primary">{project.title}</h4>
                      </div>
                      <button className="text-text-muted hover:text-text-primary">
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <p className="text-caption text-text-muted mb-3">{project.level === 'licence' ? 'Licence' : project.level === 'master' ? 'Master' : project.level === 'doctorat' ? 'Doctorat' : 'Stage'}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-caption text-text-muted">{project.progress}%</span>
                    </div>
                    <p className="text-caption text-text-muted mt-2 flex items-center gap-1">
                      <Clock size={10} />
                      Dernière modification {new Date(project.lastModified).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Activity Chart */}
              <div className="bg-white rounded-xl p-5 border border-border-light">
                <h3 className="text-h5 text-text-primary mb-4">Activité hebdo</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={activityData}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line type="monotone" dataKey="words" stroke="#C9A44C" strokeWidth={2} dot={{ r: 3, fill: '#C9A44C' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-xl p-5 border border-border-light">
                <h3 className="text-h5 text-text-primary mb-4">Activité récente</h3>
                <div className="space-y-4">
                  {activities.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />
                        {i < activities.length - 1 && <div className="absolute top-3 left-[3px] w-[2px] h-full bg-gray-100" />}
                      </div>
                      <div>
                        <p className="text-body-sm text-text-primary">{a.text}</p>
                        <p className="text-caption text-text-muted">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </>}
        </main>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, bg, iconColor }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  bg: string
  iconColor: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center">
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-caption text-text-muted">{label}</p>
      </div>
    </div>
  )
}

function GitBranchIcon(props: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}
