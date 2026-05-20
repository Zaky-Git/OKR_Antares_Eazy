# Delivery Plan

## Completed Features

### Backend
- [x] Project setup (Gin, GORM, MySQL, env config)
- [x] Database migration (all tables including activity_logs)
- [x] Auth module (register, login, JWT, me, get all users)
- [x] Period module (auto-generate Q1-Q4, get current, ensure year)
- [x] Sprint module (CRUD, activate, complete with review/retro)
- [x] Objective CRUD (with ownership check, reorder)
- [x] Key Result CRUD (with ownership check)
- [x] Initiative nested CRUD (create, children, tree, edit, delete)
- [x] Progress calculation service (leaf → parent → KR → objective)
- [x] Progress update endpoint (with leaf-only validation)
- [x] Cascade soft-delete
- [x] Notification backend (check due dates, create notifications, mark read)
- [x] Dashboard API (quarter + annual)
- [x] Search API (objectives, key results, initiatives, sprints)
- [x] Activity log system (all CRUD operations logged)
- [x] WebSocket (realtime broadcast on activity)

### Frontend
- [x] React Vite project setup with Tailwind CSS
- [x] Auth pages (login, register) — full Tailwind
- [x] App layout with Sidebar + TopBar
- [x] Dashboard page (quarter view + annual view)
- [x] Sprint list page
- [x] Objective list page (with reorder, filter by status, year navigation)
- [x] Objective detail via panel (Key Results + Initiative Tree)
- [x] Sprint create/edit/activate/complete
- [x] Objective create/edit
- [x] Key Result create/edit
- [x] Initiative create/edit + drawer (with sprint assignment)
- [x] Progress update UI (leaf only, inline slider)
- [x] Notification bell + unread count
- [x] Period selector + year navigation (auto-generate)
- [x] Global search (objectives, KR, initiatives, sprints)
- [x] Highlight system (search results, activity log click)
- [x] Activity Log page (/logs) with pagination
- [x] WebSocket hook (realtime query invalidation + toast)
- [x] Drag-and-drop reorder (objectives)

## MVP Definition of Done

All items completed:
- [x] User can register and login
- [x] System auto generates Q1-Q4 for any year
- [x] User can select quarter from period selector
- [x] User can navigate between years
- [x] User can create/activate/complete sprint
- [x] Only 1 sprint ACTIVE per quarter
- [x] Sprint closure with review_note and retro_note
- [x] User can create/edit/delete objective
- [x] User can reorder objectives (drag and drop)
- [x] User can filter objectives by status
- [x] User can create/edit/delete key result
- [x] User can create/edit/delete initiative
- [x] Initiative can have child initiatives (nested)
- [x] Leaf initiative progress is editable manually
- [x] Parent initiative progress is read-only (auto-calculated)
- [x] Key Result progress auto-calculated from initiatives
- [x] Objective progress auto-calculated from key results
- [x] Due date notification appears in web app
- [x] Dashboard summary works (quarter + annual)
- [x] Only creator/assignee can edit/delete
- [x] Global search functional
- [x] Activity log tracks all changes
- [x] WebSocket realtime updates
- [x] Highlight navigation from search/logs

## Testing Strategy

- Automatic QA testing
- Test each CRUD operation via browser
- Test progress calculation chain manually
- Test WebSocket with multiple browser tabs
- Test notification generation via check-due endpoint
