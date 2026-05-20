# Implementation Plan: Sprint Workflow Improvement

## Overview

This implementation transforms the Sprint page into a comprehensive sprint workflow hub with initiative board, progress summary, backlog management, carry-over workflow, timeline indicator, and enhanced sprint list. The backend extends the existing sprint and initiative modules with new endpoints, while the frontend introduces a new SprintDetailPage with several organism components.

## Tasks

- [x] 1. Backend — New DTOs and Repository Queries
  - [x] 1.1 Add new DTOs to the sprint module
    - Create `SprintInitiativeResponse`, `SprintSummaryResponse`, `CarryOverRequest`, `CarryOverResponse`, and `AssignSprintRequest` structs in `backend/internal/modules/sprint/dto.go`
    - _Requirements: 1.2, 2.1, 5.2, 4.3_

  - [x] 1.2 Implement sprint repository queries for initiatives with context
    - Add `GetSprintInitiatives(sprintID uint)` to sprint repository — JOIN initiatives with key_results, objectives, and users
    - Add `GetSprintSummary(sprintID uint)` — aggregate COUNT by status and AVG progress for root-level initiatives
    - Add `GetBacklogInitiatives(periodID uint)` — SELECT initiatives WHERE sprint_id IS NULL in the same quarter
    - Add `FindNextPlanningSprintInPeriod(periodID uint, excludeSprintID uint)` — find next PLANNING sprint for carry-over
    - Write these in `backend/internal/modules/sprint/repository.go`
    - _Requirements: 1.2, 2.1, 2.2, 4.1, 5.2_

  - [x] 1.3 Add assign-sprint repository method to initiative module
    - Add `AssignToSprint(initiativeID uint, sprintID uint)` method in `backend/internal/modules/initiative/repository.go`
    - Validate initiative exists and sprint_id is currently NULL
    - _Requirements: 4.3_

- [x] 2. Backend — Service Layer for Sprint Detail Features
  - [x] 2.1 Implement sprint service methods for detail page
    - Add `GetSprintInitiatives(sprintID uint)` — calls repository, groups by status
    - Add `GetSprintSummary(sprintID uint)` — calls repository, returns summary DTO
    - Add `GetSprintBacklog(sprintID uint)` — resolves sprint's period_id, calls backlog repository
    - Write in `backend/internal/modules/sprint/service.go`
    - _Requirements: 1.2, 2.1, 2.2, 4.1_

  - [x] 2.2 Implement carry-over service logic
    - Add `CarryOverInitiatives(sprintID uint, initiativeIDs []uint, userID uint)` to sprint service
    - Find next PLANNING sprint in same period, update each initiative's sprint_id, log activity for each
    - Return 422 if no PLANNING sprint found
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.3 Implement assign-to-sprint service logic in initiative module
    - Add `AssignToSprint(initiativeID uint, sprintID uint, userID uint)` to initiative service
    - Validate initiative not already assigned, validate sprint is not COMPLETED
    - Log activity on success
    - _Requirements: 4.3, 4.4_

  - [ ]* 2.4 Write property tests for sprint progress calculation (backend)
    - **Property 2: Sprint progress equals average of root-level initiative progress**
    - **Validates: Requirements 2.2**
    - Use Go `testing/quick` or `rapid` library, min 100 iterations

  - [ ]* 2.5 Write property tests for backlog filter correctness (backend)
    - **Property 3: Backlog contains only unassigned initiatives in the quarter**
    - **Validates: Requirements 4.1**

  - [ ]* 2.6 Write property tests for incomplete initiative filter (backend)
    - **Property 5: Incomplete initiative filter excludes DONE and CANCELLED**
    - **Validates: Requirements 5.1**

- [x] 3. Backend — Handler Endpoints
  - [x] 3.1 Add new handler endpoints to sprint handler
    - `GET /api/sprints/:id/initiatives` — parse sprint ID, call service, return grouped initiatives
    - `GET /api/sprints/:id/summary` — return sprint summary DTO
    - `GET /api/sprints/:id/backlog` — return backlog initiatives for sprint's quarter
    - `POST /api/sprints/:id/carry-over` — parse CarryOverRequest, call service, return CarryOverResponse
    - Write in `backend/internal/modules/sprint/handler.go`
    - _Requirements: 1.2, 2.1, 4.1, 5.2_

  - [x] 3.2 Add assign-sprint handler endpoint to initiative handler
    - `PATCH /api/initiatives/:id/assign-sprint` — parse AssignSprintRequest, call service
    - Write in `backend/internal/modules/initiative/handler.go`
    - _Requirements: 4.3_

  - [x] 3.3 Register new routes
    - Add all new endpoints to `backend/internal/routes/` with auth middleware
    - _Requirements: 1.2, 2.1, 4.1, 4.3, 5.2_

- [x] 4. Checkpoint — Backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend — Types and Services
  - [x] 5.1 Add new TypeScript interfaces
    - Add `SprintInitiative`, `SprintSummary`, `CarryOverResponse` interfaces to `frontend/src/types/`
    - _Requirements: 1.2, 2.1, 5.2_

  - [x] 5.2 Add new API service functions
    - Add `getSprintInitiatives`, `getSprintSummary`, `getSprintBacklog`, `carryOverInitiatives`, `assignInitiativeToSprint` to `frontend/src/services/sprint.service.ts`
    - _Requirements: 1.2, 2.1, 4.1, 4.3, 5.2_

