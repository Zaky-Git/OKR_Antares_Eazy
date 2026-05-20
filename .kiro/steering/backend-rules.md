# Backend Rules

## Architecture Pattern

Use Gin handler → service → repository pattern.

- Handler: parse request, validate input, call service, return response, log activity
- Service: business logic, progress calculation, notification triggers
- Repository: database queries only (GORM)

Do NOT put business logic in handler.
Do NOT put DB queries in service.

## API Response Format

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Success with pagination:

```json
{
  "success": true,
  "message": "Success",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "total_pages": 5
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```

## HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (not owner/assignee)
- 404: Not Found
- 422: Unprocessable Entity (business rule violation)
- 500: Internal Server Error

## Middleware

Protected endpoints require JWT auth middleware.

Public endpoints (no auth):
- POST /api/auth/register
- POST /api/auth/login
- GET /api/ws (WebSocket, no auth for simplicity)

All other endpoints require auth.

## Endpoints

Auth:
- POST /api/auth/register
- POST /api/auth/login
- GET  /api/auth/me
- GET  /api/users

Period:
- GET  /api/periods
- GET  /api/periods/current
- POST /api/periods/ensure-current-year
- POST /api/periods/ensure-year

Sprint:
- GET    /api/sprints?period_id=
- POST   /api/sprints
- GET    /api/sprints/:id
- PATCH  /api/sprints/:id
- PATCH  /api/sprints/:id/activate
- PATCH  /api/sprints/:id/complete
- DELETE /api/sprints/:id

Dashboard:
- GET /api/dashboard?period_id=
- GET /api/dashboard/annual?year=

Search:
- GET /api/search?q=

Activity Logs:
- GET /api/logs?page=&limit=

Objective:
- GET    /api/objectives?period_id=&page=&limit=
- POST   /api/objectives
- GET    /api/objectives/:id
- PATCH  /api/objectives/:id
- DELETE /api/objectives/:id
- PUT    /api/objectives-reorder

Key Result:
- GET    /api/objectives/:id/key-results
- POST   /api/objectives/:id/key-results
- PATCH  /api/key-results/:id
- DELETE /api/key-results/:id

Initiative:
- POST   /api/key-results/:key_result_id/initiatives
- POST   /api/initiatives/:id/children
- GET    /api/key-results/:id/initiative-tree
- GET    /api/initiatives/my-active-sprint?period_id=
- PATCH  /api/initiatives/:id
- PATCH  /api/initiatives/:id/progress
- DELETE /api/initiatives/:id

Notification:
- GET   /api/notifications?page=&limit=
- GET   /api/notifications/unread-count
- PATCH /api/notifications/:id/read
- PATCH /api/notifications/read-all
- POST  /api/notifications/check-due-initiatives

WebSocket:
- GET /api/ws (upgrade to WebSocket)

## WebSocket

- Uses gorilla/websocket
- Hub pattern: manages all connected clients
- Broadcast on every activity log creation
- Message format: `{ type: "activity", action, entity_type, entity_id, entity_title, user_id, description }`
- Client ping/pong keepalive (60s timeout)

## Activity Logging

Every CUD operation logs to `activity_logs` table via `activitylog.Service.Log()`.

Actions: CREATE, UPDATE, DELETE, PROGRESS_UPDATE, STATUS_CHANGE, ASSIGN, ACTIVATE, COMPLETE
Entities: OBJECTIVE, KEY_RESULT, INITIATIVE, SPRINT

After logging, message is broadcast to all WebSocket clients.

## Ownership Rules

- Only creator (created_by) can edit/delete objectives, key results
- Only creator OR assignee (assignee_id) can edit/delete initiatives
- Return 403 if user is not owner/assignee

## Soft Delete

- Use GORM soft delete (deleted_at)
- DELETE endpoints set deleted_at, not hard delete
- All queries must exclude soft-deleted records (GORM handles this automatically)
- Cascade: deleting objective soft-deletes its key_results and their initiatives

## Transaction Rules

- Progress recalculation must run in a DB transaction
- Cascade soft-delete must run in a DB transaction
- Initiative progress update → recalculate parent → recalculate key result → recalculate objective (all in one transaction)

## Validation

- Objective title required, max 255 chars
- Key Result title required, max 255 chars
- Key Result target_value required, must be > 0
- Key Result current_value must be >= 0
- Initiative title required, max 255 chars
- Progress must be between 0 and 100
- Manual progress update only allowed for leaf initiatives (no children)
- Return 422 if attempting manual progress on parent initiative
- Sprint start_date and end_date must be within quarter range
- Sprint start_date must be before end_date
- Cannot activate sprint if another sprint is already ACTIVE in same quarter
- Initiative sprint_id is optional (nullable)
- Child initiative can have different sprint_id from parent

## Services

- AuthService — register, login, get current user, get all users
- PeriodService — list periods, get current, ensure year generated
- SprintService — CRUD, activate, complete (with review/retro notes)
- ObjectiveService — CRUD + progress recalculation + reorder
- KeyResultService — CRUD + progress recalculation
- InitiativeService — CRUD + tree, progress update, assign to sprint
- ProgressService — recalculate parent → KR → objective (within initiative service)
- NotificationService — check due dates, create notifications, mark read
- DashboardService — summary stats per period, annual stats, search, activity logs
- ActivityLogService — log activities, broadcast via WebSocket
