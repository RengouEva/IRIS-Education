import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, Check, BookOpen, GraduationCap, FileText, Sparkles, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'
import type { University } from '@/types'

const steps = [
  { number: 1, title: 'Informations', description: 'Renseignez les données académiques' },
  { number: 2, title: 'Template', description: 'Choisissez le modèle' },
  { number: 3, title: 'Confirmation', description: 'Vérifiez et créez' },
]

const templates = [
  { id: 'licence', name: 'Licence', desc: 'Mémoire de fin de Licence (L3)', icon: BookOpen, image: '/images/template-licence.jpg' },
  { id: 'master', name: 'Master', desc: 'Mémoire de Master 1 ou 2', icon: GraduationCap, image: '/images/template-master.jpg' },
  { id: 'doctorat', name: 'Doctorat', desc: 'Thèse de Doctorat PhD', icon: Sparkles, image: '/images/template-doctorat.jpg' },
  { id: 'stage', name: 'Rapport de stage', desc: 'Rapport de stage professionnel', icon: FileText, image: '/images/template-stage.jpg' },
]

const fields = [
  'Sciences de l\'Éducation',
  'Sociologie',
  'Science Politique',
  'Psychologie',
  'Économie',
  'Gestion',
  'Informatique',
  'Droit',
]

export default function NewProject() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { user } = state
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [creating, setCreating] = useState(false)
  const [universities, setUniversities] = useState<University[]>([])
  const [formData, setFormData] = useState({
    university: '',
    faculty: '',
    field: '',
    theme: '',
    studentFirstname: user?.firstname || '',
    studentLastname: user?.lastname || '',
    supervisor: '',
    academicYear: '2024-2025',
    level: '',
  })
  const [created, setCreated] = useState(false)

  useEffect(() => {
    api.universities.list().then(setUniversities).catch(() => {})
  }, [])

  const isStep1Valid = formData.university && formData.faculty && formData.field && formData.theme && formData.supervisor
  const isStep2Valid = selectedTemplate

  const handleNext = async () => {
    if (currentStep < 3) { setCurrentStep(currentStep + 1); return }
    setCreating(true)
    try {
      const selectedUni = universities.find((u) => u.name === formData.university)
      const project = await api.projects.create({
        title: formData.theme,
        theme: formData.theme,
        field: formData.field,
        faculty: formData.faculty,
        level: formData.level as 'licence' | 'master' | 'doctorat' | 'stage',
        academicYear: formData.academicYear,
        supervisor: formData.supervisor,
        universityId: selectedUni?.id || '',
        templateId: selectedTemplate,
      })
      dispatch({ type: 'ADD_PROJECT', project })
      setCreated(true)
      setTimeout(() => navigate(`/editor/${project.id}`), 2000)
    } catch (err) {
      setCreating(false)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  if (created) {
    return (
      <div className="min-h-screen bg-surface-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-500" />
          </div>
          <h2 className="text-h2 text-text-primary mb-2">Mémoire créé avec succès !</h2>
          <p className="text-body-lg text-text-secondary">Redirection vers l'éditeur...</p>
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
        <h1 className="text-h5 text-text-primary">Nouveau mémoire</h1>
      </header>

      <div className="max-w-[800px] mx-auto p-6">
        {/* Stepper */}
        <div className="flex items-start gap-4 mb-10">
          {steps.map((step, i) => (
            <div key={step.number} className="flex-1 flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-colors ${
                  currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : currentStep === step.number
                    ? 'bg-gold text-brand-900'
                    : 'bg-gray-100 text-text-muted'
                }`}
              >
                {currentStep > step.number ? <Check size={18} /> : step.number}
              </div>
              <p className={`text-sm font-medium ${currentStep === step.number ? 'text-text-primary' : 'text-text-muted'}`}>
                {step.title}
              </p>
              <p className="text-caption text-text-muted">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute translate-x-[calc(100%+16px)] mt-5 w-[calc(100%-32px)]" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl border border-border-light p-6">
          {currentStep === 1 && (
            <div>
              <h2 className="text-h4 text-text-primary mb-6">Informations académiques</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Université <span className="text-red-500">*</span></label>
                    <select
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    >
                      <option value="">Sélectionnez...</option>
                      {universities.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Faculté / UFR <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      placeholder="ex: Faculté des Sciences Sociales"
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Filière <span className="text-red-500">*</span></label>
                    <select
                      value={formData.field}
                      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    >
                      <option value="">Sélectionnez...</option>
                      {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Année académique</label>
                    <select
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    >
                      <option>2024-2025</option>
                      <option>2023-2024</option>
                      <option>2025-2026</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-text-secondary block mb-1">Thème du mémoire <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    rows={3}
                    placeholder="Décrivez le sujet de votre recherche..."
                    className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Étudiant</label>
                    <input
                      type="text"
                      value={`${formData.studentFirstname} ${formData.studentLastname}`}
                      readOnly
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 bg-gray-50 text-text-muted"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Encadreur <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      placeholder="Nom et prénom de l'encadreur"
                      className="w-full text-sm border border-border-light rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-h4 text-text-primary mb-2">Choisissez votre template</h2>
              <p className="text-body-sm text-text-secondary mb-6">Sélectionnez le modèle correspondant à votre niveau d'études.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id)
                      setFormData({ ...formData, level: t.id })
                    }}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                      selectedTemplate === t.id
                        ? 'border-gold ring-2 ring-gold/20'
                        : 'border-border-light hover:border-brand-300'
                    }`}
                  >
                    <div className="aspect-[3/2] overflow-hidden">
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 30%, rgba(10,22,40,0.95) 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <t.icon size={16} className="text-gold" />
                        <span className="text-white font-heading font-semibold">{t.name}</span>
                      </div>
                      <p className="text-brand-300 text-xs">{t.desc}</p>
                    </div>
                    {selectedTemplate === t.id && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-gold rounded-full flex items-center justify-center">
                        <Check size={16} className="text-brand-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-h4 text-text-primary mb-6">Récapitulatif</h2>
              <div className="space-y-4 bg-gray-50 rounded-xl p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-caption text-text-muted">Université</p>
                    <p className="text-sm text-text-primary font-medium">{formData.university}</p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted">Faculté</p>
                    <p className="text-sm text-text-primary font-medium">{formData.faculty}</p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted">Filière</p>
                    <p className="text-sm text-text-primary font-medium">{formData.field}</p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted">Année académique</p>
                    <p className="text-sm text-text-primary font-medium">{formData.academicYear}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-caption text-text-muted">Thème</p>
                    <p className="text-sm text-text-primary font-medium">{formData.theme}</p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted">Encadreur</p>
                    <p className="text-sm text-text-primary font-medium">{formData.supervisor}</p>
                  </div>
                  <div>
                    <p className="text-caption text-text-muted">Template</p>
                    <p className="text-sm text-text-primary font-medium">{templates.find((t) => t.id === selectedTemplate)?.name}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700">
                  En cliquant sur "Créer le mémoire", vous acceptez que IRIS-Education structure automatiquement votre document selon le template sélectionné. Vous pourrez modifier chaque section dans l'éditeur.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
              currentStep === 1
                ? 'text-text-muted cursor-not-allowed'
                : 'border border-border-light text-text-secondary hover:bg-white'
            }`}
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === 1 ? !isStep1Valid : currentStep === 2 ? !isStep2Valid : false}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
              (currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gold hover:bg-gold-light text-brand-900'
            }`}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : null}
            {currentStep === 3 ? (creating ? 'Création...' : 'Créer le mémoire') : 'Suivant'} {!creating && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
