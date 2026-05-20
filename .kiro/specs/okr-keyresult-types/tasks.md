# Implementation Plan: OKR Key Result Types (METRIC & MILESTONE)

## Overview

Add support for two Key Result types (METRIC and MILESTONE) to the existing OKR system. This involves schema migration with backfill, type-aware progress calculation, a toggle-milestone endpoint, updated DTOs with patchable semantics, conditional frontend form fields, and differentiated card visualization.

## Tasks

- [ ] 1. Backend schema and model extension
  - [ ] 1.1 Extend KeyResult model and run migration
    - Add `KRType`, `BaselineValue`, `DueDate`, `Notes` fields to `KeyResult` struct in `backend/internal/modules/keyresult/model.go`
    - Add constants `KRTypeMetric`, `KRTypeMilestone` and `EffectiveType()` helper method
    - Add backfill SQL in `backend/internal/database/migration.go` after AutoMigrate: `UPDATE key_results SET kr_type = 'METRIC' WHERE kr_type IS NULL`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 1.2 Add PatchableFloat and PatchableDate types to dto.go
    - Implement `PatchableFloat` with `UnmarshalJSON` (absent vs null vs value semantics)
    - Implement `PatchableDate` with `UnmarshalJSON` and `YYYY-MM-DD` format validation
    - Extend `CreateRequest` with `KRType`, `BaselineValue`, `DueDate`, `Notes` fields
    - Extend `UpdateRequest` with `KRType *string`, `BaselineValue PatchableFloat`, `DueDate PatchableDate`, `Notes PatchableString`
    - Extend `KeyResultResponse` to include `kr_type`, `baseline_value`, `due_date`, `notes`
    - _Requirements: 2.1, 3.1, 8.1, 8.2, 8.4_

- [ ] 2. Backend service logic
  - [ ] 2.1 Implement progress calculation functions
    - Add `calcMetricProgress(target, baseline, current float64) float64` with ascending/descending/equal logic, clamped 0-100, rounded 2 decimals
    - Add `calcMilestoneProgress(status string) float64` returning 100 if DONE else 0
    - Update existing progress recalculation to use `EffectiveType()` — skip numeric recalc for MILESTONE
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.7, 5.8_

  - [ ]* 2.2 Write property tests for progress calculation
    - **Property 1: METRIC progress formula correctness**
    - **Property 2: METRIC status=DONE overrides numeric progress**
    - **Property 3: MILESTONE progress is binary based on status**
    - **Validates: Requirements 4.1-4.9, 5.1-5.3, 5.7, 5.8**

  - [ ] 2.3 Implement type-aware validation in Create and Update
    - Add `validateMetricFields` — target > 0 required, current/baseline >= 0
    - Add `validateDueDate` — YYYY-MM-DD format or null
    - Add `validateNotes` — max 5000 chars
    - Reject invalid `kr_type` values with 400; reject `kr_type: null` on PATCH with 400
    - Default `kr_type = 'METRIC'` when absent on create
    - In Update: determine `nextType`, validate fields by type, apply patchable semantics
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16_

  - [ ]* 2.4 Write property tests for validation and patch semantics
    - **Property 7: PATCH absent-vs-null semantics for new fields**
    - **Property 8: Validation rejects invalid inputs without DB write**
    - **Property 9: kr_type defaulting and backward compatibility**
    - **Validates: Requirements 2.2-2.9, 3.1-3.14, 1.7, 13.1-13.3**

  - [ ] 2.5 Implement type switching logic
    - Preserve all existing field values when switching kr_type
    - Recalculate progress based on new type rules
    - Reject switch to METRIC if target_value <= 0 and not provided in payload
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 2.6 Write property test for type switching
    - **Property 6: Type switching preserves data**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 3. Backend toggle-milestone endpoint
  - [ ] 3.1 Implement ToggleMilestone service method and handler
    - Add `ToggleMilestone(id, userID)` in service: flip DONE↔ON_TRACK, set progress 100↔0
    - Return 422 if kr_type != MILESTONE, 403 if not creator, 404 if not found
    - Add handler in `handler.go` with activity log (STATUS_CHANGE action)
    - Register route `PATCH /api/key-results/:id/toggle-milestone` in routes
    - _Requirements: 5.4, 5.5, 5.6_

  - [ ]* 3.2 Write property tests for toggle-milestone
    - **Property 4: Toggle-milestone is involutive**
    - **Property 5: Toggle-milestone rejects non-MILESTONE KRs**
    - **Validates: Requirements 5.4, 5.5**

