# Tech Stack

## Backend

- Language: Golang (1.21+)
- Framework: Gin
- ORM: GORM
- Database: MySQL 8.0+
- Auth: JWT
- API Style: REST
- WebSocket: gorilla/websocket (realtime updates)

## Frontend

- Framework: React 18+ with Vite
- Language: TypeScript
- Router: React Router v6
- Data Fetching: TanStack Query v5
- Form Handling: React Hook Form
- State Management: Zustand (for auth/global state)
- Toast: react-hot-toast
- Styling: Tailwind CSS
- Drag & Drop: @dnd-kit/core + @dnd-kit/sortable
- Component Architecture: Functional components with hooks

## Realtime

- WebSocket for live updates (gorilla/websocket backend, native WebSocket frontend)
- When any user makes a change, all connected clients receive the update
- Frontend auto-invalidates TanStack Query caches on WS message
- Toast notification shown to other users

## Notification

- Web in-app notification
- WebSocket broadcast for instant updates
- Polling as fallback (TanStack Query refetch interval 30s for notification count)

## Pagination

- Format: page/limit
- Default: page=1, limit=10

## Delete Strategy

- Soft delete (deleted_at column) for all main entities
- Use GORM soft delete feature

## Environment Variables

Backend .env:

```
APP_PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=okr_antares_eazy
JWT_SECRET=change-this-secret
```

Frontend .env:

```
VITE_API_BASE_URL=http://localhost:8080/api
```

## Package Managers

- Backend: go modules
- Frontend: npm
