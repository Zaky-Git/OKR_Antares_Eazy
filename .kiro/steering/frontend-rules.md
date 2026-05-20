# Frontend Rules

## Stack

- React 18+ with Vite
- TypeScript strict mode
- React Router v6
- TanStack Query v5
- React Hook Form
- Zustand (auth/global state)
- react-hot-toast
- Tailwind CSS
- @dnd-kit (drag and drop for reordering)

## Styling

- Tailwind CSS utility classes for all styling
- Tailwind config defines:
  - Primary color: #194FBC (with hover and light variants)
  - Font family: Plus Jakarta Sans as default sans
- Use Tailwind arbitrary values for specific pixel sizes when needed (e.g. `text-[0.82rem]`)
- Follow consistent spacing: p-4/p-5 for cards, gap-3/gap-4 between elements
- Card styles: bg-white border border-gray-200 rounded-xl/rounded-2xl

## Component Architecture — Atomic Design

All UI components MUST follow the Atomic Design methodology. Non-UI logic (guards, hooks, stores) lives outside `components/`.

### Hierarchy (strict):

```
atomics/    → Smallest indivisible UI elements. No business logic. No API calls.
              Examples: Button, Input, Textarea, Select, Modal, Spinner, Badge, ProgressBar, Dropdown
              
organisms/  → Composed from atomics + custom markup. May have local state, API calls.
              Examples: Sidebar, TopBar, ObjectivePanel, KeyResultPanel, InitiativePanel, Modals

templates/  → Page shells that define layout structure (slots for content).
              Examples: AppLayout, AuthLayout
              
pages/      → Full page components (outside components/). Compose organisms + templates.
              Examples: DashboardPage, ObjectivesPage, LoginPage
```

### Rules:

1. **Always use atomic components** — Never write raw `<button>`, `<input>`, `<select>`, or `<textarea>` in pages/organisms. Use `Button`, `Input`, `Select`, `Textarea` from atomics.
2. **Atomics are pure UI** — No API calls, no business logic, no state management. Only props in, render out.
3. **Organisms compose atomics** — Organisms can import from atomics and use them together with logic.
4. **Templates define layout** — No content, only structure (sidebar slot, main content slot, etc.).
5. **Pages compose everything** — Pages import organisms and optionally atomics for simple inline elements.
6. **Guards live in `src/guards/`** — Not in components. They are route logic, not UI.
7. **Flat file structure in atomics** — One `.tsx` file per component, no subfolders, no SCSS.
8. **Barrel export** — Import atomics via `from '../components/atomics'` using the index.ts barrel.

### Available Atomics:

| Component | Props | Usage |
|-----------|-------|-------|
| Button | variant, size, isLoading, disabled | All clickable actions |
| Input | label, error, iconLeft, ref forwarded | All text inputs |
| Textarea | label, error, ref forwarded | Multi-line input |
| Select | label, error, options, placeholder | Native select dropdown |
| Dropdown | options, value, onChange, placeholder | Custom styled dropdown |
| Modal | open, onClose, title, size | Overlay dialogs |
| Spinner | size | Loading indicators |
| Badge | children, variant | Status labels |
| ProgressBar | value, size | Progress visualization |

## Routes

```
/login              — public
/register           — public
/dashboard          — protected (quarter + annual view)
/objectives         — protected (list with reorder, filter, search highlight)
/sprints            — protected (list with highlight)
/logs               — protected (activity log full page)
/notifications      — protected
```

## Auth State (Zustand)

```ts
interface AuthStore {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}
```

Store token in localStorage. Zustand store hydrates from localStorage on app load.

## API Services

All services use axios instance with:
- baseURL from VITE_API_BASE_URL
- Authorization header from token in store
- Response interceptor for 401 → logout

Services:
- auth.service.ts
- period.service.ts
- sprint.service.ts
- objective.service.ts
- keyResult.service.ts
- initiative.service.ts
- notification.service.ts
- dashboard.service.ts

## WebSocket

