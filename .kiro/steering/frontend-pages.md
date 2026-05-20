# Frontend Pages — Complete Specification

## Global Layout

### AppLayout (Protected)
```
┌─────────────────────────────────────────────────────────┐
│ Sidebar (250px fixed)  │  Main Content (flex)           │
│                        │                                │
│ Logo: "eazy OKR"       │  ┌─ Header Bar ─────────────┐ │
│                        │  │ Page Title    [🔔 3] [👤] │ │
│ Navigation:            │  └──────────────────────────-┘ │
│  • Dashboard           │                                │
│  • Objectives          │  ┌─ Page Content ────────────┐ │
│  • Sprints             │  │                           │ │
│                        │  │  (page-specific content)  │ │
│ ─────────────────      │  │                           │ │
│ Profile:               │  │                           │ │
│  Avatar + Name         │  │                           │ │
│  Email                 │  │                           │ │
│  [Keluar]              │  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Header Bar (inside AppLayout)
- Left: Page title (dynamic)
- Right: Notification Bell (🔔 + unread count badge) + User avatar dropdown
- Notification Bell click → Notification Dropdown (overlay)

### Notification Dropdown
- Position: absolute, anchored to bell icon, top-right
- Width: 360px, max-height: 400px, scrollable
- Header: "Notifikasi" + [Tandai semua dibaca] button
- List items: 
  - Icon (type-based color), Title, Message, relative time
  - Unread: bold + blue dot indicator
  - Click item → mark as read
- Empty state: "Tidak ada notifikasi"
- API: `GET /notifications?page=1&limit=20` (polling 30s), `GET /notifications/unread-count`

### AuthLayout (Public)
- Full viewport, no sidebar
- Direct render of page content (Login/Register own their full layout)

---

## Page 1: `/login` — Login

### Layout
```
┌──────────────────────┬──────────────────────┐
│   LEFT (50%, blue)   │  RIGHT (50%, white)  │
│                      │                      │
│  Logo "eazy OKR"     │  "Masuk ke Akun      │
│                      │   Anda"              │
│  "Selamat Datang     │                      │
│   Kembali!"          │  "Kelola OKR dan     │
│                      │   pantau kinerja     │
│  Description text    │   tim Anda"          │
│                      │                      │
│  ┌─ Feature 1 ────┐ │  [📧 Email input]    │
│  │ ✓ Pantau...    │ │                      │
│  └────────────────┘ │  [🔒 Password input] │
│  ┌─ Feature 2 ────┐ │                      │
│  │ ✓ Kolaborasi.. │ │  [   Masuk   ]       │
│  └────────────────┘ │                      │
│  ┌─ Feature 3 ────┐ │  "Belum punya akun?  │
│  │ ✓ Keputusan.. │ │   Daftar"            │
│  └────────────────┘ │                      │
└──────────────────────┴──────────────────────┘
```

### Data/API
- `POST /api/auth/login` → { email, password }
- On success: store token + user in Zustand/localStorage, redirect `/dashboard`
- On error: toast error message

### Behavior
- If already authenticated → redirect `/dashboard`
- Validation: email required, password required
- Button disabled during submit

---

## Page 2: `/register` — Register

### Layout
Same split layout as Login, left panel identical.

Right panel:
```
"Buat Akun Baru"
"Mulai kelola OKR tim Anda"

[👤 Name input]
[📧 Email input]  
[🔒 Password input]

[   Daftar   ]

