# Banking Management — Frontend

Interface React pour l'application de gestion bancaire Digital Banking.

---

## Stack technique

| Couche | Technologie |
|---|---|
| UI framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Routing | react-router-dom 7 |
| Formulaires | react-hook-form 7 + zod 4 |
| HTTP | Axios 1 avec intercepteurs JWT |
| Charts | Chart.js 4 + react-chartjs-2 5 |
| Dates | date-fns 4 (locale fr) |
| Styles | CSS Modules (pas de framework CSS) |
| Tests | Vitest 4 + Testing Library + jsdom |

---

## Prérequis

- Node.js ≥ 20
- Backend Spring Boot démarré sur `http://localhost:8086`

---

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev (http://localhost:4200)
npm run dev

# Build de production
npm run build

# Lancer les tests
npm test

# Tests en mode single-run (CI)
npm run test:run
```

---

## Variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```
VITE_API_BASE_URL=http://localhost:8086
```

---

## Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Serveur de développement sur le port 4200 |
| `npm run build` | Compilation TypeScript + bundle Vite |
| `npm run preview` | Prévisualisation du build de production |
| `npm run lint` | Analyse ESLint |
| `npm test` | Tests en mode watch (Vitest) |
| `npm run test:run` | Tests en single-run (pour CI) |

---

## Routes

| Chemin | Composant | Accès |
|---|---|---|
| `/` | Redirect → `/dashboard` | — |
| `/login` | Login | Public |
| `/unauthorized` | Unauthorized | Public |
| `/dashboard` | Dashboard | Authentifié |
| `/customers` | CustomersList | Authentifié |
| `/customers/new` | CustomerForm | Authentifié |
| `/customers/:id/edit` | CustomerForm | Authentifié |
| `/customers/:id/accounts` | CustomerAccounts | Authentifié |
| `/accounts` | AccountSearch | Authentifié |
| `/accounts/:id` | AccountDetails | Authentifié |
| `/users` | UsersList | ADMIN uniquement |
| `/change-password` | ChangePassword | Authentifié |
| `*` | NotFound | — |

---

## Architecture

```
src/
├── api/             # Modules Axios (auth, customers, accounts, dashboard, users)
├── components/      # Composants réutilisables (Badge, Spinner, Tabs, Toast, …)
├── context/         # AuthContext, ToastContext
├── hooks/           # useAuth (re-export)
├── pages/           # Une page = un dossier (*.tsx + *.module.css)
│   ├── Login/
│   ├── Dashboard/
│   ├── Customers/
│   ├── Accounts/
│   ├── Users/
│   └── ChangePassword/
├── styles/          # global.css
├── types/           # Types TypeScript miroir des DTOs Spring
├── utils/           # formatters, loadingCounter
├── App.tsx
├── main.tsx
├── routes.tsx
└── setupTests.ts
```

### Points clés

- **JWT** stocké dans `sessionStorage` sous la clé `access_token`. Tout appel API hors `/auth/login` reçoit automatiquement l'en-tête `Authorization: Bearer <token>`. Un 401 déclenche une déconnexion automatique.
- **LoadingBar** globale câblée via un compteur de module (`loadingCounter.ts`) pour éviter une dépendance circulaire entre Axios et React Context.
- **CSS Modules** : chaque composant possède son propre `.module.css`, aucun framework CSS externe n'est utilisé.
- **Pagination** : côté serveur pour l'historique des opérations, côté client pour les clients (lot unique, 20 par page).
