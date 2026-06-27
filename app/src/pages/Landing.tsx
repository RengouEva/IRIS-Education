import React, { useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  FileText, Sparkles, BookOpen, Users, Download, CheckCircle,
  Layers, GitBranch, Cloud, ChevronLeft, ChevronRight, Quote,
  GraduationCap, Briefcase, Award, Zap
} from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

/* ─── Navigation ─── */
function Navigation() {
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return
      if (window.scrollY > 50) {
        navRef.current.style.borderBottom = '1px solid #1C3460'
      } else {
        navRef.current.style.borderBottom = '1px solid transparent'
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300"
      style={{ background: 'rgba(10, 22, 40, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid transparent', height: 64 }}
    >
      <div className="max-w-[1280px] mx-auto h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="font-heading text-xl font-bold text-white tracking-tight">IRIS-</span>
          <span className="bg-gold text-brand-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Education</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('features')} className="text-brand-300 hover:text-white text-sm transition-colors">Fonctionnalités</button>
          <button onClick={() => scrollTo('templates')} className="text-brand-300 hover:text-white text-sm transition-colors">Templates</button>
          <button onClick={() => scrollTo('pricing')} className="text-brand-300 hover:text-white text-sm transition-colors">Tarifs</button>
        </div>
        <button
          onClick={() => navigate('/register')}
          className="bg-gold hover:bg-gold-light text-brand-900 font-semibold text-sm px-5 py-2 rounded-[10px] transition-colors"
        >
          Commencer gratuitement
        </button>
      </div>
    </nav>
  )
}

