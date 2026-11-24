# lib/ — qui est pour qui ?

Règle simple : le **dossier** dit où le fichier a le droit d'être utilisé.

| Dossier | Utilisé par | Exemples |
|---|---|---|
| `lib/client/` | le **front** (pages, composants) uniquement | api-client, format, validation de formulaires, calendrier, loaders |
| `lib/server/` | le **back** (routes api, controllers, services, repositories) uniquement | container, auth, session, prisma, e-mails, paiement Papi |
| `lib/shared/` | **les deux** (code pur, sans React ni Node) | datetime (heure de Madagascar) |

Règles :
- Un composant ou une page n'importe JAMAIS `@/lib/server/...` (ça embarquerait prisma, les clés secrètes...).
- Le back n'importe JAMAIS `@/lib/client/...`.
- Un fichier utilisé par les deux va dans `lib/shared/`.

## lib/client/
- `api-client.ts` : le seul endroit qui fait un `fetch`
- `navigation.ts` : page d'accueil de chaque rôle
- `payment-rules.ts` : règles de paiement affichées (copie de celles du back)
- `format/` : affichage (prix, dates, statuts, textes, jours)
- `validation/` : vérifications de formulaires
- `calendar/` : couleurs et calculs du calendrier
- `data/` : calculs sur les données (tableau de bord, regroupement des horaires)
- `ui/` : réglages d'interface (loaders Lottie, barre de progression, recherche)

## lib/server/
- `container.ts` : assemble repositories, services et controllers
- `auth/` : jeton, session, secrets, code de vérification, limites de tentatives
- `db/` : prisma et transactions
- `http/` : réponses JSON et erreurs
- `email/` : envoi et modèles d'e-mails
- `payments/` : Papi, règles de paiement
- `booking/` : grille de créneaux, texte