"Sudah punya akun? Masuk"
```

### Data/API
- `POST /api/auth/register` → { name, email, password }
- On success: toast "Registrasi berhasil", redirect `/login`
- On error: toast error

### Validation
- Name: required, max 100
- Email: required, valid email format
- Password: required, min 6 chars

---

## Page 3: `/dashboard` — Dashboard

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: "Dashboard"                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Quarter Selector ▼]   [Quarter View | Annual View]│
│                                                     │
│  ── Quarter View ──────────────────────────────     │
│                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                  │
│  │Total│ │ Avg │ │ Avg │ │Over-│                   │
│  │Obj  │ │Prog │ │Conf │ │due  │                   │
│  │  5  │ │67.2%│ │ 7.1 │ │  3  │                   │
│  └─────┘ └─────┘ └─────┘ └─────┘                  │
│                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐                          │
│  │On   │ │At   │ │Off  │                           │
│  │Track│ │Risk │ │Track│                           │
│  │  3  │ │  1  │ │  1  │                           │
│  └─────┘ └─────┘ └─────┘                          │
│                                                     │
│  ── Recent Updates ─────────────────────────────    │
│  │ Initiative "Fix auth" → 30% → 60% (2h ago) │    │
│  │ Initiative "API docs" → 0% → 25% (5h ago)  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Annual View ───────────────────────────────     │
│  (shown when Annual tab is active)                  │
│                                                     │
│  Annual Summary Cards:                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│  │Total │ │ Avg  │ │Compl.│ │Comp. │              │
│  │Obj   │ │Prog  │ │Obj   │ │Rate  │              │
│  │ 12   │ │52.3% │ │  4   │ │33.3% │              │
│  └──────┘ └──────┘ └──────┘ └──────┘              │
│                                                     │
│  Quarter Comparison:                                │
│  ┌────────┬─────┬─────┬──────┬────────┐           │
│  │Quarter │ Obj │Prog │Conf  │Status  │            │
│  ├────────┼─────┼─────┼──────┼────────┤           │
│  │ Q1     │  3  │82%  │ 7.5  │2✓ 1⚠  │            │
│  │ Q2     │  5  │67%  │ 7.1  │3✓ 1⚠ 1✗│           │
│  │ Q3     │  4  │12%  │ 5.0  │1✓ 2⚠ 1✗│           │
│  │ Q4     │  0  │ -   │  -   │  -     │            │
│  └────────┴─────┴─────┴──────┴────────┘           │
└─────────────────────────────────────────────────────┘
```

### Data/API
- Quarter View: `GET /api/dashboard?period_id={selectedPeriodId}`
- Annual View: `GET /api/dashboard/annual?year={selectedYear}`
- Period list: `GET /api/periods` (for selector)
- Current period: `GET /api/periods/current` (for default)

### Behavior
- Default: current quarter selected, Quarter View active
- Quarter Selector: dropdown with all periods (e.g. "2026 Q2")
- Tab switch: instant (no page reload), different API call
- Annual View: year derived from selected period, or separate year selector
- Recent Updates: show initiative name, progress before → after, relative time

---

## Page 4: `/objectives` — Objectives List

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: "Objectives"                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Quarter Selector ▼]         [+ Buat Objective]    │
│                                                     │
│  ┌─ Objective Card ────────────────────────────┐    │
│  │ "Increase system reliability"               │    │
│  │ ████████████░░░░░ 67.2%    Confidence: 8/10 │    │
│  │ [ON_TRACK]              Created 3 days ago  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Objective Card ────────────────────────────┐    │
│  │ "Reduce bug count"                          │    │
│  │ ████░░░░░░░░░░░░░ 25.0%    Confidence: 5/10│    │
│  │ [AT_RISK]               Created 5 days ago  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [< 1 2 3 >] pagination                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Create Objective Modal
```
┌─ Buat Objective ──────────────────────────┐
│                                     [✕]   │
│  Title *                                  │
│  [________________________]               │
│                                           │
│  Description                              │
│  [________________________]               │
│  [________________________]               │
│                                           │
│  Confidence Level (0-10)                  │
│  [5 ─────●──── ] 7                       │
│                                           │
│  [Batal]              [Simpan]            │
└───────────────────────────────────────────┘
```

### Data/API
- List: `GET /api/objectives?period_id={id}&page={p}&limit=10`
- Create: `POST /api/objectives` → { period_id, title, description, confidence_level }

### Behavior
- Click card → navigate to `/objectives/:id`
- Create button → open modal
- Period auto-derived from selector
- Cards show: title, progress bar, confidence, status badge, created time
- Pagination at bottom

---

