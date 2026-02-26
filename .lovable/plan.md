
## Page Aide & Support — Plan d'implémentation

### What to build
A `/help` page with 3 sections:
1. **Getting started** — step-by-step guide (numbered cards)
2. **FAQ** — accordion with categorized Q&A (profil, campagnes, CRM, abonnement)
3. **Contact support** — email card + link

### Files to create/edit

**1. `src/pages/Help.tsx`** — New page with:
- Header with search hint
- "Premiers pas" section: 4 numbered steps (Créer profil → Ajouter vins → Lancer campagne → Suivre leads)
- FAQ accordion grouped by category (Profil, Campagnes, CRM, Abonnement) using the existing `Accordion` component
- "Contacter le support" card at bottom with mailto link and response time info

**2. `src/App.tsx`** — Add route `/help`

**3. `src/components/AppSidebar.tsx`** — Add "Aide" nav item with `HelpCircle` icon in the navigation group

### FAQ content plan
- **Profil**: Comment bien remplir mon profil ? Quels vins ajouter ? À quoi servent les certifications ?
- **Campagnes**: Comment fonctionne une campagne ? Combien de temps dure la validation ? Que se passe-t-il après ?
- **CRM**: Comment apparaissent les prospects ? Comment gérer le pipeline ?
- **Abonnement**: Quelle est la différence Free/Premium ? Comment changer d'abonnement ?

### Visual design
- Same layout/padding as `Roadmap.tsx`
- Colored icon pills per section (blue for getting started, amber for FAQ, green for contact)
- `Accordion` from existing UI components for FAQ
- `Card` for contact support block
