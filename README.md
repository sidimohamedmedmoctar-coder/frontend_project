# Banking Management

Projet de gestion bancaire — Backend Spring Boot + Frontend React.

## Structure

- `backend/digital-banking/` : API REST Spring Boot 3.5.14
- `frontend/`                : SPA React 18 + Vite + TypeScript

## Lancement

1. Backend : `cd backend/digital-banking && mvn spring-boot:run`
2. Frontend : `cd frontend && npm run dev`
3. Ouvrir http://localhost:4200

## Identifiants par défaut

| Utilisateur | Mot de passe | Rôle      |
|-------------|-------------|------------|
| superadmin  | 12345       | SuperAdmin |
| admin       | -           | USER       |
| user        | -           | USER       |

## Stack technique

| Couche    | Technologie                                      |
|-----------|--------------------------------------------------|
| Backend   | Java 21, Spring Boot 3.5, Spring Security, JWT   |
| Frontend  | React 18, Vite, TypeScript, CSS Modules          |
| HTTP      | Axios, React Router DOM v6                       |
| Formulaires | React Hook Form + Zod                          |
| Graphiques | Chart.js + react-chartjs-2                      |
