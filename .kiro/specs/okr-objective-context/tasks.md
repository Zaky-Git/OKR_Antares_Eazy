# Implementation Plan: OKR Objective Context

## Overview

Implementasi fitur ditata dalam 7 fase yang dapat dieksekusi secara paralel per wave. Backend menggunakan **Go (Gin + GORM)** mengikuti pattern `handler → service → repository`, frontend menggunakan **TypeScript (React + Vite + TanStack Query + Tailwind)** mengikuti Atomic Design.

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

Optional sub-tasks (`*`) cover the 13 universal correctness properties (P1–P13) defined in the design. They can be skipped for fastest MVP delivery.

## Tasks

- [x] 1. Phase 1 — Backend master modules (Strategy, Segment, Division)

  - [x] 1.1 Create shared color validation utility
    - File baru `backend/internal/shared/validation/color.go`
    - Export `ColorHexPattern = regexp.MustCompile(\`^#[0-9A-Fa-f]{6}$\`)` dan const `FallbackColor = "#E5E7EB"`
    - Helper `IsValidHex(s string) bool`
    - _Requirements: 1.4, 2.3, 3.5_

  - [x] 1.2 Implement `strategy` module (model, dto, repository, service, handler)
    - Folder baru `backend/internal/modules/strategy/`
    - `model.go`: GORM model `Strategy` dengan kolom `id, name, description, color, sort_order, is_active, created_at, updated_at, deleted_at` + indeks per design
    - `dto.go`: `CreateRequest`, `UpdateRequest`, `StrategyResponse`, `FieldErrors`
    - `repository.go`: `Create`, `FindByID`, `FindAll` (sort_order ASC, LOWER(name) ASC), `FindByNameCI` (live records only), `Update`, `SoftDeleteTx`, `NullObjectiveStrategyTx`
    - `service.go`: List/Create/GetByID/Update/Delete dengan validasi panjang field, color regex, uniqueness CI-trim, transaksi cascade null
    - `handler.go`: List 200, Create 201, GetByID, Update, Delete dengan activity log CREATE/UPDATE/DELETE pada entity_type `STRATEGY`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.5_

  - [x] 1.3 Implement `segment` module (model, dto, repository, service, handler)
    - Folder baru `backend/internal/modules/segment/`
    - Struktur sama dengan strategy minus `sort_order`
    - Sort `LOWER(TRIM(name)) ASC`
    - Cascade null mengeset `objectives.segment_id = NULL`
    - Activity log entity_type `SEGMENT`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.5_

  - [x] 1.4 Implement `division` module (model, dto, repository, service, handler)
    - Folder baru `backend/internal/modules/division/`
    - Struktur sama dengan segment plus required `code` (1-20 chars, CI unique on TRIM)
    - Validasi uniqueness untuk `name` dan `code` (CI-trim, exclude record yang sedang di-update)
    - Cascade null mengeset `objectives.division_id = NULL`
    - Activity log entity_type `DIVISION`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.5_

  - [ ]* 1.5 Write property tests for master modules
    - **Property 1: Master list excludes soft-deleted and is sorted** — Validates: Requirements 1.1, 2.1, 3.1
    - **Property 2: Master CRUD round-trip preserves data** — Validates: Requirements 1.2, 1.5, 2.2, 2.5, 3.2, 3.6
    - **Property 3: Name and Division code uniqueness (CI-trim) is enforced** — Validates: Requirements 1.3, 2.4, 3.3, 3.4
    - **Property 4: Field validity determines HTTP 400 outcome (master fields)** — Validates: Requirements 1.4, 2.3, 3.5, 4.5
    - **Property 5: Soft delete cascades null-out and is transactional** — Validates: Requirements 1.7, 1.8, 2.7, 2.8, 3.8, 3.9
    - Gunakan `gopter` atau `testing/quick` dengan in-memory MySQL/sqlite