/* ─── Hero ─── */
function Hero() {
  const navigate = useNavigate()
  const textRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(textRef.current?.querySelectorAll('.hero-line') || [], {
        y: 60, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12,
      })
      gsap.from(cardRef.current, {
        scale: 0.92, opacity: 0, duration: 1.2, delay: 0.4, ease: 'power3.out',
      })
      gsap.from(statsRef.current?.querySelectorAll('.stat-item') || [], {
        y: 20, opacity: 0, duration: 0.6, delay: 0.8, stagger: 0.1, ease: 'power3.out',
      })
      gsap.from(badgeRef.current, {
        scale: 0, duration: 0.5, delay: 1.2, ease: 'elastic.out(1, 0.5)',
      })
    })
    return () => ctx.revert()
  }, [])

  const stats = [
    { value: '12k+', label: 'mémoires créés' },
    { value: '850+', label: 'universités' },
    { value: '4.9/5', label: 'note' },
    { value: '30+', label: 'pays' },
  ]

  return (
    <section
      className="relative w-full min-h-screen flex items-center pt-16"
      style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0F1E36 50%, #152642 100%)' }}
    >
      <div className="max-w-[1280px] mx-auto px-6 py-20 flex flex-col lg:flex-row items-center gap-12 w-full">
        {/* Texte */}
        <div ref={textRef} className="lg:w-[45%] space-y-6">
          <p className="hero-line text-caption uppercase tracking-[0.15em] text-brand-300">
            LA PLATEFORME ACADÉMIQUE ASSISTÉE PAR IA
          </p>
          <h1 className="hero-line font-heading text-[clamp(36px,5vw,72px)] font-bold text-white leading-[0.95] tracking-[-0.03em]">
            Rédigez votre mémoire sans jamais ouvrir Word
          </h1>
          <p className="hero-line text-body-lg text-brand-300 max-w-lg">
            Structurez, écrivez et formatez automatiquement vos mémoires, thèses et rapports de stage selon les normes universitaires. L'IA vous guide à chaque étape.
          </p>
          <div className="hero-line flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/new-project')}
              className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-6 py-3 rounded-[10px] transition-colors h-12"
            >
              Créer mon mémoire
            </button>

          </div>
          <div ref={statsRef} className="hero-line flex flex-wrap items-center gap-4 pt-4">
            {stats.map((s, i) => (
              <div key={i} className="stat-item flex items-center gap-3">
                <span className="text-caption text-brand-400 font-medium">{s.value} {s.label}</span>
                {i < stats.length - 1 && <span className="text-brand-600">|</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Product Demo Card */}
        <div className="lg:w-[55%] relative">
          <div
            ref={cardRef}
            className="rounded-2xl border border-brand-600 overflow-hidden"
            style={{ background: '#0F1E36', boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-700">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-brand-400 ml-2">Mon Mémoire — IRIS-Education</span>
            </div>
            {/* Body — 3 columns */}
            <div className="flex h-[380px]">
              {/* Col 1: Informations */}
              <div className="w-[25%] bg-brand-900 border-r border-brand-700 p-3 overflow-hidden">
                <p className="text-[10px] uppercase tracking-wider text-brand-400 mb-2 font-semibold">Informations</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] text-brand-400">Université</label>
                    <div className="bg-brand-800 rounded px-2 py-1 text-[10px] text-white truncate">Université Paris-Saclay</div>
                  </div>
                  <div>
                    <label className="text-[9px] text-brand-400">Filière</label>
                    <div className="bg-brand-800 rounded px-2 py-1 text-[10px] text-white truncate">Sciences de l'Éducation</div>
                  </div>
                  <div>
                    <label className="text-[9px] text-brand-400">Thème</label>
                    <div className="bg-brand-800 rounded px-2 py-1 text-[10px] text-white leading-tight h-10 overflow-hidden">
                      Intelligence Artificielle et Transformation de l'Enseignement...
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-brand-400">Encadreur</label>
                    <div className="bg-brand-800 rounded px-2 py-1 text-[10px] text-white truncate">Prof. Amadou Diallo</div>
                  </div>
                  <div>
                    <label className="text-[9px] text-brand-400">Année</label>
                    <div className="bg-brand-800 rounded px-2 py-1 text-[10px] text-white">2024-2025</div>
                  </div>
                </div>
              </div>
              {/* Col 2: Editor */}
              <div className="w-[50%] bg-[#FAFAFA] flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 bg-white">
                  {['B', 'I', 'U', 'H1', 'H2', '•', '1.', '""'].map((t, i) => (
                    <button key={i} className="text-[10px] text-gray-600 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors font-medium">
                      {t}
                    </button>
                  ))}
                </div>
                {/* Content */}
                <div className="flex-1 p-4 font-editor text-[11px] leading-relaxed text-gray-800 overflow-hidden">
                  <h3 className="font-heading text-sm font-semibold text-gray-900 mb-2">Introduction</h3>
                  <p className="mb-2">
                    L'intelligence artificielle transforme les méthodologies de recherche en sciences sociales. Cette révolution technologique offre de nouvelles perspectives pour l'analyse de données qualitatives et quantitatives.
                  </p>
                  <p>
                    Dans le contexte de l'enseignement supérieur africain, l'IA représente une opportunité sans précédent pour démocratiser l'accès aux outils de recherche avancés et améliorer la qualité des productions académiques.
                  </p>
                </div>
              </div>
              {/* Col 3: Structure */}
              <div className="w-[25%] bg-brand-900 border-l border-brand-700 p-3">
                <p className="text-[10px] uppercase tracking-wider text-brand-400 mb-2 font-semibold">Plan du mémoire</p>
                <div className="space-y-1.5">
                  {['Introduction générale', 'Chapitre I', 'Chapitre II', 'Chapitre III', 'Conclusion générale', 'Bibliographie'].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-brand-300">
                      <FileText size={10} className="text-brand-500 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Badge IA */}
          <div
            ref={badgeRef}
            className="absolute -bottom-3 -right-3 bg-gold text-brand-900 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg"
          >
            <Sparkles size={14} />
            IA Active — 3 suggestions
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Features ─── */
function Features() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current?.querySelectorAll('.feature-card') || [], {
        y: 40, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 85%' },
      })
    })
    return () => ctx.revert()
  }, [])

  const features = [
    { icon: FileText, title: 'Éditeur Académique', desc: 'Éditeur Tiptap avec styles intégrés : titres, citations, notes de bas de page.' },
    { icon: BookOpen, title: 'Templates Universitaires', desc: 'Templates prédéfinis pour Licence, Master, Doctorat et Rapport de stage.' },
    { icon: Sparkles, title: 'Génération IA', desc: 'Reformulation, correction, génération de problématique et hypothèses.' },
    { icon: Layers, title: 'Bibliographie Auto', desc: 'Support APA, MLA, Chicago, ISO 690 avec import DOI.' },
    { icon: Download, title: 'Export Multi-format', desc: 'PDF, Word (.docx) et impression avec formatage fidèle au template.' },
    { icon: CheckCircle, title: 'Validation Temps Réel', desc: 'Vérification de cohérence structurelle et bibliographique.' },
    { icon: Users, title: 'Collaboration', desc: 'Partage avec encadreur, commentaires par section.' },
    { icon: GitBranch, title: 'Gestion de Chapitres', desc: 'Ajout, suppression, réorganisation avec sommaire automatique.' },
    { icon: Cloud, title: 'Sauvegarde Cloud', desc: 'Sauvegarde automatique, historique des versions.' },
  ]

  return (
    <section ref={sectionRef} id="features" className="bg-surface-light py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <p className="text-caption uppercase tracking-[0.15em] text-gold mb-3 font-semibold">FONCTIONNALITÉS</p>
        <h2 className="font-heading text-h2 text-text-primary mb-12 max-w-2xl">
          Tout ce dont vous avez besoin pour un mémoire parfait
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4">
                <f.icon size={24} className="text-brand-500" />
              </div>
              <h3 className="text-h5 text-text-primary mb-2">{f.title}</h3>
              <p className="text-body-sm text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Templates Gallery ─── */
function TemplatesGallery() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const templates = [
    { name: 'Mémoire de Licence', level: 'Licence', image: '/images/template-licence.jpg' },
    { name: 'Mémoire de Master', level: 'Master', image: '/images/template-master.jpg' },
    { name: 'Thèse de Doctorat', level: 'Doctorat', image: '/images/template-doctorat.jpg' },
    { name: 'Rapport de Stage', level: 'Rapport', image: '/images/template-stage.jpg' },
  ]

  const scroll = (dir: number) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' })
  }

  return (
    <section id="templates" className="bg-brand-900 py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <p className="text-caption uppercase tracking-[0.15em] text-gold mb-3 font-semibold">TEMPLATES</p>
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-heading text-h2 text-white max-w-xl">
            Des modèles pour chaque niveau académique
          </h2>
          <div className="hidden md:flex gap-2">
            <button onClick={() => scroll(-1)} className="w-10 h-10 rounded-full border border-brand-600 flex items-center justify-center text-brand-300 hover:bg-brand-800 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => scroll(1)} className="w-10 h-10 rounded-full border border-brand-600 flex items-center justify-center text-brand-300 hover:bg-brand-800 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto scrollbar-thin pb-4" style={{ scrollSnapType: 'x mandatory' }}>
          {templates.map((t, i) => (
            <div
              key={i}
              className="min-w-[320px] rounded-2xl overflow-hidden relative group cursor-pointer"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, rgba(10,22,40,0.95) 100%)' }} />
              <span className="absolute top-4 left-4 bg-gold text-brand-900 text-xs font-bold px-3 py-1 rounded-full">
                {t.level}
              </span>
              <h3 className="absolute bottom-4 left-4 right-4 text-h4 text-white font-heading">{t.name}</h3>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button className="border border-gold text-gold hover:bg-gold/10 font-medium px-6 py-2.5 rounded-[10px] transition-colors">
            Explorer tous les templates
          </button>
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ─── */
function Pricing() {
  const [annual, setAnnual] = React.useState(false)

  const plans = [
    {
      name: 'Starter',
      price: 0,
      period: 'Gratuit',
      features: ['1 mémoire', 'Export PDF basique', '50 suggestions IA/jour', 'Templates Licence uniquement'],
      cta: 'Commencer gratuit',
      popular: false,
    },
    {
      name: 'Pro',
      price: annual ? 7.9 : 9.9,
      period: '/mois',
      features: ['Mémoires illimités', 'Export PDF + Word', 'Suggestions IA illimitées', 'Tous les templates', 'Bibliographie avancée', 'Collaboration encadreur'],
      cta: 'Démarrer l\'essai Pro',
      popular: true,
    },
    {
      name: 'Équipe',
      price: annual ? 15.9 : 19.9,
      period: '/mois',
      features: ['Tout Pro inclus', 'Jusqu\'à 5 membres', 'Admin dashboard', 'Support prioritaire', 'API accès'],
      cta: 'Contacter ventes',
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="bg-surface-light py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <p className="text-caption uppercase tracking-[0.15em] text-gold mb-3 font-semibold text-center">TARIFS</p>
        <h2 className="font-heading text-h2 text-text-primary mb-6 text-center">
          Choisissez le plan adapté à vos besoins
        </h2>
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${!annual ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>Mensuel</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-12 h-6 rounded-full bg-brand-600 transition-colors"
            style={{ backgroundColor: annual ? '#C9A44C' : '#1C3460' }}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
          <span className={`text-sm ${annual ? 'text-text-primary font-semibold' : 'text-text-muted'}`}>Annuel</span>
          {annual && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">-20%</span>}
        </div>
        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 bg-white relative ${plan.popular ? 'ring-2 ring-gold shadow-lg' : 'shadow-[0_1px_3px_rgba(0,0,0,0.05)]'}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-brand-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Recommandé
                </span>
              )}
              <h3 className="text-h4 text-text-primary mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-text-primary">€{plan.price}</span>
                <span className="text-text-muted text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-body-sm text-text-secondary">
                    <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-[10px] font-semibold text-sm transition-colors ${
                  plan.popular
                    ? 'bg-gold hover:bg-gold-light text-brand-900'
                    : 'border border-brand-600 text-brand-600 hover:bg-brand-50'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Testimonials ─── */
function Testimonials() {
  const [active, setActive] = React.useState(0)

  const testimonials = [
    {
      quote: 'Grâce à IRIS-Education, j\'ai terminé mon mémoire de Master 2 semaines avant la deadline. Le formatage automatique m\'a fait gagner un temps fou.',
      name: 'Marie K.',
      role: 'Étudiante en Sociologie',
      avatar: '/images/avatar-user-1.jpg',
    },
    {
      quote: 'L\'assistant IA m\'a aidé à structurer ma problématique et à trouver les bons mots. C\'est comme avoir un co-encadreur disponible 24h/24.',
      name: 'Jean-Pierre A.',
      role: 'Étudiant en Science Politique',
      avatar: '/images/avatar-user-2.jpg',
    },
    {
      quote: 'Je recommande IRIS-Education à tous mes étudiants. La qualité des mémoires soumis a nettement augmenté depuis que nous utilisons cette plateforme.',
      name: 'Dr. Aminata D.',
      role: 'Directrice de Recherche',
      avatar: '/images/avatar-user-3.jpg',
    },
  ]

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  return (
    <section className="bg-brand-900 py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <p className="text-caption uppercase tracking-[0.15em] text-gold mb-3 font-semibold text-center">TÉMOIGNAGES</p>
        <h2 className="font-heading text-h2 text-white mb-12 text-center">
          Rejoints par des milliers d'étudiants dans le monde
        </h2>
        <div className="relative max-w-3xl mx-auto">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {testimonials.map((t, i) => (
                <div key={i} className="w-full shrink-0 px-4">
                  <div className="bg-brand-800 rounded-2xl p-8">
                    <Quote size={40} className="text-brand-600 mb-4" />
                    <p className="text-body-lg text-white mb-6 leading-relaxed">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="text-h5 text-white">{t.name}</p>
                        <p className="text-caption text-brand-300">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === active ? 'bg-gold' : 'bg-brand-600'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── CTA ─── */
function CTA() {
  const navigate = useNavigate()

  return (
    <section className="relative py-24 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1C3460 100%)' }}>
      <div className="max-w-[1280px] mx-auto px-6 text-center relative z-10">
        <h2 className="font-heading text-h2 text-white mb-4">Prêt à rédiger votre mémoire ?</h2>
        <p className="text-body-lg text-brand-300 mb-8">Rejoignez 12,000+ étudiants qui utilisent déjà IRIS-Education</p>
        <button
          onClick={() => navigate('/new-project')}
          className="bg-gold hover:bg-gold-light text-brand-900 font-semibold px-8 py-4 rounded-[10px] transition-colors h-[52px] inline-flex items-center"
        >
          Créer mon mémoire gratuitement
        </button>
        <p className="text-caption text-brand-400 mt-4">Pas de carte bancaire requise</p>
      </div>
    </section>
  )
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-brand-900 border-t border-brand-700 pt-16 pb-8">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-heading text-lg font-bold text-white">IRIS-</span>
              <span className="bg-gold text-brand-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">Education</span>
            </div>
            <p className="text-body-sm text-brand-400 mb-4">La rédaction académique, réinventée.</p>
            <div className="flex gap-3">
              {[GraduationCap, Briefcase, Award, Zap].map((Icon, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center">
                  <Icon size={14} className="text-brand-400" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-h5 text-white mb-4">Produit</h4>
            <ul className="space-y-2">
              {['Fonctionnalités', 'Templates', 'Tarifs', 'Mises à jour'].map((item) => (
                <li key={item}><span className="text-body-sm text-brand-400 hover:text-white cursor-pointer transition-colors">{item}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-h5 text-white mb-4">Ressources</h4>
            <ul className="space-y-2">
              {['Guide utilisateur', 'Normes universitaires', 'Blog', 'FAQ'].map((item) => (
                <li key={item}><span className="text-body-sm text-brand-400 hover:text-white cursor-pointer transition-colors">{item}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-h5 text-white mb-4">Légal</h4>
            <ul className="space-y-2">
              {[{label:'CGU',path:'/cgu'},{label:'Confidentialité',path:'/confidentialite'},{label:'Contact',path:'/contact'}].map((item) => (
                <li key={item.label}><Link to={item.path} className="text-body-sm text-brand-400 hover:text-white transition-colors">{item.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-brand-700 pt-6 text-center">
          <p className="text-caption text-brand-500">© 2025 IRIS-Education. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}

/* ─── Main Landing Page ─── */
export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Features />
      <TemplatesGallery />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
