import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus, Search, Trash2, Copy, Pencil,
  ChevronLeft, Filter, Import, AlertCircle, BookOpen, Loader2
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import type { Reference } from '@/types'

const typeLabels: Record<string, string> = {
  book: 'Livre',
  article: 'Article',
  chapter: 'Chapitre',
  thesis: 'Thèse',
  report: 'Rapport',
  website: 'Site web',
  conference: 'Conférence',
}

const formatLabels: Record<string, string> = {
  apa: 'APA',
  mla: 'MLA',
  chicago: 'Chicago',
  iso690: 'ISO 690',
}

function formatReference(ref: Reference, format: string): string {
  const authors = ref.authors.map((a) => `${a.lastname}, ${a.firstname[0]}.`).join(', ')
  switch (format) {
    case 'apa':
      return `${authors} (${ref.year}). ${ref.title}${ref.publisher ? `. ${ref.publisher}` : ''}`
    case 'mla':
      return `${authors}. *${ref.title}*. ${ref.publisher || ''}, ${ref.year}.`
    case 'chicago':
      return `${authors}. "${ref.title}." ${ref.publisher || ''}, ${ref.year}.`
    case 'iso690':
    default:
      return `${authors} : ${ref.title}. ${ref.publisher || ''}, ${ref.year}.`
  }
}

