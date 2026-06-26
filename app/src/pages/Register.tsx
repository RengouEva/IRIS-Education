import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Sparkles, Eye, EyeOff, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function Register() {
  const navigate = useNavigate()
  const { dispatch } = useStore()
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'student' | 'supervisor'>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstname || !lastname || !email || !password) {
      setError('Tous les champs sont obligatoires')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      const data = await api.register(firstname, lastname, email, password, role)
      dispatch({ type: 'SET_USER', user: data.user })
      dispatch({ type: 'LOGIN' })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-light flex">
      {/* Left — Brand */}
      <div className="hidden lg:flex w-[45%] bg-brand-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <span className="font-heading text-2xl font-bold text-white tracking-tight">IRIS-</span>
            <span className="bg-gold text-brand-900 text-xs font-bold px-2 py-0.5 rounded-full">Education</span>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gold/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} className="text-gold" />
              </div>
              <p className="text-brand-300 text-sm">Structurez votre mémoire selon les normes académiques</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gold/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} className="text-gold" />
              </div>
              <p className="text-brand-300 text-sm">Générez des suggestions avec l'IA à chaque étape</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gold/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} className="text-gold" />
              </div>
              <p className="text-brand-300 text-sm">Exportez en PDF et Word avec un formatage parfait</p>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-brand-500 text-xs">12,000+ étudiants utilisent déjà IRIS-Education</p>
        </div>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C9A44C 0%, transparent 70%)' }}
        />
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-1 mb-4 lg:hidden">
              <Sparkles size={20} className="text-gold" />
              <span className="font-heading text-lg font-bold text-brand-900">IRIS-Education</span>
            </div>
            <h1 className="text-h2 text-text-primary mb-1">Créer un compte</h1>
            <p className="text-body-sm text-text-secondary">Commencez à rédiger votre mémoire dès aujourd'hui</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-text-secondary block mb-1">Prénom</label>
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="Marie"
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1">Nom</label>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Kouassi"
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marie.kouassi@universite.fr"
                className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-gold/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le mot de passe"
                className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </div>

            <div>
              <label className="text-sm text-text-secondary block mb-1">Vous êtes</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    role === 'student'
                      ? 'bg-gold/10 border-gold text-brand-900'
                      : 'border-border-light text-text-secondary hover:border-brand-300'
                  }`}
                >
                  Étudiant
                </button>
                <button
                  type="button"
                  onClick={() => setRole('supervisor')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    role === 'supervisor'
                      ? 'bg-gold/10 border-gold text-brand-900'
                      : 'border-border-light text-text-secondary hover:border-brand-300'
                  }`}
                >
                  Encadreur
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-brand-900 font-semibold py-3 rounded-[10px] transition-colors disabled:opacity-50"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