## Page 5: `/objectives/:id` — Objective Detail (Main Work Page)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "← Objectives / Objective Detail"                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Objective Header ─────────────────────────────────────┐ │
│  │ Title: "Increase system reliability"  [Edit] [Delete]  │ │
│  │ Description: "Reduce downtime..."                      │ │
│  │ ██████████░░░░░░░ 67.2%  Confidence: 8/10  [ON_TRACK] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Key Results ──────────────────────────────────────────┐ │
│  │ [+ Tambah Key Result]                                  │ │
│  │                                                        │ │
│  │ ┌─ KR 1 ───────────────────────────────────────────┐  │ │
│  │ │ "Reduce bugs from 50 to 10"  [Edit] [Delete]     │  │ │
│  │ │ Target: 50 bugs │ Current: 15 │ Progress: 30%    │  │ │
│  │ │ Confidence: 7/10  [ON_TRACK]                     │  │ │
│  │ │                                                   │  │ │
│  │ │ ── Initiatives ─── [+ Tambah Initiative]          │  │ │
│  │ │ ├── Fix auth bugs [IN_PROGRESS] 60%  📅 Apr 20   │  │ │
│  │ │ │   ├── Fix token expiry [DONE] 100%             │  │ │
│  │ │ │   └── Fix password reset [TODO] 0%  📅 Apr 19  │  │ │
│  │ │ ├── Optimize queries [TODO] 0%  📅 Apr 25        │  │ │
│  │ │ └── [progress auto: 60%]                         │  │ │
│  │ └───────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │ ┌─ KR 2 ───────────────────────────────────────────┐  │ │
│  │ │ "Increase uptime to 99.9%"  [Edit] [Delete]      │  │ │
│  │ │ Target: 99.9% │ Current: 98.5 │ Progress: 98.6%  │  │ │
│  │ │ ...                                               │  │ │
│  │ └───────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Initiative Tree Node (per item)
```
├── [▶] Initiative Title          [Status] ██░░ 60%  📅 Due  [⋮]
│       Assignee: User Name │ Sprint: Sprint 1
│       [Progress: ═══════●═══ 60% ] ← only if leaf
│       [Auto-calculated from children] ← only if parent
```

Node actions menu [⋮]:
- Edit → open Drawer
- Add Child → open Drawer
- Delete → confirm dialog

### Initiative Drawer (slide from right, 400px width)
```
┌─ Initiative ──────────────────────┐
│                             [✕]   │
│  Title *                          │
│  [________________________]       │
│                                   │
│  Description                      │
│  [________________________]       │
│                                   │
│  Assignee                         │
│  [Select user ▼]                  │
│                                   │
│  Sprint                           │
│  [Select sprint ▼] (optional)     │
│                                   │
│  Due Date                         │
│  [📅 2026-04-20]                  │
│                                   │
│  Status (edit mode only)          │
│  [Select: TODO ▼]                 │
│                                   │
│  ── Progress (leaf only) ──       │
│  [═══════════●═══ ] 60%           │
│  Note: [________________]         │
│  Blocker: [______________]        │
│                                   │
│  [Batal]            [Simpan]      │
└───────────────────────────────────┘
```

### Edit Objective Modal
```
┌─ Edit Objective ──────────────────────────┐
│                                     [✕]   │
│  Title *                                  │
│  [Increase system reliability____]        │
│                                           │
│  Description                              │
│  [Reduce downtime and improve___]         │
│                                           │
│  Confidence Level                         │
│  [─────────●── ] 8                        │
│                                           │
│  Status                                   │
│  [ON_TRACK ▼]                             │
│                                           │
│  [Batal]              [Simpan]            │
└───────────────────────────────────────────┘
```

### Create/Edit Key Result Modal
```
┌─ Key Result ──────────────────────────────┐
│                                     [✕]   │
│  Title *                                  │
│  [Reduce bugs from 50 to 10_____]         │
│                                           │
│  Description                              │
│  [________________________]               │
│                                           │
│  Target Value *        Metric Unit        │
│  [50_________]         [bugs fixed___]    │
│                                           │
│  Current Value                            │
│  [15_________]                            │
│                                           │
│  Confidence Level                         │
│  [─────────●── ] 7                        │
│                                           │
│  [Batal]              [Simpan]            │
└───────────────────────────────────────────┘
```

### Delete Confirm Dialog
```
┌─ Konfirmasi ─────────────────────┐
│                                   │
│  Apakah Anda yakin ingin          │
│  menghapus "[item name]"?         │
│                                   │
│  Tindakan ini tidak dapat         │
│  dibatalkan.                      │
│                                   │
│  [Batal]        [Hapus]           │
└───────────────────────────────────┘
```

