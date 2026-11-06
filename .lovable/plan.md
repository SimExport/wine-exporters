# Spot vidéo 30 s dans le hero de la landing page

## Constat (lu dans le code)
- `src/pages/LandingPage.tsx` : hero centré (badge, H1, sous-titre, 2 boutons). Le bouton principal du hero et d'autres boutons (en-tête, punchline, tarifs, fin de page) ouvrent tous la démo interactive Supademo via `openDemo`.
- Il n'existe aucune section dédiée « Explorer la plateforme — Démo interactive » : la démo n'est qu'une fenêtre ouverte par ces boutons.
- Aucun fichier MP4 n'a été reçu (ni dans les fichiers envoyés, ni dans les médias du projet).
- Je n'ai trouvé aucun outil de suivi d'audience (type GA, Plausible, PostHog) dans le code du site.

## Ce qui sera construit
1. **Hero en deux colonnes sur ordinateur** (texte à gauche, vignette à droite ; empilé sur mobile, vignette sous les boutons). H1, textes, badge et lien « J'ai déjà un compte » inchangés.
2. **Vignette du spot** : image fixe (première image ou plan clé du spot) au format 16:9, bouton lecture bordeaux, mention « Spot 30 s · en français ». Aucun lecteur vidéo n'est chargé tant qu'on ne clique pas.
3. **Fenêtre vidéo** (dialog accessible : titre lu par les lecteurs d'écran, fermeture Échap/bouton, focus géré) : lecteur `<video controls>` qui démarre au clic seulement (pas d'autoplay sur la page), son activé, arrêt à la fermeture. Sous la vidéo : CTA « Trouver mes importateurs gratuitement » vers `/market-analysis`.
4. **CTA du hero** : le bouton principal devient « Trouver mes importateurs gratuitement » → `/market-analysis` ; le bouton secondaire « Découvrir » reste.
5. **Nouvelle section « Explorer la plateforme — Démo interactive »** placée après la section fonctionnalités, avec le bouton existant qui ouvre Supademo. Les autres boutons démo (en-tête, punchline, tarifs, fin) continuent d'ouvrir Supademo comme aujourd'hui.
6. **FR/EN** : tous les nouveaux textes dans les fichiers de traduction. En anglais, la vignette indique « 30-second spot · in French » — jamais présenté comme doublé.
7. **Si le fichier n'est pas encore disponible** : une seule constante pointe vers la vidéo. Tant qu'elle est vide, la vignette et la fenêtre ne s'affichent pas du tout ; le hero garde la mise en page actuelle avec le nouveau CTA. Si la vidéo échoue au chargement, la fenêtre affiche un message clair et le CTA, jamais un lecteur noir cassé.
8. **Suivi d'audience** : aucun outil installé, donc rien n'est ajouté. Un petit point d'appel (ouverture du spot, lecture, fin, clic CTA) restera sans effet, prêt si un outil est ajouté plus tard.

## Ce dont j'ai besoin de votre part
- Envoyer `WineExporters_spot_30s_V6.mp4` dans le chat (3,6 Mo, ça passe).
- Optionnel : une image de vignette souhaitée ; sinon je prends une image du spot.

## Détails techniques
- MP4 téléversé via `lovable-assets` → `src/assets/wineexporters_spot_30s.mp4.asset.json` ; vignette extraite par ffmpeg (WebP, ~1280 px) également en asset. Vérification ffprobe (30 s, H.264, 1920x1080).
- Composant `src/components/landing/SpotVideo.tsx` (vignette + Dialog shadcn), `preload="none"`, `playsInline`, `poster`, lecteur monté uniquement à l'ouverture, `onError` → état de repli.
- Prérendu non concerné (la home n'est pas prérendue) ; aucun JS ajouté au chargement initial hors l'image.
- Fichiers touchés : `LandingPage.tsx`, nouveau `SpotVideo.tsx`, `fr.json`, `en.json`. Aucune autre page, ni brochure, ni Supabase.
- Vérifs : typecheck, build, capture Playwright desktop + mobile (FR et EN), ouverture/fermeture de la fenêtre, test du cas « fichier absent ».