export default function Bibliography() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { projects } = state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [references, setReferences] = useState<Reference[]>([])
  const project = projects[0]
  const projectId = project?.id

  useEffect(() => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    api.references.list(projectId)
      .then(setReferences)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId])

  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [showDOIInput, setShowDOIInput] = useState(false)
  const [doiValue, setDoiValue] = useState('')
  const [importingDOI, setImportingDOI] = useState(false)
  const [doiError, setDoiError] = useState('')
  const [editingRef, setEditingRef] = useState<Reference | null>(null)

  const [formData, setFormData] = useState<Partial<Reference>>({
    type: 'book',
    authors: [{ firstname: '', lastname: '' }],
    title: '',
    subtitle: '',
    year: new Date().getFullYear(),
    publisher: '',
    place: '',
    pages: '',
    doi: '',
    url: '',
    format: 'apa',
  })

  const filtered = references.filter((r) => {
    const matchesType = !filterType || r.type === filterType
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.authors.some((a) => a.lastname.toLowerCase().includes(search.toLowerCase()))
    return matchesType && matchesSearch
  })

  const handleAddAuthor = () => {
    setFormData({
      ...formData,
      authors: [...(formData.authors || []), { firstname: '', lastname: '' }],
    })
  }

  const handleEdit = (ref: Reference) => {
    setEditingRef(ref)
    setFormData({
      type: ref.type,
      authors: ref.authors.length > 0 ? ref.authors : [{ firstname: '', lastname: '' }],
      title: ref.title,
      subtitle: ref.subtitle,
      year: ref.year,
      publisher: ref.publisher,
      place: ref.place,
      pages: ref.pages,
      doi: ref.doi,
      url: ref.url,
      format: ref.format,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!projectId) return
    setSaving(true)
    try {
      if (editingRef) {
        const updated = await api.references.update(editingRef.id, formData)
        setReferences((prev) => prev.map((r) => (r.id === editingRef.id ? { ...r, ...updated, authors: formData.authors || [] } : r)))
      } else {
        const saved = await api.references.create({ projectId, ...formData })
        setReferences((prev) => [saved, ...prev])
      }
      setShowForm(false)
      setEditingRef(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImportDOI = async () => {
    let doi = doiValue.trim()
    if (!doi) return
    setImportingDOI(true)
    setDoiError('')
    try {
      const url = doi.startsWith('http') ? doi : `https://doi.org/${doi}`
      const doiMatch = url.match(/10\.\d{4,}\/[\S]+/i)
      if (!doiMatch) { setDoiError('DOI invalide'); setImportingDOI(false); return }
      const res = await fetch(`https://api.crossref.org/works/${doiMatch[0]}`)
      if (!res.ok) { setDoiError('DOI introuvable sur CrossRef'); setImportingDOI(false); return }
      const data = await res.json()
      const msg = data.message

      const authors = (msg.author || []).map((a: any) => ({
        firstname: a.given || '',
        lastname: a.family || '',
      }))

      let type: Reference['type'] = 'article'
      if (msg.type === 'book' || msg.type === 'monograph') type = 'book'
      else if (msg.type === 'book-chapter' || msg.type === 'chapter') type = 'chapter'
      else if (msg.type === 'dissertation' || msg.type === 'thesis') type = 'thesis'
      else if (msg.type === 'report') type = 'report'
      else if (msg.type === 'proceedings-article' || msg.type === 'conference-paper') type = 'conference'

      const publisher = msg.publisher || ''
      const year = msg.published?.dateParts?.[0]?.[0] || msg.created?.dateParts?.[0]?.[0] || new Date().getFullYear()

      setFormData({
        type,
        authors: authors.length > 0 ? authors : [{ firstname: '', lastname: '' }],
        title: msg.title?.[0] || '',
        year,
        publisher,
        place: '',
        pages: '',
        doi: doiMatch[0],
        format: 'apa',
      })
      setShowDOIInput(false)
      setDoiValue('')
      setShowForm(true)
    } catch { setDoiError('Erreur de connexion au service CrossRef') }
    setImportingDOI(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.references.delete(id)
      setReferences((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light">
        <header className="bg-white border-b border-border-light px-6 h-14 flex items-center shrink-0">
          <Skeleton className="h-5 w-48" />
        </header>
        <div className="max-w-[1280px] mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-96 w-full rounded-xl" />
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

  if (!project) {
    return (
      <div className="min-h-screen bg-surface-light">
        <header className="bg-white border-b border-border-light px-6 h-14 flex items-center shrink-0">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-text-muted hover:text-text-primary rounded transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-h5 text-text-primary">Bibliographie</h1>
        </header>
        <Empty className="h-[80vh]">
          <EmptyMedia><BookOpen size={48} className="text-text-muted" /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Aucun projet sélectionné</EmptyTitle>
            <EmptyDescription>Créez ou ouvrez un projet pour gérer votre bibliographie.</EmptyDescription>
          </EmptyHeader>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-5 py-2.5 rounded-[10px] transition-colors text-sm"
          >
            Voir mes projets
          </button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-light">
      {/* Header */}
      <header className="bg-white border-b border-border-light px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-text-muted hover:text-text-primary rounded transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-h5 text-text-primary">Bibliographie</h1>
          <span className="text-caption text-text-muted">{references.length} références</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDOIInput(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-light rounded-lg text-xs text-text-secondary hover:bg-gray-50 transition-colors">
            <Import size={14} /> Import DOI
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-brand-900 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-white border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 appearance-none"
            >
              <option value="">Tous les types</option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Split View */}
        <div className="flex gap-6">
          {/* Reference List */}
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-border-light overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-gray-50">
                    <th className="text-left px-4 py-3 text-caption text-text-muted font-semibold">Auteur</th>
                    <th className="text-left px-4 py-3 text-caption text-text-muted font-semibold">Titre</th>
                    <th className="text-left px-4 py-3 text-caption text-text-muted font-semibold">Année</th>
                    <th className="text-left px-4 py-3 text-caption text-text-muted font-semibold">Type</th>
                    <th className="text-left px-4 py-3 text-caption text-text-muted font-semibold">Format</th>
                    <th className="text-right px-4 py-3 text-caption text-text-muted font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ref) => (
                    <tr
                      key={ref.id}
                      onClick={() => setSelectedRef(selectedRef === ref.id ? null : ref.id)}
                      className={`border-b border-border-light cursor-pointer transition-colors ${
                        selectedRef === ref.id ? 'bg-brand-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-text-primary font-medium">
                        {ref.authors.map((a) => `${a.lastname}, ${a.firstname[0]}.`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-text-primary max-w-[200px] truncate">{ref.title}</td>
                      <td className="px-4 py-3 text-text-secondary">{ref.year}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">
                          {typeLabels[ref.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                          {formatLabels[ref.format]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(ref) }} className="p-1 text-text-muted hover:text-brand-600 transition-colors"><Pencil size={14} /></button>
                          <button className="p-1 text-text-muted hover:text-brand-600 transition-colors"><Copy size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(ref.id) }} className="p-1 text-text-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                        Aucune référence trouvée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview Panel */}
          {selectedRef && (
            <div className="w-[380px] shrink-0">
              <div className="bg-white rounded-xl border border-border-light p-5 sticky top-6">
                <h3 className="text-h5 text-text-primary mb-4">Aperçu formaté</h3>
                {(['apa', 'mla', 'chicago', 'iso690'] as const).map((fmt) => {
                  const ref = references.find((r) => r.id === selectedRef)
                  if (!ref) return null
                  return (
                    <div key={fmt} className="mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1">{formatLabels[fmt]}</p>
                      <p className="text-xs text-text-primary bg-gray-50 p-2 rounded-lg">{formatReference(ref, fmt)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOI Import Modal */}
      {showDOIInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[460px] mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-h3 text-text-primary">Importer par DOI</h3>
              <button onClick={() => { setShowDOIInput(false); setDoiError('') }} className="p-1 text-text-muted hover:text-text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Entrez un DOI (Digital Object Identifier) pour importer automatiquement les métadonnées de la référence depuis CrossRef.
            </p>
            <input
              type="text"
              value={doiValue}
              onChange={(e) => setDoiValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportDOI()}
              placeholder="10.1000/xyz123"
              className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-gold/40 mb-2"
              autoFocus
            />
            {doiError && <p className="text-xs text-red-500 mb-2">{doiError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowDOIInput(false); setDoiError('') }} className="flex-1 py-2.5 border border-border-light text-text-secondary rounded-[10px] text-sm font-medium hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleImportDOI} disabled={importingDOI || !doiValue.trim()} className="flex-1 py-2.5 bg-gold hover:bg-gold-light text-brand-900 rounded-[10px] text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {importingDOI ? <><Loader2 size={14} className="animate-spin" /> Importation...</> : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10, 22, 40, 0.85)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-[500px] mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-h3 text-text-primary">{editingRef ? 'Modifier la référence' : 'Ajouter une référence'}</h3>
              <button onClick={() => { setShowForm(false); setEditingRef(null) }} className="p-1 text-text-muted hover:text-text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary block mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Reference['type'] })}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                >
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">Auteurs</label>
                {formData.authors?.map((author, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={author.firstname}
                      onChange={(e) => {
                        const authors = [...(formData.authors || [])]
                        authors[i].firstname = e.target.value
                        setFormData({ ...formData, authors })
                      }}
                      className="flex-1 text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                    />
                    <input
                      type="text"
                      placeholder="Nom"
                      value={author.lastname}
                      onChange={(e) => {
                        const authors = [...(formData.authors || [])]
                        authors[i].lastname = e.target.value
                        setFormData({ ...formData, authors })
                      }}
                      className="flex-1 text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                    />
                  </div>
                ))}
                <button onClick={handleAddAuthor} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                  + Ajouter un auteur
                </button>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">Titre</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text-secondary block mb-1">Année</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary block mb-1">Pages</label>
                  <input
                    type="text"
                    value={formData.pages || ''}
                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                    className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">Éditeur / Lieu</label>
                <input
                  type="text"
                  value={formData.publisher || ''}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">DOI / URL</label>
                <input
                  type="text"
                  value={formData.doi || ''}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">Format de citation</label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as 'apa' | 'mla' | 'chicago' | 'iso690' })}
                  className="w-full text-sm border border-border-light rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gold/40"
                >
                  {Object.entries(formatLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingRef(null) }} className="flex-1 py-2.5 border border-border-light text-text-secondary rounded-[10px] text-sm font-medium hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gold hover:bg-gold-light text-brand-900 rounded-[10px] text-sm font-semibold transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingRef ? 'Enregistrer les modifications' : 'Ajouter à la bibliographie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