- [x] 2. Phase 2 — Backend objective enhancements

  - [x] 2.1 Add new columns and relations to `objective` model
    - Edit `backend/internal/modules/objective/model.go`
    - Tambah kolom pointer nullable: `StrategyID *uint`, `SegmentID *uint`, `DivisionID *uint`, `OwnerID *uint`, `Notes *string`
    - Tambah indeks per kolom FK
    - Tambah GORM relation tags untuk preload (gunakan minimal embedded structs di file `objective/relations.go` jika perlu untuk hindari import cycle)
    - _Requirements: 5.1, 13.1, 13.4_

  - [x] 2.2 Add `PatchableUint` and `PatchableString` types and update objective DTO
    - Edit `backend/internal/modules/objective/dto.go`
    - Implement `PatchableUint{Present bool; Value *uint}` dan `PatchableString{Present bool; Value *string}` dengan custom `UnmarshalJSON` (bedakan absent vs explicit null)
    - Tambah `StrategyID/SegmentID/DivisionID/OwnerID PatchableUint`, `Notes PatchableString` pada `UpdateRequest`
    - Tambah `*uint` untuk fields tersebut pada `CreateRequest` dan `*string` Notes dengan tag `binding:"omitempty,max=5000"`
    - Tambah field di `ObjectiveResponse`: `strategy`, `segment`, `division`, `owner` sebagai pointer-to-struct (nullable)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.10, 5.11, 5.13, 5.14_

  - [x] 2.3 Update objective repository: preload relations and filter query builder
    - Edit `backend/internal/modules/objective/repository.go`
    - Pada `FindAll`/`FindByID`: tambahkan `Preload("Strategy", "deleted_at IS NULL")`, `Preload("Segment", "deleted_at IS NULL")`, `Preload("Division", "deleted_at IS NULL")`, `Preload("Owner", "deleted_at IS NULL")`
    - Pada list query, terima `filter struct{StrategyID, SegmentID, DivisionID *uint; PeriodID uint; Page, Limit int}` dan tambah `WHERE strategy_id = ?`/dst dengan AND-logic ketika non-nil
    - Pastikan pagination meta `total` dan `total_pages` tetap konsisten ketika hasil kosong
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

  - [x] 2.4 Update objective service: FK validation, master existence check, filter wiring
    - Edit `backend/internal/modules/objective/service.go`
    - Tambah dependency injection ke `strategy.Repository`, `segment.Repository`, `division.Repository`, `auth.Repository` (untuk owner check) — update constructor
    - Pada Create dan Update: untuk tiap FK non-null, lookup live record (deleted_at IS NULL); jika tidak ada → return `FieldErrors{<fk_field>: "..."}` HTTP 422
    - Implement PATCH semantics: untuk tiap field `Patchable*`, hanya update kolom ketika `Present == true`; ketika `Value == nil` set NULL; ketika field absent jangan ubah kolom
    - Trim Notes; kosong setelah trim → simpan NULL
    - Pada list service: parse `strategy_id/segment_id/division_id` query params; jika non-integer atau non-positif atau ID tidak ada di master live → HTTP 400 sebelum query daftar
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8_

  - [x] 2.5 Update objective handler: delta diff activity log on update + create log
    - Edit `backend/internal/modules/objective/handler.go`
    - `Create`: setelah service success, jika ada field konteks non-null/non-empty → activity log `CREATE` dengan `new_value = JSON(non-null fields)`
    - `Update`: ambil snapshot pre via service, diff terhadap post; bangun `old_value/new_value JSON` hanya dari kunci yang berubah; jika diff kosong → skip log
    - Failed transaction (rollback service) → tidak boleh ada activity log row
    - Pertahankan ownership check (hanya `created_by`) tanpa memperhatikan `owner_id`; user lain → 403
    - Pada response, sertakan `strategy/segment/division/owner` sebagai object atau null sesuai relasi yang non-NULL DAN live; orphan/soft-deleted → null
    - _Requirements: 5.12, 5.13, 5.14, 13.3, 13.4, 13.6, 14.1, 14.2, 14.3, 14.4_

  - [ ]* 2.6 Write property tests for objective FK + PATCH + filter
    - **Property 6: Invalid Objective FK rejected with 422** — Validates: Requirements 5.6, 5.7, 5.8, 5.9
    - **Property 7: PATCH semantics on Objective context fields** — Validates: Requirements 5.3, 5.4, 5.5, 13.4
    - **Property 8: Multi-filter AND-logic on Objective list** — Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
    - **Property 4 (Objective slice): notes >5000 / non-integer FK → 400** — Validates: Requirements 5.10, 5.11
    - Generator menghasilkan kombinasi acak FK (valid/invalid/null), notes length, filter subset

  - [ ]* 2.7 Write property test for delta diff activity log
    - **Property 11: Activity log captures only the diff** — Validates: Requirements 14.1, 14.2, 14.3, 14.4
    - Generator menghasilkan pasangan (pre, payload) acak dan memverifikasi keys/values pada `old_value`/`new_value`

  - [ ]* 2.8 Write property test for embedded master/owner in objective response
    - **Property 9: Embedded master in Objective response equals live master else null** — Validates: Requirements 5.13, 5.14, 7.1, 7.2, 7.3, 7.4, 7.5, 13.3, 13.5
    - Verifikasi response GET list, GET by id, dan response item objective dari search

  - [ ]* 2.9 Write property test for ownership permission
    - **Property 13: Edit/delete permission depends on created_by only** — Validates: Requirements 5.12, 13.6
    - Generator user vs objective dengan kombinasi created_by/owner_id