### Data/API
- Objective: `GET /api/objectives/:id`
- Edit: `PATCH /api/objectives/:id`
- Delete: `DELETE /api/objectives/:id`
- Create KR: `POST /api/objectives/:id/key-results`
- Edit KR: `PATCH /api/key-results/:id`
- Delete KR: `DELETE /api/key-results/:id`
- Initiative tree: `GET /api/key-results/:id/initiative-tree` (per KR)
- Create initiative: `POST /api/key-results/:id/initiatives`
- Create child: `POST /api/initiatives/:id/children`
- Edit initiative: `PATCH /api/initiatives/:id`
- Update progress: `PATCH /api/initiatives/:id/progress`
- Delete initiative: `DELETE /api/initiatives/:id`

### Behavior
- Edit/Delete buttons only visible if user is creator (compare created_by with current user id)
- Initiative edit/delete visible if user is creator OR assignee
- Progress slider only for leaf initiatives (no children)
- Parent initiatives show "Auto-calculated" badge, no slider
- After progress update → tree re-fetches, KR progress updates, objective progress updates
- Drawer closes after save, data invalidates via TanStack Query
- Tree default expanded 2 levels, collapsible

---

## Page 6: `/sprints` — Sprints List

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: "Sprints"                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Quarter Selector ▼]             [+ Buat Sprint]   │
│                                                     │
│  ┌─ Sprint Card ───────────────────────────────┐    │
│  │ "Sprint 1"                    [ACTIVE]      │    │
│  │ 1 Apr 2026 — 14 Apr 2026                   │    │
│  │ Goal: Complete core OKR features            │    │
│  │                          [Complete Sprint]  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Sprint Card ───────────────────────────────┐    │
│  │ "Sprint 2"                    [PLANNING]    │    │
│  │ 15 Apr 2026 — 28 Apr 2026                  │    │
│  │ Goal: -                                     │    │
│  │               [Activate] [Edit] [Delete]    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ Sprint Card ───────────────────────────────┐    │
│  │ "Sprint 0"                    [COMPLETED]   │    │
│  │ 1 Mar 2026 — 14 Mar 2026                   │    │
│  │ Goal: Setup project                         │    │
│  │ Review: "All tasks done"                    │    │
│  │ Retro: "Need better estimation"            │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Create Sprint Modal
```
┌─ Buat Sprint ─────────────────────────────┐
│                                     [✕]   │
│  Name *                                   │
│  [Sprint 3________________]               │
│                                           │
│  Goal                                     │
│  [________________________]               │
│                                           │
│  Start Date *          End Date *         │
│  [📅 2026-04-29]      [📅 2026-05-12]    │
│                                           │
│  ⓘ Tanggal harus dalam range quarter     │
│    (Q2: 1 Apr - 30 Jun 2026)             │
│                                           │
│  [Batal]              [Simpan]            │
└───────────────────────────────────────────┘
```

### Complete Sprint Modal
```
┌─ Selesaikan Sprint ───────────────────────┐
│                                     [✕]   │
│  Sprint: "Sprint 1"                       │
│                                           │
│  Review Note                              │
│  Apa yang berhasil diselesaikan?          │
│  [________________________]               │
│  [________________________]               │
│                                           │
│  Retro Note                               │
│  Apa yang perlu diperbaiki?               │
│  [________________________]               │
│  [________________________]               │
│                                           │
│  [Batal]          [Selesaikan Sprint]     │
└───────────────────────────────────────────┘
```

### Data/API
- List: `GET /api/sprints?period_id={id}`
- Create: `POST /api/sprints` → { period_id, name, goal, start_date, end_date }
- Edit: `PATCH /api/sprints/:id`
- Activate: `PATCH /api/sprints/:id/activate`
- Complete: `PATCH /api/sprints/:id/complete` → { review_note, retro_note }
- Delete: `DELETE /api/sprints/:id`

### Behavior
- Action buttons per status:
  - PLANNING: [Activate] [Edit] [Delete]
  - ACTIVE: [Complete Sprint]
  - COMPLETED: no actions (read-only, show review/retro notes)
- Activate shows confirm if needed
- Cannot activate if another sprint is ACTIVE → show error toast
- Cannot delete ACTIVE sprint
- Completed sprints show review + retro notes inline
- Cards sorted by start_date ASC

