## Page /opportunites — en-tête

1. Le petit texte « Opportunités export » au-dessus du titre devient un bandeau arrondi (forme pilule) avec fond bordeaux #59191F et texte blanc.
2. Suppression de la phrase « Vous êtes importateur ? … » et de son lien vers le formulaire.

Rien d'autre ne change (le formulaire reste accessible par son adresse directe).

### Technique
- `src/pages/Opportunities.tsx` ligne 530 : `inline-block rounded-full px-3 py-1` + couleur via jeton CSS (ajout d'un jeton `--opportunity-badge` = 59191F dans `src/index.css`, texte `primary-foreground`/blanc via jeton).
- Ligne 539 : retrait du `<Link to="/submit-opportunity">`.