- `hooks/useWebSocket.ts` — connects to `ws://{host}/api/ws`
- Auto-reconnect on disconnect (3s delay)
- On message: invalidates relevant TanStack Query caches
- Shows toast to other users (not own actions)
- Activated in AppLayout (always running while logged in)

## TanStack Query Conventions

- Query keys: `['entity', params]` e.g. `['objectives', periodId]`
- Mutations invalidate related queries on success
- WebSocket also invalidates queries for realtime sync

## Form Handling (React Hook Form)

- Use `useForm` with TypeScript generics for type safety
- Validation via `register` with rules
- Show errors inline

## Toast

- Success: `toast.success("message")`
- Error: `toast.error("message")`
- WebSocket notifications: `toast("message", { icon })`

## Search

- Global search in TopBar
- Backend: `GET /api/search?q=keyword` — searches objectives, key results, initiatives, sprints
- Frontend: debounce 300ms, dropdown results with type icons
- Click result → navigate to relevant page with highlight query param

## Highlight System

- URL query params: `highlight` (initiative), `highlightObj` (objective), `highlightKR` (key result), `highlightSprint` (sprint)
- Apply ring-2 ring-primary animate-pulse for 4 seconds
- Auto-clear after timeout

## UI Behavior

- If initiative has children: hide manual progress input, show "Auto-calculated from child initiatives"
- If initiative has no children (leaf): show manual progress input
- Loading state: spinner animation
- Empty state: descriptive message with action button
- Drag to reorder: all cards collapse on drag start
- Year navigation: arrow buttons beside quarter tabs, auto-generate periods if not exist

## Activity Log

- `GET /api/logs?page=&limit=` — all activity from activity_logs table
- Shows in dashboard (latest 5) and dedicated /logs page (paginated)
- Tracks: CREATE, UPDATE, DELETE, PROGRESS_UPDATE, STATUS_CHANGE, ASSIGN, ACTIVATE, COMPLETE
- Entity types: OBJECTIVE, KEY_RESULT, INITIATIVE, SPRINT
- Click log item → navigate to source with highlight

## TypeScript Types

```ts
interface User { id: number; name: string; email: string }
interface Period { id: number; year: number; quarter: string; start_date: string; end_date: string; is_current: boolean }
interface Sprint { id: number; period_id: number; name: string; goal: string | null; start_date: string; end_date: string; status: string; review_note: string | null; retro_note: string | null; created_by: number; created_at: string; updated_at: string }
interface Objective { id: number; period_id: number; title: string; description: string | null; progress: number; status: string; created_by: number; created_at: string; updated_at: string }
interface KeyResult { id: number; objective_id: number; title: string; description: string | null; target_value: number; current_value: number; metric_unit: string | null; progress: number; status: string; created_by: number; created_at: string; updated_at: string }
interface Initiative { id: number; key_result_id: number; sprint_id: number | null; parent_id: number | null; title: string; description: string | null; assignee_id: number | null; progress: number; status: string; due_date: string | null; created_by: number; created_at: string; updated_at: string; children?: Initiative[] }
interface InitiativeUpdate { id: number; initiative_id: number; user_id: number; progress_before: number; progress_after: number; note: string | null; blocker: string | null; created_at: string }
interface Notification { id: number; user_id: number; type: string; title: string; message: string; entity_type: string; entity_id: number; is_read: boolean; created_at: string; read_at: string | null }
interface DashboardSummary { total_objectives: number; avg_progress: number; on_track: number; at_risk: number; off_track: number; overdue_initiatives: number; recent_updates: InitiativeUpdate[] }
interface AnnualDashboard { year: number; annual_summary: { total_objectives: number; avg_progress: number; avg_confidence: number; completed_objectives: number; completion_rate: number; total_initiatives: number; total_overdue: number }; quarters: QuarterSummary[] }
interface QuarterSummary { quarter: string; period_id: number; total_objectives: number; avg_progress: number; avg_confidence: number; on_track: number; at_risk: number; off_track: number; done: number }
```
