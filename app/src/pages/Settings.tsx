import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  ChevronLeft, User, GraduationCap, CreditCard, Settings as SettingsIcon,
  Bell, Shield, Globe, Moon, Save, Check, AlertCircle, Loader2
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { useTheme } from '@/lib/theme'
import { Skeleton } from '@/components/ui/skeleton'

const tabs = [
  { key: 'profile', icon: User, label: 'Profil' },
  { key: 'university', icon: GraduationCap, label: 'Université' },
  { key: 'subscription', icon: CreditCard, label: 'Abonnement' },
  { key: 'preferences', icon: SettingsIcon, label: 'Préférences' },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { user } = state
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [firstname, setFirstname] = useState(user?.firstname || '')
  const [lastname, setLastname] = useState(user?.lastname || '')
  const [email, setEmail] = useState(user?.email || '')
  const { theme, toggle: toggleTheme } = useTheme()
  const [universities, setUniversities] = useState<any[]>([])
  const [selectedUniversity, setSelectedUniversity] = useState(user?.universityId || '')

  useEffect(() => {
    if (user) {
      setFirstname(user.firstname)
      setLastname(user.lastname)
      setEmail(user.email)
      setSelectedUniversity(user.universityId || '')
    }
    api.universities.list().then(setUniversities).catch(() => {})
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: any = { firstname, lastname, email }
      if (activeTab === 'university') data.universityId = selectedUniversity
      const updated = await api.updateProfile(data)
      dispatch({ type: 'SET_USER', user: updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light">
        <header className="bg-white border-b border-border-light px-6 h-14 flex items-center">
          <Skeleton className="h-5 w-48" />
        </header>
        <div className="max-w-[900px] mx-auto p-6 flex gap-6">
          <div className="w-[200px] space-y-2">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <div className="flex-1"><Skeleton className="h-96 rounded-xl" /></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Erreur de chargement</h3>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button onClick={() => setError(null)} className="bg-gold text-brand-900 px-4 py-2 rounded-lg text-sm font-medium">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Utilisateur non trouvé</h3>
          <p className="text-sm text-text-muted">Veuillez vous connecter pour accéder aux paramètres.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Header */}
      <header className="bg-white border-b border-border-light px-6 h-14 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="p-1.5 text-text-muted hover:text-text-primary rounded transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-h5 text-text-primary">Paramètres</h1>
      </header>

      <div className="max-w-[900px] mx-auto p-6">
        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-[200px] shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  activeTab === tab.key
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-text-secondary hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-xl border border-border-light p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-h4 text-text-primary mb-6">Profil</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <img
                        src={user?.avatar || '/images/avatar-user-1.jpg'}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                          <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setAvatarUploading(true)
                          try {
                            const { url } = await api.uploadImage(file)
                            const updated = await api.updateProfile({ avatar: url })
                            dispatch({ type: 'SET_USER', user: updated })
                          } catch {}
                          setAvatarUploading(false)
                        }}
                      />
                      <button onClick={() => fileInputRef.current?.click()} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                        Changer la photo
                      </button>
                    </div>
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Prénom</label>
                    <input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40" />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Nom</label>
                    <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-text-secondary block mb-1">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'university' && (
              <div>
                <h2 className="text-h4 text-text-primary mb-6">Université</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Université</label>
                    <select value={selectedUniversity} onChange={(e) => setSelectedUniversity(e.target.value)} className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40">
                      <option value="">Sélectionnez...</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Pays</label>
                    <input type="text" value={universities.find((u: any) => u.id === selectedUniversity)?.country || ''} readOnly className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40 bg-gray-50 text-text-muted" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div>
                <h2 className="text-h4 text-text-primary mb-6">Abonnement</h2>
                <div className="bg-gradient-to-br from-brand-900 to-brand-700 rounded-xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="bg-gold text-brand-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Pro</span>
                      <h3 className="text-h3 font-heading mt-2">€9.90<span className="text-sm font-normal text-brand-300">/mois</span></h3>
                      <p className="text-body-sm text-brand-300 mt-1">Prochain renouvellement : 15 février 2025</p>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <CreditCard size={24} className="text-gold" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    'Mémoires illimités',
                    'Export PDF + Word',
                    'Suggestions IA illimitées',
                    'Tous les templates',
                    'Bibliographie avancée',
                    'Collaboration encadreur',
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-text-primary">
                      <Check size={16} className="text-green-500" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="py-2.5 px-5 border border-border-light text-text-secondary rounded-[10px] text-sm font-medium hover:bg-gray-50 transition-colors">
                    Changer de plan
                  </button>
                  <button className="py-2.5 px-5 border border-red-200 text-red-500 rounded-[10px] text-sm font-medium hover:bg-red-50 transition-colors">
                    Annuler l'abonnement
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-h4 text-text-primary mb-6">Préférences</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">Notifications</p>
                        <p className="text-caption text-text-muted">Recevoir des alertes par email</p>
                      </div>
                    </div>
                    <button className="w-10 h-5 bg-green-500 rounded-full relative transition-colors">
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                  <div className="border-t border-border-light" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe size={18} className="text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">Langue</p>
                        <p className="text-caption text-text-muted">Langue de l'interface</p>
                      </div>
                    </div>
                    <select className="text-sm border border-border-light rounded-lg px-3 py-1.5 focus:outline-none">
                      <option>Français</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div className="border-t border-border-light" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">Sauvegarde auto</p>
                        <p className="text-caption text-text-muted">Sauvegarder toutes les 30 secondes</p>
                      </div>
                    </div>
                    <button className="w-10 h-5 bg-green-500 rounded-full relative transition-colors">
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                  <div className="border-t border-border-light" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Moon size={18} className="text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary font-medium">Mode sombre</p>
                        <p className="text-caption text-text-muted">Activer le thème sombre</p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-gold' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-border-light">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold transition-all ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-gold hover:bg-gold-light text-brand-900'
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
                {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