- [x] 3. Phase 3 — Backend dashboard search update, seeder, migration order, route registration

  - [x] 3.1 Update dashboard search to inject context names
    - Edit `backend/internal/modules/dashboard/search.go` dan `dashboard/dto.go`
    - Pada query objective: LEFT JOIN `strategies`, `segments`, `divisions` dengan filter `deleted_at IS NULL`; SELECT `st.name AS strategy_name, sg.name AS segment_name, dv.name AS division_name`
    - `SearchResult` untuk item objective tambahkan field `strategy_name *string` dst dengan `,omitempty`
    - Pastikan item bukan objective tidak menyertakan kunci tersebut
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 3.2 Implement idempotent master seeder
    - File baru `backend/internal/shared/seeder/master.go`
    - Function `SeedMasters(db *gorm.DB) (Summary, error)` dengan `Summary{Strategies, Segments, Divisions int}`
    - Per entity: lookup `LOWER(TRIM(name))` untuk live records; jika belum ada → INSERT dalam satu TX per entity (rollback on failure); skip jika sudah ada
    - Default records sesuai design: 3 strategies, 4 segments, 6 divisions dengan color sesuai
    - Hook dari `backend/cmd/api/main.go` setelah `database.Migrate()` (modifikasi main.go)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 3.3 Update database migration order
    - Edit `backend/internal/database/migration.go`
    - Tambah `&strategy.Strategy{}, &segment.Segment{}, &division.Division{}` di urutan ke-3, 4, 5 (sebelum sprints dan objectives)
    - Pastikan AutoMigrate menambah 5 kolom baru pada `objectives` dengan default NULL untuk row existing
    - _Requirements: 5.1, 13.1, 13.2_

  - [x] 3.4 Register HTTP routes for new master modules
    - Edit file routes (cari `internal/routes/*.go`, biasanya `routes.go`)
    - Daftarkan grup `/api/strategies` (GET, POST, GET/:id, PATCH/:id, DELETE/:id) dengan auth middleware
    - Daftarkan grup `/api/segments` (sama)
    - Daftarkan grup `/api/divisions` (sama)
    - Wire dependency injection: instansiasi repository, service, handler tiap modul; inject ke objective.Service
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 3.5 Write property test for seeder idempotency
    - **Property 12: Seeder idempotency** — Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.6
    - Generator state awal acak (mix live/soft-deleted) lalu jalankan seeder N kali, verifikasi final state stabil dan summary count benar

  - [ ]* 3.6 Write property test for search context names with soft-delete handling
    - **Property 9 (search slice): strategy_name/segment_name/division_name null jika master tidak ada/soft-deleted** — Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
    - Verifikasi item non-objective tidak punya kunci context

- [x] 4. Checkpoint — Backend integration
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 5. Phase 4 — Frontend types, services, atomics, dan utilities

  - [x] 5.1 Add master TypeScript interfaces
    - File baru `frontend/src/types/master.ts`
    - Export `Strategy`, `Segment`, `Division`, `CreateStrategyDto`, `UpdateStrategyDto`, dan equivalent untuk Segment/Division
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 5.2 Add `master.service.ts` (TanStack Query API helpers)
    - File baru `frontend/src/services/master.service.ts`
    - Export `strategiesApi`, `segmentsApi`, `divisionsApi` dengan method `list`, `create`, `update`, `remove` menggunakan axios instance existing
    - _Requirements: 1.1, 1.2, 1.5, 1.7, 2.1, 2.2, 2.5, 2.7, 3.1, 3.2, 3.6, 3.8, 11.9, 11.10_

  - [x] 5.3 Update objective and dashboard service types
    - Edit `frontend/src/types/objective.ts` (atau lokasi setara dalam `types/`): tambah `strategy_id`, `segment_id`, `division_id`, `owner_id`, `notes` opsional, dan field embed `strategy`, `segment`, `division`, `owner` (nullable)
    - Edit `frontend/src/services/objective.service.ts`: terima parameter filter `strategy_id?, segment_id?, division_id?` pada `list`
    - Edit `frontend/src/services/dashboard.service.ts`: type `SearchResult` untuk objective tambahkan `strategy_name | null`, `segment_name | null`, `division_name | null`
    - _Requirements: 5.13, 5.14, 6.1, 6.5, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5, 13.3, 13.5_

  - [x] 5.4 Add `ColorSwatch` atomic
    - File baru `frontend/src/components/atomics/ColorSwatch.tsx`
    - Pure UI: props `color: string`, `size?: number`; renders kotak warna dengan border
    - Tambahkan ke barrel `atomics/index.ts`
    - _Requirements: 11.6_

  - [x] 5.5 Add `ColorPicker` atomic (hex input + preview)
    - File baru `frontend/src/components/atomics/ColorPicker.tsx`
    - Props: `value, onChange, error, label`; gabungkan native `<input type="color">` dan `<Input>` text untuk hex
    - Validasi inline `/^#[0-9A-Fa-f]{6}$/`
    - Tambahkan ke barrel
    - _Requirements: 1.4, 2.3, 3.5, 11.6, 11.7_

  - [x] 5.6 Add `getBadgeColor` pure utility
    - File baru `frontend/src/utils/getBadgeColor.ts`
    - Signature `getBadgeColor(hex: string | null | undefined): string` → return `hex` jika cocok regex, else `#E5E7EB`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 5.7 Write property test for `getBadgeColor`
    - **Property 10 (utility slice): getBadgeColor returns hex if valid else fallback** — Validates: Requirements 9.4
    - Gunakan `fast-check` (tambahkan ke devDependencies frontend) dengan generator string acak (valid hex / random / null / undefined)

