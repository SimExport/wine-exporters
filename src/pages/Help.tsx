import { BookOpen, MessageCircle, User, Grape, Megaphone, Users, Mail, ChevronRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const STEPS = [
{
  number: 1,
  title: "Créez votre profil domaine",
  description: "Renseignez le nom de votre domaine, votre localisation, vos certifications et une description de votre style de vins. Un profil complet améliore la pertinence de vos campagnes.",
  icon: User
},
{
  number: 2,
  title: "Ajoutez vos cuvées",
  description: "Depuis la page Profil, ajoutez chaque cuvée avec sa couleur, son appellation, son prix EXW et ses millésimes. Ces informations serviront à cibler les bons acheteurs.",
  icon: Grape
},
{
  number: 3,
  title: "Lancez votre première campagne",
  description: "Choisissez vos marchés cibles, rédigez votre message ou laissez-nous vous aider, puis soumettez votre campagne. Notre équipe la valide sous 24-48h avant envoi.",
  icon: Megaphone
},
{
  number: 4,
  title: "Suivez vos prospects",
  description: "Les importateurs intéressés apparaissent dans votre CRM. Gérez-les en liste ou en vue Kanban, ajoutez des notes et suivez l'avancement de chaque opportunité.",
  icon: Users
}];


const FAQ_SECTIONS = [
{
  id: "profil",
  title: "Profil & Vins",
  questions: [
  {
    q: "Comment bien remplir mon profil domaine ?",
    a: "Renseignez tous les champs : nom du domaine, localisation, certifications (bio, biodynamie…), description de vos vins et marchés actuels. Un profil complet augmente la qualité du ciblage dans vos campagnes. N'oubliez pas d'ajouter au moins une cuvée."
  },
  {
    q: "Quelles cuvées dois-je ajouter ?",
    a: "Ajoutez les cuvées que vous souhaitez exporter. Pour chacune, précisez la couleur, l'appellation, le prix EXW en euros, les millésimes disponibles et si elle est bio/naturelle. Ces informations permettent de cibler les importateurs correspondants."
  },
  {
    q: "À quoi servent les certifications ?",
    a: "Les certifications (AB, Demeter, Nature & Progrès…) sont des critères de recherche importants pour de nombreux importateurs, notamment en Europe du Nord et en Amérique du Nord. Les renseigner améliore la précision du ciblage."
  },
  {
    q: "Puis-je modifier mon profil après avoir lancé une campagne ?",
    a: "Oui, vous pouvez modifier votre profil à tout moment. Les informations sont utilisées lors de la création de la campagne ; les modifications n'impactent pas les campagnes déjà envoyées."
  }]

},
{
  id: "campagnes",
  title: "Campagnes de Prospection",
  questions: [
  {
    q: "Comment fonctionne une campagne ?",
    a: "Vous définissez vos marchés cibles, choisissez vos cuvées à mettre en avant, rédigez un message personnalisé et soumettez la campagne. Notre équipe valide le contenu puis envoie l'e-mail à une sélection d'importateurs qualifiés sur vos marchés."
  },
  {
    q: "Combien de temps dure la validation ?",
    a: "Notre équipe examine chaque campagne sous 24 à 48h ouvrées. Vous recevez une notification dès que la campagne est validée et prête à partir."
  },
  {
    q: "Que se passe-t-il après l'envoi ?",
    a: "Les importateurs qui répondent positivement (demande de tarifs, d'échantillons, de rendez-vous…) apparaissent automatiquement dans votre CRM sous forme de prospects. Vous pouvez alors les contacter directement."
  },
  {
    q: "Puis-je annuler une campagne après soumission ?",
    a: "Vous pouvez contacter notre support avant la validation pour annuler ou modifier une campagne. Une fois validée et lancée, il n'est plus possible d'annuler l'envoi."
  }]

},
{
  id: "crm",
  title: "CRM & Prospects",
  questions: [
  {
    q: "Comment apparaissent les prospects dans mon CRM ?",
    a: "Lorsqu'un importateur répond positivement à votre campagne, il est automatiquement ajouté à votre CRM avec les informations disponibles (pays, société, action demandée). Vous retrouvez tous vos prospects dans les pages CRM Liste et CRM Kanban."
  },
  {
    q: "Comment gérer le pipeline de ventes ?",
    a: "La vue Kanban vous permet de faire glisser vos prospects d'une colonne à l'autre selon leur avancement : Nouveau → Échantillons demandés → Dégustation → Négociation → Gagné / Perdu. Ajoutez des notes à chaque prospect pour suivre vos échanges."
  },
  {
    q: "Puis-je ajouter manuellement un prospect ?",
    a: "Cette fonctionnalité est en cours de développement. Pour l'instant, les prospects sont créés automatiquement à partir des réponses aux campagnes."
  }]

},
{
  id: "abonnement",
  title: "Abonnement & Facturation",
  questions: [
  {
    q: "Quelle est la différence entre le plan Free et Premium ?",
    a: "Le plan Free vous permet de créer votre profil et d'explorer la plateforme. Le plan Premium inclut 1 campagne de prospection par mois, l'accès complet au CRM, et la priorité dans la validation des campagnes."
  },
  {
    q: "Comment passer à Premium ?",
    a: "Rendez-vous dans la section Facturation de la barre de navigation latérale. Vous pouvez souscrire à l'abonnement mensuel en quelques clics via notre système de paiement sécurisé Stripe."
  },
  {
    q: "Mes campagnes non utilisées sont-elles reportées ?",
    a: "Non, les crédits de campagne sont mensuels et ne se cumulent pas d'un mois à l'autre. Nous recommandons d'utiliser votre campagne chaque mois pour maximiser votre prospection."
  }]

}];


const Help = () => {
  return (
    <div className="p-8 lg:p-10 space-y-12 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Aide & Support</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Tout ce qu'il faut savoir pour démarrer et tirer le meilleur de WineExporters.
        </p>
      </div>

      {/* Premiers pas */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Premiers pas</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step) =>
          <Card key={step.number} className="relative overflow-hidden border hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Étape {step.number}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </CardContent>
              <div className="absolute top-0 left-0 h-full w-1 bg-primary/20" />
            </Card>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
            <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Questions fréquentes</h2>
        </div>
        <div className="space-y-4">
          {FAQ_SECTIONS.map((section) =>
          <Card key={section.id}>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <Accordion type="multiple" className="w-full">
                  {section.questions.map((item, i) =>
                <AccordionItem key={i} value={`${section.id}-${i}`} className="border-b last:border-b-0">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3 text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                )}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Contact */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
            <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Contacter le support</h2>
        </div>
        <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/40 dark:bg-emerald-900/10">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Vous ne trouvez pas votre réponse ?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Notre équipe vous répond sous <strong>72h ouvrées</strong>, du lundi au vendredi. Décrivez votre problème avec le plus de détails possible pour une aide rapide.
              </p>
            </div>
            <Button asChild className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
              <a href="mailto:support@exportvins.com">
                <Mail className="mr-2 h-4 w-4" />
                Envoyer un e-mail
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>);

};

export default Help;