import { useLocation, Link } from 'react-router'
import { Shield, FileText, Mail, ChevronLeft } from 'lucide-react'

const pages: Record<string, { title: string; icon: typeof Shield; content: () => JSX.Element }> = {
  '/cgu': {
    title: 'Conditions Générales d\'Utilisation',
    icon: FileText,
    content: () => (
      <div className="space-y-6 text-body-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">1. Objet</h2>
          <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme IRIS-Education, éditée par IRIS-Education SAS. La plateforme permet aux étudiants et encadreurs de rédiger, gérer et exporter des mémoires et travaux académiques.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">2. Accès au service</h2>
          <p>L'accès à la plateforme est réservé aux utilisateurs ayant créé un compte. L'utilisateur s'engage à fournir des informations exactes et à ne pas partager ses identifiants. Tout accès frauduleux entraînera la suspension immédiate du compte.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">3. Propriété intellectuelle</h2>
          <p>Le contenu rédigé par l'utilisateur reste sa propriété intellectuelle. IRIS-Education ne revendique aucun droit sur les travaux des utilisateurs. La plateforme fournit uniquement un outil de rédaction et de mise en forme.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">4. Responsabilité</h2>
          <p>IRIS-Education s'efforce d'assurer la disponibilité du service, sans garantie absolue. La plateforme ne saurait être tenue responsable des pertes de données liées à une négligence de l'utilisateur (absence de sauvegarde). L'utilisation de l'IA générative se fait sous la seule responsabilité de l'utilisateur.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">5. Données personnelles</h2>
          <p>Les données collectées sont utilisées uniquement dans le cadre du fonctionnement de la plateforme. Conformément au RGPD, l'utilisateur peut demander la suppression de son compte et de ses données à tout moment via la page des paramètres.</p>
        </section>
      </div>
    ),
  },
  '/confidentialite': {
    title: 'Politique de Confidentialité',
    icon: Shield,
    content: () => (
      <div className="space-y-6 text-body-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">1. Responsable du traitement</h2>
          <p>IRIS-Education SAS est responsable du traitement des données personnelles collectées sur la plateforme.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">2. Données collectées</h2>
          <p>Nous collectons les données suivantes : nom, prénom, adresse email, établissement universitaire, et les contenus rédigés sur la plateforme. Les données de connexion (logs, adresse IP) sont conservées temporairement à des fins de sécurité.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">3. Finalités</h2>
          <p>Les données sont utilisées pour : fournir et améliorer le service, authentifier les utilisateurs, sauvegarder les travaux, et communiquer des informations liées au fonctionnement de la plateforme. Aucune donnée n'est revendue à des tiers.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">4. Durée de conservation</h2>
          <p>Les données sont conservées tant que le compte utilisateur est actif. Après suppression du compte, les données sont définitivement effacées sous 30 jours.</p>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">5. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Pour les exercer, contactez-nous via la page Contact.</p>
        </section>
      </div>
    ),
  },
  '/contact': {
    title: 'Contact',
    icon: Mail,
    content: () => (
      <div className="space-y-6 text-body-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">Nous contacter</h2>
          <p>Pour toute question, suggestion ou signalement, vous pouvez nous joindre par les moyens suivants :</p>
        </section>
        <section className="bg-gray-50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
              <Mail size={16} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-primary">Email</p>
              <a href="mailto:contact@iris-education.fr" className="text-xs text-brand-600 hover:underline">contact@iris-education.fr</a>
            </div>
          </div>
        </section>
        <section>
          <h2 className="text-h5 text-text-primary font-semibold mb-2">Délais de réponse</h2>
          <p>Nous nous efforçons de répondre à toutes les demandes sous 48 heures ouvrées. Les demandes relatives aux données personnelles (RGPD) sont traitées sous 30 jours maximum.</p>
        </section>
      </div>
    ),
  },
}

export default function LegalPages() {
  const location = useLocation()
  const page = pages[location.pathname]
  if (!page) return null
  const Icon = page.icon
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-6 transition-colors">
          <ChevronLeft size={14} /> Retour à l'accueil
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Icon size={20} className="text-brand-600" />
          </div>
          <h1 className="text-h3 text-text-primary font-bold">{page.title}</h1>
        </div>
        <div className="border-t border-border-light pt-8">
          {page.content()}
        </div>
      </div>
    </div>
  )
}
