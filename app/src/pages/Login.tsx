import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Sparkles, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function Login() {
  const navigate = useNavigate()
  const { dispatch } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    try {
      const data = await api.login(email, password)
      dispatch({ type: 'SET_USER', user: data.user })
      dispatch({ type: 'LOGIN' })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect')
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
          <div className="space-y-6 max-w-sm">
            <h2 className="font-heading text-h2 text-white leading-[1.1]">
              Rédigez votre mémoire sans jamais ouvrir Word
            </h2>
            <p className="text-brand-300 text-sm leading-relaxed">
              Structurez, écrivez et formatez automatiquement vos mémoires, thèses et rapports de stage selon les normes universitaires. L'IA vous guide à chaque étape.
            </p>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-brand-500 text-xs">© 2025 IRIS-Education. Tous droits réservés.</p>
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
            <h1 className="text-h2 text-text-primary mb-1">Bon retour</h1>
            <p className="text-body-sm text-text-secondary">Connectez-vous à votre compte</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@universite.fr"
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
                  placeholder="Votre mot de passe"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-brand-900 font-semibold py-3 rounded-[10px] transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-500 hover:text-brand-600 font-medium">
              S'inscrire gratuitement
            </Link>
          </p>


        </div>
      </div>
    </div>
  )
}
