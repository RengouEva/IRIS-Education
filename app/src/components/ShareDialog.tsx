import React, { useState, useEffect } from 'react'
import { X, UserPlus, Users, Trash2, Check, Loader2, Mail, UserCheck } from 'lucide-react'
import { api } from '@/lib/api'

interface Collaborator {
  id: string
  projectId: string
  userId: string | null
  email: string
  role: 'supervisor' | 'student'
  status: 'pending' | 'accepted' | 'declined'
  firstname?: string
  lastname?: string
  avatar?: string
}

export function ShareDialog({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'supervisor' | 'student'>('supervisor')
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.shares.list(projectId)
      .then((data) => { setCollaborators(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [projectId, open])

  const handleInvite = async () => {
    if (!email.trim()) return
    setInviting(true)
    setError('')
    try {
      const created = await api.shares.invite(projectId, email.trim(), role)
      setCollaborators((prev) => [created, ...prev])
      setEmail('')
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'invitation")
    }
    setInviting(false)
  }

  const handleRemove = async (shareId: string) => {
    try {
      await api.shares.remove(shareId)
      setCollaborators((prev) => prev.filter((c) => c.id !== shareId))
    } catch {}
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-text-primary" />
            <h2 className="text-h5 text-text-primary font-semibold">Partager le projet</h2>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary">Inviter quelqu'un</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                placeholder="email@exemple.com"
                className="flex-1 text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'supervisor' | 'student')}
                className="text-xs border border-border-light rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40 bg-white"
              >
                <option value="supervisor">Encadreur</option>
                <option value="student">Étudiant</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !email.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-gold text-brand-900 text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {inviting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Inviter
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-medium text-text-secondary mb-2">
              Collaborateurs ({collaborators.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-text-muted" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Aucun collaborateur invité</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      {c.firstname ? (
                        <span className="text-xs font-medium text-brand-700">
                          {c.firstname[0]}{c.lastname?.[0]}
                        </span>
                      ) : (
                        <Mail size={14} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary truncate">
                        {c.firstname ? `${c.firstname} ${c.lastname}` : c.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-text-muted">{c.role === 'supervisor' ? 'Encadreur' : 'Étudiant'}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          c.status === 'accepted' ? 'bg-green-50 text-green-700' :
                          c.status === 'declined' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {c.status === 'accepted' && <><Check size={10} /> Accepté</>}
                          {c.status === 'declined' && 'Refusé'}
                          {c.status === 'pending' && 'En attente'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="p-1 text-text-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Retirer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