---

## Page 7: `/sprints/:id` — Sprint Detail

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: "← Sprints / Sprint 1"                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Sprint Header ────────────────────────────────┐ │
│  │ "Sprint 1"                        [ACTIVE]     │ │
│  │ 1 Apr 2026 — 14 Apr 2026                      │ │
│  │ Goal: Complete core OKR features               │ │
│  │                    [Complete Sprint] [Edit]     │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ Sprint Initiatives ───────────────────────────┐ │
│  │ Initiatives in this sprint:                    │ │
│  │                                                │ │
│  │ ┌──────────────────────────────────────────┐   │ │
│  │ │ "Fix auth bugs"  [IN_PROGRESS]  60%      │   │ │
│  │ │  Assignee: Zaky │ Due: Apr 20            │   │ │
│  │ │  Objective: "Increase reliability"       │   │ │
│  │ │  Key Result: "Reduce bugs"               │   │ │
│  │ └──────────────────────────────────────────┘   │ │
│  │                                                │ │
│  │ ┌──────────────────────────────────────────┐   │ │
│  │ │ "Optimize queries"  [TODO]  0%           │   │ │
│  │ │  Assignee: Zaky │ Due: Apr 25            │   │ │
│  │ └──────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ── If COMPLETED ──                                 │
│  ┌─ Sprint Review ────────────────────────────────┐ │
│  │ Review: "Completed auth module, period gen..." │ │
│  │ Retro: "Need better task estimation..."        │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Data/API
- Sprint detail: `GET /api/sprints/:id`
- Initiatives: query from initiative tree where sprint_id matches (frontend filter from objective detail data, or dedicated query if needed)

### Behavior
- Shows all initiatives assigned to this sprint (across all objectives/KRs)
- Each initiative shows parent objective + KR context
- Action buttons same logic as list page
- If COMPLETED: show review + retro notes section

---

## Component Summary

### Modals (centered overlay):
1. Create Objective Modal
2. Edit Objective Modal
3. Create Key Result Modal
4. Edit Key Result Modal
5. Create Sprint Modal
6. Edit Sprint Modal
7. Complete Sprint Modal
8. Delete Confirm Dialog

### Drawers (slide from right, 420px):
1. Create Initiative Drawer
2. Edit Initiative Drawer (includes progress update for leaf)

### Shared Components:
- PeriodSelector (dropdown, used in Dashboard, Objectives, Sprints)
- ProgressBar (reusable, different sizes)
- StatusBadge (colored badge based on status)
- ConfidenceIndicator (number /10 with color coding)
- NotificationBell + NotificationDropdown
- InitiativeTreeNode (recursive component)
- EmptyState (illustration + message + action button)
- DeleteConfirmDialog (reusable)

---

## Color Coding

| Status | Color |
|--------|-------|
| PLANNING | Gray (#E5E7EB bg, #374151 text) |
| ON_TRACK | Green (#D1FAE5 bg, #065F46 text) |
| AT_RISK | Yellow (#FEF3C7 bg, #92400E text) |
| OFF_TRACK | Red (#FEE2E2 bg, #991B1B text) |
| DONE | Blue (#DBEAFE bg, #1E40AF text) |
| ARCHIVED | Gray (#F3F4F6 bg, #6B7280 text) |
| TODO | Gray (#E5E7EB bg, #374151 text) |
| IN_PROGRESS | Indigo (#E0E7FF bg, #3730A3 text) |
| BLOCKED | Red (#FEE2E2 bg, #991B1B text) |
| CANCELLED | Gray (#F3F4F6 bg, #6B7280 text) |
| ACTIVE | Green (#D1FAE5 bg, #065F46 text) |
| COMPLETED | Blue (#DBEAFE bg, #1E40AF text) |

## Typography
- Font: Plus Jakarta Sans
- Primary color: #194FBC
- Headings: 700-800 weight
- Body: 400-500 weight

## Spacing
- Page padding: 2rem
- Card padding: 1.25rem
- Card border-radius: 12px
- Card shadow: 0 1px 3px rgba(0,0,0,0.06)
- Card border: 1px solid #E5E7EB
- Gap between cards: 0.75rem
- Section gap: 2rem