- [x] 6. Frontend — Sprint Detail Page and Board Components
  - [x] 6.1 Create SprintDetailPage
    - Create `frontend/src/pages/SprintDetailPage.tsx`
    - Fetch sprint detail, render header with name, goal, status, dates
    - Show lifecycle action buttons based on sprint status (Activate, Complete Sprint, Edit)
    - Show review/retro notes section for COMPLETED sprints
    - _Requirements: 1.1, 3.1, 3.2, 3.4, 3.5_

  - [x] 6.2 Create SprintBoard organism
    - Create `frontend/src/components/organisms/SprintBoard.tsx`
    - Fetch sprint initiatives via TanStack Query, group by status columns (TODO, IN_PROGRESS, BLOCKED, DONE, CANCELLED)
    - Display empty state when sprint has no initiatives
    - _Requirements: 1.2, 1.5_

  - [x] 6.3 Create InitiativeCard organism
    - Create `frontend/src/components/organisms/InitiativeCard.tsx`
    - Display title, status badge, progress, assignee name, due date
    - Show parent objective and key result as context breadcrumbs
    - On click, open initiative edit drawer
    - _Requirements: 1.3, 1.4, 7.1_

  - [x] 6.4 Create SprintSummary organism
    - Create `frontend/src/components/organisms/SprintSummary.tsx`
    - Fetch summary, display total initiatives, per-status counts, progress bar
    - Auto-update via WebSocket invalidation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.5 Write property tests for initiative grouping logic (frontend)
    - **Property 1: Initiative grouping partitions by status**
    - **Validates: Requirements 1.2, 2.1**
    - Use fast-check library, min 100 iterations

  - [ ]* 6.6 Write property tests for sprint progress calculation (frontend)
    - **Property 2: Sprint progress equals average of root-level initiative progress**
    - **Validates: Requirements 2.2**

- [x] 7. Frontend — Backlog and Carry-Over Components
  - [x] 7.1 Create BacklogPanel organism
    - Create `frontend/src/components/organisms/BacklogPanel.tsx`
    - Fetch backlog initiatives, display with title, status, progress, assignee, due date, parent KR title
    - Show "Assign to Sprint" button per item, call assignInitiativeToSprint on click
    - Only show for PLANNING or ACTIVE sprints
    - Invalidate sprint board query on successful assign
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Create CompleteSprintModal organism (enhanced)
    - Create `frontend/src/components/organisms/CompleteSprintModal.tsx`
    - Show review_note and retro_note text areas
    - Fetch and display incomplete initiatives (status not DONE/CANCELLED) with carry-over checkboxes
    - On submit: call complete sprint endpoint, then call carry-over for selected initiatives
    - Show message if no PLANNING sprint available for carry-over
    - _Requirements: 3.3, 5.1, 5.2, 5.3_

  - [ ]* 7.3 Write property tests for carry-over logic (frontend)
    - **Property 6: Carry-over reassigns initiatives to next PLANNING sprint**
    - **Validates: Requirements 5.2, 5.4**

  - [ ]* 7.4 Write property tests for assign-to-sprint (frontend)
    - **Property 4: Assign-to-sprint correctly updates sprint_id**
    - **Validates: Requirements 4.3**

- [x] 8. Frontend — Timeline Indicator and Enhanced Sprint List
  - [x] 8.1 Create TimelineIndicator organism
    - Create `frontend/src/components/organisms/TimelineIndicator.tsx`
    - Calculate days elapsed, total duration, days remaining from sprint start/end dates
    - Show visual progress bar for elapsed time percentage
    - Show "Overdue" warning with days past end date when applicable
    - Only render for ACTIVE sprints
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.2 Enhance SprintsPage with progress indicators and sorting
    - Modify `frontend/src/pages/SprintsPage.tsx`
    - Add initiative count and sprint progress bar to each sprint card
    - Visually distinguish ACTIVE sprint (highlighted border/background)
    - Sort: ACTIVE first, then PLANNING by start_date ASC, then COMPLETED by end_date DESC
    - Add click handler to navigate to SprintDetailPage
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.3 Write property tests for sprint list sorting (frontend)
    - **Property 7: Sprint list sorting invariant**
    - **Validates: Requirements 6.4**

  - [ ]* 8.4 Write property tests for timeline calculation (frontend)
    - **Property 8: Sprint timeline calculation consistency**
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 8.5 Write property tests for overdue detection (frontend)
    - **Property 9: Overdue detection**
    - **Validates: Requirements 8.3**

- [x] 9. Frontend — Initiative Status Update and Wiring
  - [x] 9.1 Wire initiative edit drawer into SprintBoard
    - When InitiativeCard is clicked in SprintBoard, open the existing initiative edit drawer
    - On save, invalidate sprint initiatives and sprint summary queries
    - Trigger progress recalculation chain via existing backend logic
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.2 Add route for SprintDetailPage
    - Add `/sprints/:id` route in `frontend/src/app/router.tsx`
    - Wire all components together in SprintDetailPage (SprintBoard, SprintSummary, BacklogPanel, TimelineIndicator, CompleteSprintModal)
    - _Requirements: 1.1_

  - [x] 9.3 Wire WebSocket invalidation for sprint queries
    - Update WebSocket hook to invalidate sprint-related queries (sprint initiatives, sprint summary) when activity messages arrive
    - _Requirements: 2.3_

  - [ ]* 9.4 Write property tests for progress recalculation chain (frontend)
    - **Property 10: Progress recalculation chain integrity**
    - **Validates: Requirements 7.3**

- [x] 10. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses Go (Gin + GORM), frontend uses TypeScript (React + TanStack Query)
- All new endpoints require JWT auth middleware
- WebSocket invalidation ensures real-time updates across clients

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "5.2"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 6, "tasks": ["6.5", "6.6", "7.1", "7.2", "8.1", "8.2"] },
    { "id": 7, "tasks": ["7.3", "7.4", "8.3", "8.4", "8.5", "9.1", "9.2", "9.3"] },
    { "id": 8, "tasks": ["9.4"] }
  ]
}
```