- [x] 6. Phase 5 — Frontend Master Admin Page (3 tabs CRUD)

  - [x] 6.1 Create `MasterAdminPage` shell with `MasterTabs`
    - File baru `frontend/src/pages/MasterAdminPage.tsx` dan `frontend/src/components/organisms/MasterTabs.tsx`
    - Tabs: Strategy (default aktif), Segment, Division
    - Loading state dan error block dengan tombol "Coba lagi" (refetch)
    - _Requirements: 11.1, 11.2, 11.11_

  - [x] 6.2 Implement Strategy tab (table + modal)
    - File baru `frontend/src/components/organisms/StrategyTable.tsx` dan `StrategyFormModal.tsx`
    - Tabel kolom: Name, Description, Color (ColorSwatch), Sort Order, Is Active, Updated At, aksi Edit/Hapus
    - Tombol "Tambah Strategy" → buka modal kosong
    - Modal pakai `react-hook-form` dengan validasi panjang field, color regex, dan disable Save saat invalid
    - On success: `toast.success`, close modal, `queryClient.invalidateQueries(['masters', 'strategies'])`
    - On error: `toast.error(response.message ?? "Operasi gagal, silakan coba lagi")`, modal tetap terbuka
    - Hapus → `DeleteConfirmDialog` existing → DELETE → invalidate
    - _Requirements: 11.3, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [x] 6.3 Implement Segment tab (table + modal)
    - File baru `frontend/src/components/organisms/SegmentTable.tsx` dan `SegmentFormModal.tsx`
    - Kolom: Name, Description, Color, Is Active, Updated At
    - Pola behavior sama dengan Strategy
    - _Requirements: 11.4, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [x] 6.4 Implement Division tab (table + modal)
    - File baru `frontend/src/components/organisms/DivisionTable.tsx` dan `DivisionFormModal.tsx`
    - Kolom: Name, Code, Description, Color, Is Active, Updated At
    - Validasi `code` 1-20 chars + duplicate check
    - _Requirements: 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

