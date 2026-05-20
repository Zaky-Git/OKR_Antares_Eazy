# Project Structure

## Root

```
/
├── backend/
├── frontend/
└── .kiro/steering/
```

## Backend (Golang)

```
backend/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/          ← env loading, app config
│   ├── database/        ← DB connection, migration
│   ├── middleware/       ← auth JWT, CORS
│   ├── routes/          ← route registration
│   ├── ws/              ← WebSocket hub, client, handler
│   ├── modules/
│   │   ├── activitylog/ ← activity logging service
│   │   ├── auth/
│   │   ├── period/
│   │   ├── sprint/
│   │   ├── objective/
│   │   ├── keyresult/
│   │   ├── initiative/
│   │   ├── notification/
│   │   └── dashboard/
│   └── shared/
│       ├── response/    ← standard API response helper
│       └── utils/       ← helper functions
├── go.mod
├── go.sum
├── .env
├── .env.example
└── .gitignore
```

Each backend module contains:

- handler.go — HTTP handler (parse request, call service, return response)
- service.go — Business logic
- repository.go — Database queries
- model.go — GORM model definition
- dto.go — Request/response DTOs

## Frontend (React Vite + Tailwind)

```
frontend/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   └── queryClient.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ObjectivesPage.tsx
│   │   ├── SprintsPage.tsx
│   │   └── LogsPage.tsx
│   ├── components/          ← Atomic Design (no business logic)
│   │   ├── atomics/         ← Smallest reusable UI elements
│   │   ├── organisms/       ← Complex composed components
│   │   └── templates/       ← Page layout shells
│   ├── guards/              ← Route protection (ProtectedRoute)
│   ├── services/            ← API call functions (axios)
│   ├── hooks/               ← Custom hooks (useWebSocket)
│   ├── stores/              ← Zustand stores (useAuthStore)
│   ├── types/               ← TypeScript interfaces
│   └── vite-env.d.ts       ← Type declarations
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tailwind.config.js
├── postcss.config.js
├── .env
├── .env.example
└── .gitignore
```

## Naming Conventions

- Backend files: snake_case (Go convention with package naming)
- Frontend pages: PascalCase (e.g. DashboardPage.tsx)
- Frontend services: camelCase.service.ts
- Frontend hooks: use[Name].ts
- Frontend stores: use[Name]Store.ts
- Types: PascalCase interface names