- [ ] 4. Backend activity logging for new fields
  - [ ] 4.1 Implement delta diff for new fields in Create and Update
    - On Create: include `kr_type`, `target_value`, `current_value`, `baseline_value`, `due_date`, `notes` in `new_value`
    - On Update: build delta diff only for fields that actually changed (`kr_type`, `baseline_value`, `due_date`, `notes`)
    - On ToggleMilestone: log `status` and `progress` old/new values
    - Ensure activity log failure does not rollback KR transaction
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 2.10_

  - [ ]* 4.2 Write property test for activity log delta
    - **Property 11: Activity log delta contains only changed fields**
    - **Validates: Requirements 7.1-7.4, 2.10**

- [ ] 5. Checkpoint
  - Ensure all backend tests pass and API endpoints work correctly. Ask the user if questions arise.

- [ ] 6. Frontend types and service layer
  - [ ] 6.1 Extend TypeScript types and API service
    - Add `KRType` type and extend `KeyResult` interface in `src/types/index.ts` with `kr_type`, `baseline_value`, `due_date`, `notes`
    - Add `toggleMilestone(id: number)` to `keyResult.service.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 7. Frontend form (KeyResultPanel)
  - [ ] 7.1 Add type radio and conditional fields to KeyResultPanel
    - Add radio group "Type" (METRIC/MILESTONE) at top of form, default METRIC on create
    - Show Baseline/Target/Current/MetricUnit when METRIC selected
    - Show DueDate picker and "Selesai" checkbox when MILESTONE selected
    - Add Notes textarea with `{used}/5000` character counter (always visible)
    - Preserve field values when switching type (toggle visibility only)
    - Disable Simpan button if notes > 5000 chars; inline error if METRIC target <= 0
    - On submit: build payload based on selected kr_type, send appropriate fields
    - Prefill all fields correctly in edit mode based on existing kr_type
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

- [ ] 8. Frontend card visualization
  - [ ] 8.1 Implement differentiated KeyResult card rendering
    - METRIC: progress bar (8px, primary color) + label `{current}/{target} {unit?}` + baseline label if baseline > 0
    - MILESTONE: checkbox icon (filled green if DONE, outline gray otherwise) + title + due date countdown/overdue/completed label
    - Keep existing Status Badge and Confidence Indicator for both types
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ] 8.2 Implement quick toggle milestone on card
    - Clickable checkbox icon for MILESTONE KRs (cursor pointer)
    - Optimistic update with TanStack Query cache manipulation
    - Revert on error + toast error message
    - Pre-flight check: if user !== creator, show toast and skip API call
    - Invalidate queries on success
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 9. Frontend KR list filter
  - [ ] 9.1 Add KeyResultTypeFilter dropdown component
    - Create `KeyResultTypeFilter.tsx` in `components/atomics/` with options: All Types, Metric Only, Milestone Only
    - Apply client-side filter on KR list
    - Show empty state message when no KRs match filter
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 10. Final checkpoint
  - Ensure all tests pass, frontend renders correctly for both KR types, and toggle milestone works end-to-end. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Backend uses Go (Gin + GORM), frontend uses React + TypeScript + TanStack Query
- Migration backfill is idempotent — safe to run multiple times

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "2.3", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.5", "3.1"] },
    { "id": 4, "tasks": ["2.6", "3.2", "4.1"] },
    { "id": 5, "tasks": ["4.2", "7.1"] },
    { "id": 6, "tasks": ["8.1", "9.1"] },
    { "id": 7, "tasks": ["8.2"] }
  ]
}
```