- [x] 7. Phase 6 — Frontend Objective form, card enhancements, dan filter chips

  - [x] 7.1 Create `ContextBadges` and `OwnerAvatar` organisms
    - File baru `frontend/src/components/organisms/ContextBadges.tsx`: render badge Strategy (truncate 30), Segment (truncate 30), Division (`code`), gunakan `getBadgeColor`; jangan render badge yang FK NULL atau orphan
    - File baru `frontend/src/components/organisms/OwnerAvatar.tsx`: avatar 32x32 dengan 1-2 huruf inisial uppercase + tooltip 500ms hover (name + email); hidden jika owner null/soft-deleted
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 7.2 Update Objective form (Create + Edit) with context fields and Notes
    - Edit modal create dan edit objective (mis. `CreateObjectiveModal.tsx`, `EditObjectiveModal.tsx` atau lokasi yang setara)
    - Tambah 4 `Dropdown` atomic (Strategy/Segment/Division/Owner) dengan opsi pertama `{value: null, label: "Tidak dipilih"}`
    - Strategy/Segment/Division di-fetch via `useQuery(['masters', kind])` filter `is_active=true` sorted CI by name
    - Owner di-fetch via `GET /api/users` (live)
    - Tambah `Textarea` Notes dengan character counter `{used}/5000`, `register("notes", { maxLength: 5000 })`, inline error, disable Save jika invalid
    - Submit payload menyertakan kelima field; Notes kosong setelah trim → null
    - Pada mode edit: prefill nilai existing; relasi null → opsi "Tidak dipilih"
    - Master fetch failure (5xx atau timeout 10s) → inline error chip + dropdown disabled sampai retry sukses
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 7.3 Update `ObjectivePanel` / `ObjectiveCard` to render badges + avatar
    - Edit `frontend/src/components/organisms/ObjectivePanel.tsx` (atau ekstrak `ObjectiveCard.tsx`)
    - Render `<ContextBadges>` di header card di bawah judul, `<OwnerAvatar>` di top-right
    - Pastikan tidak melempar error untuk relasi null/orphan/invalid color
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 7.4 Implement `FilterChips` organism and integrate with `ObjectivesPage`
    - File baru `frontend/src/components/organisms/FilterChips.tsx`
    - Tiga grup chip (Strategy/Segment/Division), tiap grup dengan chip "Semua" + chip per Active_Master_Record (CI sorted by name)
    - State filter di `ObjectivesPage` (atau via URL query params untuk shareable)
    - Single-select per grup; chip aktif filled (primary), lainnya outline
    - "Semua" → hapus key dari query params
    - Cross-grup → AND combine
    - Edit `frontend/src/pages/ObjectivesPage.tsx`: tambahkan filter state ke TanStack Query key `['objectives', { periodId, strategyId, segmentId, divisionId, page }]`
    - Loading skeleton; 5xx/timeout error block + tombol "Coba lagi"
    - Empty `data: []` → empty state, bukan error
    - Grup tanpa Active_Master_Record → tampilkan hanya chip "Semua"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

  - [ ]* 7.5 Write property/UI test for ObjectiveCard rendering (badge + avatar fallback)
    - **Property 10: Card badge color uses fallback for invalid or orphan references** — Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.6, 9.7
    - Generator memvariasikan FK (null/valid/orphan) dan color (valid/invalid/null) lalu cek render tanpa error dan fallback diterapkan

- [x] 8. Phase 7 — Route registration, sidebar link, dan final wiring

  - [x] 8.1 Register `/admin/masters` route
    - Edit `frontend/src/app/router.tsx`
    - Tambah route protected: `path: "/admin/masters"` → `MasterAdminPage` di bawah `ProtectedRoute` + `AppLayout`
    - _Requirements: 11.1_

  - [x] 8.2 Add Master Admin link to Sidebar
    - Edit sidebar (mis. `frontend/src/components/organisms/Sidebar.tsx`)
    - Tambah link "Master Data" → `/admin/masters` dengan ikon
    - _Requirements: 11.1_

- [x] 9. Final checkpoint — End-to-end integration
  - Ensure all backend and frontend tests pass, master CRUD bekerja, objective form menyimpan context, badge dan avatar tampil di objective card, filter chip memfilter list dengan AND-logic, search menampilkan context names, seeder idempoten saat aplikasi restart, ask the user if questions arise.

## Notes

- Tasks marked with `*` (P1–P13 property tests) are optional dan dapat dilewati untuk MVP cepat.
- Setiap task referensi requirement granular (misal 5.6 bukan hanya "Requirement 5") agar traceability jelas.
- Checkpoints (task 4 dan 9) berfungsi sebagai integration gate sebelum lanjut ke fase berikutnya.
- Property tests memvalidasi properti universal di design; unit tests (sub-task per modul) memvalidasi contoh dan edge case.
- Backend menggunakan Go (Gin + GORM), frontend menggunakan TypeScript (React + Vite + TanStack Query + Tailwind), mengikuti steering rules `tech.md`, `structure.md`, `backend-rules.md`, dan `frontend-rules.md`.
- Soft delete master cascade null pada `objectives` dilakukan di application-level transaction (FK constraint tetap `NO ACTION`).
- Permission edit/delete Objective tetap di `created_by`, tidak terpengaruh `owner_id` (Property 13).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1", "5.6"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1", "2.2", "5.2", "5.3", "5.4", "5.7"] },
    { "id": 2, "tasks": ["1.5", "2.3", "5.5", "7.1"] },
    { "id": 3, "tasks": ["2.4", "3.2", "3.3", "6.1"] },
    { "id": 4, "tasks": ["2.5", "3.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["2.6", "2.7", "2.8", "2.9", "3.4", "7.2", "7.3"] },
    { "id": 6, "tasks": ["3.5", "3.6", "7.4", "7.5"] },
    { "id": 7, "tasks": ["8.1", "8.2"] }
  ]
}
```
