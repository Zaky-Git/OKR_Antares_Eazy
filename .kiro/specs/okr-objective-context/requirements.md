# Requirements Document

## Introduction

Fitur ini menambahkan konteks strategis ke entity Objective pada aplikasi OKR Antares Eazy agar selaras dengan struktur OKR riil perusahaan. Setiap Objective akan dapat dikategorikan ke pillar Strategy (mis. "Defend to Scale", "Extend", "Transform"), Customer Segment (mis. "SME", "Enterprise"), dan Divisi pelaksana (mis. "Product", "GTM"), serta memiliki seorang Owner (PIC accountable) dan field Notes untuk catatan transparan. Fitur ini juga menyediakan master data CRUD untuk Strategy, Segment, dan Division (semua user dapat mengelola, tanpa role restriction), filter list Objective berdasarkan ketiga master tersebut, dan tampilan badge berwarna pada Objective card. Field tambahan pada tabel `objectives` semuanya nullable agar tidak merusak data lama, dan tidak ada perubahan terhadap business rule existing (cascade delete, progress chain, ownership untuk edit/delete tetap di creator). Entity Key Result dan Initiative tidak disentuh pada fitur ini.

## Glossary

- **Objective**: Entity OKR level tertinggi pada hierarchy Objective → Key Result → Initiative dalam aplikasi.
- **Strategy**: Master data yang merepresentasikan pillar strategis perusahaan (mis. "Defend to Scale", "Extend", "Transform"). Setiap Objective dapat direlasikan ke satu Strategy.
- **Segment**: Master data yang merepresentasikan kategori pelanggan target Objective (mis. "SME", "Enterprise", "Government", "B2B ICT").
- **Division**: Master data yang merepresentasikan unit organisasi pelaksana Objective (mis. "Product", "Developer", "GTM", "UX", "Operational", "Data").
- **Owner**: User yang ditetapkan sebagai PIC accountable atas sebuah Objective. Berbeda dari Creator (user yang membuat Objective).
- **Creator**: User yang membuat Objective (kolom existing `created_by` pada tabel `objectives`). Pemegang permission edit/delete Objective.
- **Notes**: Field teks bebas pada Objective untuk mencatat feedback atau catatan transparan terkait Objective.
- **Master_Service**: Layanan backend yang mengelola CRUD master data Strategy, Segment, dan Division.
- **Objective_Service**: Layanan backend yang mengelola CRUD Objective, termasuk pengisian field konteks baru.
- **Objective_List_Page**: Halaman frontend `/objectives` yang menampilkan daftar Objective beserta filter dan badge.
- **Objective_Form**: Form (modal) frontend untuk create/edit Objective.
- **Objective_Card**: Komponen frontend yang menampilkan ringkasan satu Objective di list page.
- **Master_Admin_Page**: Halaman frontend `/admin/masters` yang menampilkan tab CRUD untuk Strategy, Segment, dan Division.
- **Color_Code**: String hex 7 karakter (mis. `#194FBC`) yang menentukan warna badge master data, mengikuti pola `^#[0-9A-Fa-f]{6}$`.
- **Active_Master_Record**: Master record (Strategy/Segment/Division) dengan `is_active = true` dan `deleted_at IS NULL`.
- **Inactive_Master_Record**: Master record dengan `is_active = false` atau `deleted_at IS NOT NULL`, tidak ditampilkan pada dropdown form Objective namun tetap dapat ditampilkan sebagai badge pada Objective lama yang masih merujuk record tersebut.
- **Authenticated_Request**: HTTP request yang menyertakan JWT token valid (tidak expired, tidak malformed) pada header Authorization.

## Requirements

### Requirement 1: Strategy Master Data

**User Story:** As a user, I want to manage Strategy pillar master data, so that I can categorize Objectives sesuai pillar strategis perusahaan.

#### Acceptance Criteria

1. WHEN an Authenticated_Request `GET /api/strategies` diterima, THE Master_Service SHALL mengembalikan HTTP 200 dengan daftar Strategy yang `deleted_at IS NULL` beserta field `id`, `name`, `description`, `color`, `sort_order`, `is_active`, `created_at`, `updated_at`, diurutkan ascending berdasarkan `sort_order`, lalu ascending case-insensitive berdasarkan `name` jika `sort_order` sama.
2. WHEN an Authenticated_Request create Strategy diterima dengan `name` non-empty (1-100 karakter setelah trim), `description` 0-500 karakter, `color` mengikuti Color_Code, `sort_order` integer 0-9999, dan `is_active` boolean, THE Master_Service SHALL membuat record baru pada tabel `strategies` dan mengembalikan HTTP 201 beserta data record yang dibuat termasuk `created_at` dan `updated_at`.
3. IF a create or update Strategy request memiliki `name` (setelah trim, case-insensitive) yang sudah dipakai oleh Strategy lain yang `deleted_at IS NULL`, THEN THE Master_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.name` mengindikasikan duplikasi, tanpa menulis perubahan ke database.
4. IF a create or update Strategy request memiliki `color` yang tidak cocok dengan Color_Code, atau panjang field di luar bound yang ditentukan, THEN THE Master_Service SHALL menolak request dengan HTTP 400 dan struktur error per field, tanpa menulis perubahan ke database.
5. WHEN an Authenticated_Request update Strategy diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL memperbarui field `name`, `description`, `color`, `sort_order`, dan `is_active` sesuai payload, mengupdate `updated_at`, lalu mengembalikan HTTP 200 beserta data terbaru.
6. IF an update atau delete Strategy request menargetkan `id` yang tidak ditemukan atau `deleted_at IS NOT NULL`, THEN THE Master_Service SHALL menolak dengan HTTP 404.
7. WHEN an Authenticated_Request delete Strategy diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL melakukan soft delete (set `deleted_at = current timestamp`) pada record tersebut DAN dalam transaksi yang sama mengeset `objectives.strategy_id` menjadi NULL pada Objective yang merujuk ke `strategy_id` tersebut, lalu mengembalikan HTTP 200.
8. IF transaksi soft delete pada criterion 7 gagal pada salah satu langkah, THEN THE Master_Service SHALL melakukan rollback sehingga record Strategy tidak ter-soft-delete dan `objectives.strategy_id` tidak berubah, dan mengembalikan HTTP 500.

### Requirement 2: Customer Segment Master Data

**User Story:** As a user, I want to manage Customer Segment master data, so that I can categorize Objectives berdasarkan target pelanggan.

#### Acceptance Criteria

1. WHEN an Authenticated_Request `GET /api/segments` diterima, THE Master_Service SHALL mengembalikan HTTP 200 dengan daftar Segment yang `deleted_at IS NULL` beserta field `id`, `name`, `description`, `color`, `is_active`, `created_at`, `updated_at`, diurutkan ascending case-insensitive berdasarkan `name`.
2. WHEN an Authenticated_Request create Segment diterima dengan `name` non-empty (1-100 karakter setelah trim), `description` 0-500 karakter, `color` mengikuti Color_Code, dan `is_active` boolean (default true), THE Master_Service SHALL membuat record baru pada tabel `segments` dan mengembalikan HTTP 201 beserta data record yang dibuat termasuk `created_at` dan `updated_at`.
3. IF a create or update Segment request memiliki panjang field di luar bound atau `color` tidak cocok dengan Color_Code, THEN THE Master_Service SHALL menolak request dengan HTTP 400 dan struktur error per field, tanpa menulis perubahan ke database.
4. IF a create or update Segment request memiliki `name` (setelah trim, case-insensitive) yang sudah dipakai oleh Segment lain yang `deleted_at IS NULL` dan bukan record yang sedang di-update, THEN THE Master_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.name` mengindikasikan duplikasi, tanpa menulis perubahan ke database.
5. WHEN an Authenticated_Request update Segment diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL memperbarui field `name`, `description`, `color`, dan `is_active` sesuai payload, mengupdate `updated_at`, lalu mengembalikan HTTP 200 beserta data terbaru.
6. IF an update atau delete Segment request menargetkan `id` yang tidak ditemukan atau `deleted_at IS NOT NULL`, THEN THE Master_Service SHALL menolak dengan HTTP 404.
7. WHEN an Authenticated_Request delete Segment diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL melakukan soft delete pada record tersebut DAN dalam transaksi yang sama mengeset `objectives.segment_id` menjadi NULL pada Objective yang merujuk ke `segment_id` tersebut, lalu mengembalikan HTTP 200.
8. IF transaksi soft delete pada criterion 7 gagal pada salah satu langkah, THEN THE Master_Service SHALL melakukan rollback dan mengembalikan HTTP 500.

### Requirement 3: Division Master Data

**User Story:** As a user, I want to manage Division master data, so that I can assign Objectives ke unit organisasi pelaksana.

#### Acceptance Criteria

1. WHEN an Authenticated_Request `GET /api/divisions` diterima, THE Master_Service SHALL mengembalikan HTTP 200 dengan daftar Division yang `deleted_at IS NULL` beserta field `id`, `name`, `code`, `description`, `color`, `is_active`, `created_at`, `updated_at`, diurutkan ascending case-insensitive berdasarkan `name`.
2. WHEN an Authenticated_Request create Division diterima dengan `name` non-empty (1-100 karakter setelah trim), `code` non-empty (1-20 karakter setelah trim), `description` 0-500 karakter, `color` mengikuti Color_Code, dan `is_active` boolean (default true), THE Master_Service SHALL membuat record baru pada tabel `divisions` dan mengembalikan HTTP 201 beserta data record yang dibuat.
3. IF a create or update Division request memiliki `name` (setelah trim, case-insensitive) yang sudah dipakai oleh Division lain yang `deleted_at IS NULL` dan bukan record yang sedang di-update, THEN THE Master_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.name` mengindikasikan duplikasi, tanpa menulis perubahan ke database.
4. IF a create or update Division request memiliki `code` (setelah trim, case-insensitive) yang sudah dipakai oleh Division lain yang `deleted_at IS NULL` dan bukan record yang sedang di-update, THEN THE Master_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.code` mengindikasikan duplikasi, tanpa menulis perubahan ke database.
5. IF a create or update Division request memiliki panjang field di luar bound atau `color` tidak cocok dengan Color_Code, THEN THE Master_Service SHALL menolak request dengan HTTP 400 dan struktur error per field, tanpa menulis perubahan ke database.
6. WHEN an Authenticated_Request update Division diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL memperbarui field `name`, `code`, `description`, `color`, dan `is_active` sesuai payload, mengupdate `updated_at`, lalu mengembalikan HTTP 200 beserta data terbaru.
7. IF an update atau delete Division request menargetkan `id` yang tidak ditemukan atau `deleted_at IS NOT NULL`, THEN THE Master_Service SHALL menolak dengan HTTP 404.
8. WHEN an Authenticated_Request delete Division diterima pada record existing yang `deleted_at IS NULL`, THE Master_Service SHALL melakukan soft delete pada record tersebut DAN dalam transaksi yang sama mengeset `objectives.division_id` menjadi NULL pada Objective yang merujuk ke `division_id` tersebut, lalu mengembalikan HTTP 200.
9. IF transaksi soft delete pada criterion 8 gagal pada salah satu langkah, THEN THE Master_Service SHALL melakukan rollback dan mengembalikan HTTP 500.

### Requirement 4: Master Data Permission

**User Story:** As a user, I want every authenticated user to be able to manage master data, so that admin task tidak terhambat role lock pada MVP.

#### Acceptance Criteria

1. WHEN an Authenticated_Request mencoba create, update, atau delete pada master Strategy, Segment, atau Division, THE Master_Service SHALL mengizinkan operasi terlepas dari role user.
2. IF an unauthenticated request (tanpa JWT, JWT expired, atau JWT malformed) mencoba mengakses endpoint create, update, atau delete master Strategy, Segment, atau Division, THEN THE Master_Service SHALL menolak dengan HTTP 401 tanpa mengubah state database.
3. WHEN an Authenticated_Request mencoba `GET /api/strategies`, `GET /api/segments`, atau `GET /api/divisions`, THE Master_Service SHALL mengizinkan operasi dan mengembalikan daftar sesuai Requirement 1.1, 2.1, atau 3.1.
4. IF an unauthenticated request mencoba endpoint `GET /api/strategies`, `GET /api/segments`, atau `GET /api/divisions`, THEN THE Master_Service SHALL menolak dengan HTTP 401.
5. IF a create or update request memiliki body yang tidak dapat di-parse sebagai JSON valid, atau field melebihi 255 karakter pada field yang dibatasi, THEN THE Master_Service SHALL menolak dengan HTTP 400 dan struktur error per field, tanpa mengubah state database.

### Requirement 5: Objective Strategy/Segment/Division/Owner/Notes Fields

**User Story:** As a user, I want to attach Strategy, Segment, Division, Owner, dan Notes ke Objective, so that konteks strategis Objective terdokumentasi.

#### Acceptance Criteria

1. THE Objective_Service SHALL menambahkan kolom nullable `strategy_id` (BIGINT UNSIGNED, FK ke `strategies.id`), `segment_id` (BIGINT UNSIGNED, FK ke `segments.id`), `division_id` (BIGINT UNSIGNED, FK ke `divisions.id`), `owner_id` (BIGINT UNSIGNED, FK ke `users.id`), dan `notes` (TEXT, max 5000 karakter) pada tabel `objectives`.
2. WHEN a user submits a create Objective request, THE Objective_Service SHALL menerima field optional `strategy_id`, `segment_id`, `division_id`, `owner_id`, dan `notes` di payload dan menyimpannya pada record yang dibuat dengan HTTP 201.
3. WHEN a user submits an update Objective request dan field `strategy_id`/`segment_id`/`division_id`/`owner_id`/`notes` tidak hadir pada payload (key absent), THE Objective_Service SHALL mempertahankan nilai existing pada kolom tersebut.
4. WHEN a user submits an update Objective request dan field `strategy_id`/`segment_id`/`division_id`/`owner_id`/`notes` hadir pada payload, THE Objective_Service SHALL memperbarui kolom yang dikirim sesuai nilainya.
5. WHEN a user mengirim nilai null secara eksplisit untuk `strategy_id`, `segment_id`, `division_id`, `owner_id`, atau `notes` pada update Objective, THE Objective_Service SHALL mengeset kolom yang bersangkutan menjadi NULL pada record.
6. IF a create or update Objective request mengirim `strategy_id` yang tidak ditemukan pada tabel `strategies` atau record-nya `deleted_at IS NOT NULL`, THEN THE Objective_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.strategy_id`, tanpa menulis perubahan ke database.
7. IF a create or update Objective request mengirim `segment_id` yang tidak ditemukan pada tabel `segments` atau record-nya `deleted_at IS NOT NULL`, THEN THE Objective_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.segment_id`, tanpa menulis perubahan ke database.
8. IF a create or update Objective request mengirim `division_id` yang tidak ditemukan pada tabel `divisions` atau record-nya `deleted_at IS NOT NULL`, THEN THE Objective_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.division_id`, tanpa menulis perubahan ke database.
9. IF a create or update Objective request mengirim `owner_id` yang tidak ditemukan pada tabel `users` atau record-nya `deleted_at IS NOT NULL`, THEN THE Objective_Service SHALL menolak request dengan HTTP 422 dan struktur error `errors.owner_id`, tanpa menulis perubahan ke database.
10. IF a create or update Objective request mengirim `notes` dengan panjang lebih dari 5000 karakter, THEN THE Objective_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.notes`, tanpa menulis perubahan ke database.
11. IF a create or update Objective request mengirim `strategy_id`/`segment_id`/`division_id`/`owner_id` dengan tipe non-integer, THEN THE Objective_Service SHALL menolak dengan HTTP 400 dan struktur error per field, tanpa menulis perubahan ke database.
12. THE Objective_Service SHALL mempertahankan permission edit/delete Objective hanya untuk user dengan `id` sama dengan `objectives.created_by`, tanpa memperhatikan `owner_id`, dan menolak dengan HTTP 403 untuk user lain.
13. WHEN a GET Objective request mengembalikan data, THE Objective_Service SHALL menyertakan field `strategy`, `segment`, `division`, dan `owner` sebagai object dengan field minimum `id`, `name` (untuk owner: `name` dan `email`), `color` (kecuali owner), dan `code` (khusus division), ketika nilai relasi tidak NULL.
14. WHEN a GET Objective request mengembalikan data dan nilai relasi `strategy_id`/`segment_id`/`division_id`/`owner_id` adalah NULL, THE Objective_Service SHALL mengembalikan field `strategy`/`segment`/`division`/`owner` sebagai null pada response.

### Requirement 6: Objective List Filter by Strategy/Segment/Division

**User Story:** As a user, I want to filter Objective list by Strategy, Segment, atau Division, so that saya dapat fokus pada subset OKR yang relevan.

#### Acceptance Criteria

1. THE Objective_Service SHALL menerima query parameter `strategy_id`, `segment_id`, dan `division_id` (semua optional, masing-masing accept single positive integer) pada endpoint `GET /api/objectives`.
2. WHEN request `GET /api/objectives` menyertakan `strategy_id={n}` dengan n integer positif, THE Objective_Service SHALL hanya mengembalikan Objective dengan `strategy_id = n` dan `deleted_at IS NULL`.
3. WHEN request `GET /api/objectives` menyertakan `segment_id={n}` dengan n integer positif, THE Objective_Service SHALL hanya mengembalikan Objective dengan `segment_id = n` dan `deleted_at IS NULL`.
4. WHEN request `GET /api/objectives` menyertakan `division_id={n}` dengan n integer positif, THE Objective_Service SHALL hanya mengembalikan Objective dengan `division_id = n` dan `deleted_at IS NULL`.
5. WHEN request `GET /api/objectives` menyertakan kombinasi dua atau lebih filter di antara `strategy_id`, `segment_id`, `division_id`, THE Objective_Service SHALL mengembalikan Objective yang memenuhi semua filter (AND logic).
6. WHEN tidak ada Objective yang memenuhi kombinasi filter, THE Objective_Service SHALL mengembalikan HTTP 200 dengan `data: []` dan meta pagination yang konsisten (`total: 0`, `total_pages: 0`).
7. IF salah satu parameter filter berisi nilai non-integer, integer non-positif, atau ID yang tidak ditemukan pada master tabel terkait, THEN THE Objective_Service SHALL menolak dengan HTTP 400 dan struktur error per field, tanpa mengeksekusi query daftar.
8. THE Objective_Service SHALL mempertahankan dukungan untuk parameter existing `period_id`, `page` (default 1, min 1), dan `limit` (default 10, max 100) pada endpoint `GET /api/objectives` dan menggabungkannya dengan filter konteks tanpa konflik.

### Requirement 7: Objective Search Result with Context

**User Story:** As a user, I want global search results menampilkan konteks Strategy/Segment/Division saat relevan, so that saya bisa membedakan Objective dengan judul mirip.

#### Acceptance Criteria

1. WHEN a request `GET /api/search?q=...` mengembalikan item bertipe Objective, THE Objective_Service SHALL menyertakan field `strategy_name`, `segment_name`, dan `division_name` (string max 255 karakter atau null) pada item tersebut.
2. IF Objective hasil search tidak memiliki Strategy ter-set (`strategy_id IS NULL` atau Strategy ter-soft-delete), THEN THE Objective_Service SHALL mengembalikan `strategy_name` sebagai null.
3. IF Objective hasil search tidak memiliki Segment ter-set (`segment_id IS NULL` atau Segment ter-soft-delete), THEN THE Objective_Service SHALL mengembalikan `segment_name` sebagai null.
4. IF Objective hasil search tidak memiliki Division ter-set (`division_id IS NULL` atau Division ter-soft-delete), THEN THE Objective_Service SHALL mengembalikan `division_name` sebagai null.
5. WHEN search result mengandung item bertipe selain Objective (Key Result, Initiative, Sprint), THE Objective_Service SHALL tidak menyertakan field `strategy_name`, `segment_name`, atau `division_name` pada item tersebut.

### Requirement 8: Objective Form UI Inputs

**User Story:** As a user, I want Objective form menyediakan input untuk Strategy, Segment, Division, Owner, dan Notes, so that saya dapat mengisi konteks saat membuat atau mengubah Objective.

#### Acceptance Criteria

1. THE Objective_Form SHALL menampilkan dropdown Strategy yang berisi opsi "Tidak dipilih" di posisi teratas (merepresentasikan null) diikuti seluruh Active_Master_Record Strategy yang diurutkan ascending case-insensitive berdasarkan `name`.
2. THE Objective_Form SHALL menampilkan dropdown Segment yang berisi opsi "Tidak dipilih" di posisi teratas (merepresentasikan null) diikuti seluruh Active_Master_Record Segment yang diurutkan ascending case-insensitive berdasarkan `name`.
3. THE Objective_Form SHALL menampilkan dropdown Division yang berisi opsi "Tidak dipilih" di posisi teratas (merepresentasikan null) diikuti seluruh Active_Master_Record Division yang diurutkan ascending case-insensitive berdasarkan `name`.
4. THE Objective_Form SHALL menampilkan selector Owner yang berisi opsi "Tidak dipilih" di posisi teratas (merepresentasikan null) diikuti seluruh user yang `deleted_at IS NULL`, diurutkan ascending case-insensitive berdasarkan `name`.
5. THE Objective_Form SHALL menampilkan textarea Notes yang menerima input multi-line dengan panjang 0-5000 karakter dan menampilkan character counter dengan format `{used}/5000`.
6. IF panjang input Notes melebihi 5000 karakter, THEN THE Objective_Form SHALL menampilkan inline error pada field Notes dan men-disable tombol Simpan sampai panjang valid.
7. WHEN user membuka Objective_Form pada mode edit untuk Objective yang sudah punya `strategy_id`/`segment_id`/`division_id`/`owner_id`/`notes`, THE Objective_Form SHALL prefill field tersebut dengan nilai existing Objective; ketika nilai null, dropdown/selector terkait di-set ke opsi "Tidak dipilih".
8. IF master data Strategy/Segment/Division gagal di-load (response 5xx atau timeout 10 detik), THEN THE Objective_Form SHALL menampilkan inline error di dropdown terkait dan men-disable dropdown tersebut sampai retry berhasil.
9. WHEN user menekan tombol Simpan pada Objective_Form, THE Objective_Form SHALL mengirim payload yang mencakup `strategy_id`, `segment_id`, `division_id`, `owner_id`, dan `notes`, dengan nilai null untuk opsi "Tidak dipilih" dan nilai null untuk Notes yang kosong setelah trim whitespace.

### Requirement 9: Objective Card Badges and Owner Avatar

**User Story:** As a user, I want Objective_Card menampilkan badge Strategy/Segment/Division berwarna dan avatar Owner, so that saya dapat membaca konteks Objective dengan cepat.

#### Acceptance Criteria

1. WHEN sebuah Objective memiliki `strategy_id` non-null dan Strategy ter-relasi `deleted_at IS NULL`, THE Objective_Card SHALL menampilkan badge yang memuat nama Strategy (truncate 30 karakter dengan ellipsis jika lebih panjang) dengan warna background sesuai field `color` Strategy.
2. WHEN sebuah Objective memiliki `segment_id` non-null dan Segment ter-relasi `deleted_at IS NULL`, THE Objective_Card SHALL menampilkan badge yang memuat nama Segment (truncate 30 karakter dengan ellipsis jika lebih panjang) dengan warna background sesuai field `color` Segment.
3. WHEN sebuah Objective memiliki `division_id` non-null dan Division ter-relasi `deleted_at IS NULL`, THE Objective_Card SHALL menampilkan badge yang memuat field `code` Division dengan warna background sesuai field `color` Division.
4. IF field `color` pada master data tidak valid (tidak cocok Color_Code), null, atau master record `deleted_at IS NOT NULL`, THEN THE Objective_Card SHALL tetap merender badge dengan warna fallback `#E5E7EB` dan tidak melempar error.
5. WHEN sebuah Objective memiliki `owner_id` non-null dan Owner `deleted_at IS NULL`, THE Objective_Card SHALL menampilkan avatar Owner berukuran 32x32px berisi 1-2 karakter pertama dari `name` (uppercase), beserta tooltip yang muncul setelah hover 500ms berisi `name` dan `email` Owner.
6. IF sebuah Objective tidak memiliki nilai `strategy_id`/`segment_id`/`division_id`/`owner_id` (NULL), THEN THE Objective_Card SHALL tidak menampilkan badge atau avatar yang bersangkutan untuk field tersebut.
7. IF FK `strategy_id`/`segment_id`/`division_id`/`owner_id` non-null tetapi master record terkait tidak ditemukan (orphan reference), THEN THE Objective_Card SHALL tidak menampilkan badge/avatar untuk field tersebut dan tidak melempar error.

### Requirement 10: Objective List Filter Chips UI

**User Story:** As a user, I want Objective_List_Page menyediakan chip filter Strategy/Segment/Division, so that saya bisa memfilter Objective langsung dari UI.

#### Acceptance Criteria

1. THE Objective_List_Page SHALL menampilkan tiga grup chip filter (Strategy, Segment, Division), masing-masing dimulai dengan chip "Semua" diikuti seluruh Active_Master_Record yang diurutkan ascending case-insensitive berdasarkan `name`.
2. WHEN Objective_List_Page pertama kali dimuat, THE Objective_List_Page SHALL menampilkan chip "Semua" dalam keadaan terpilih pada setiap kategori secara default.
3. WHEN user memilih satu chip Strategy/Segment/Division (selain "Semua"), THE Objective_List_Page SHALL memanggil `GET /api/objectives` dengan parameter filter yang sesuai dan menampilkan hasil yang difilter dalam waktu maksimum 2 detik.
4. WHEN user memilih chip "Semua" pada salah satu kategori, THE Objective_List_Page SHALL menghapus parameter filter kategori tersebut dari request berikutnya.
5. THE Objective_List_Page SHALL menerapkan single-select per kategori (memilih chip baru pada kategori yang sama akan menggantikan pilihan sebelumnya pada kategori tersebut).
6. WHILE setidaknya satu filter chip aktif (selain "Semua"), THE Objective_List_Page SHALL menampilkan indikator visual filled (background warna primary) pada chip aktif dan outline pada chip lain di kategori yang sama.
7. WHEN user memilih chip pada satu kategori, THE Objective_List_Page SHALL mempertahankan pilihan filter pada kategori lain dan menggabungkannya dalam satu request.
8. WHILE request fetch sedang berlangsung, THE Objective_List_Page SHALL menampilkan loading skeleton pada list area.
9. IF request `GET /api/objectives` gagal dengan HTTP 5xx atau timeout, THEN THE Objective_List_Page SHALL menampilkan error message dengan tombol "Coba lagi".
10. IF kategori tidak memiliki Active_Master_Record (master kosong), THEN THE Objective_List_Page SHALL menampilkan grup chip dengan hanya "Semua" tanpa error.

### Requirement 11: Master Admin Page

**User Story:** As a user, I want a master admin page dengan tab Strategy/Segment/Division, so that saya bisa mengelola seluruh master data dari satu tempat.

#### Acceptance Criteria

1. THE Master_Admin_Page SHALL tersedia pada route `/admin/masters` dan terlindungi oleh `ProtectedRoute` (memerlukan autentikasi).
2. THE Master_Admin_Page SHALL menampilkan tiga tab: Strategy, Segment, dan Division, dengan tab Strategy aktif sebagai default ketika halaman pertama kali dibuka.
3. WHEN user memilih tab Strategy, THE Master_Admin_Page SHALL menampilkan tabel Strategy dengan kolom Name, Description, Color (visual), Sort Order, Is Active, Updated At, beserta tombol "Tambah Strategy" dan tombol Edit/Hapus per baris.
4. WHEN user memilih tab Segment, THE Master_Admin_Page SHALL menampilkan tabel Segment dengan kolom Name, Description, Color (visual), Is Active, Updated At, beserta tombol "Tambah Segment" dan tombol Edit/Hapus per baris.
5. WHEN user memilih tab Division, THE Master_Admin_Page SHALL menampilkan tabel Division dengan kolom Name, Code, Description, Color (visual), Is Active, Updated At, beserta tombol "Tambah Division" dan tombol Edit/Hapus per baris.
6. WHEN user menekan tombol "Tambah" atau "Edit" pada tab manapun, THE Master_Admin_Page SHALL membuka modal form berisi input untuk semua field master yang bersangkutan termasuk picker warna untuk field `color` (menampilkan preview warna real-time), beserta tombol Save dan Cancel.
7. IF input pada modal form tidak memenuhi validasi (panjang field di luar bound, color tidak valid, name/code duplikat dari sisi UI cache), THEN THE Master_Admin_Page SHALL menampilkan inline error per field dan tidak mengirim request.
8. WHEN user menekan tombol "Hapus" pada baris master, THE Master_Admin_Page SHALL menampilkan dialog konfirmasi dengan tombol Confirm dan Cancel, dan hanya mengirim request delete ketika user menekan Confirm.
9. WHEN sebuah operasi create/update/delete master berhasil dengan HTTP 2xx, THE Master_Admin_Page SHALL menampilkan toast sukses, menutup modal/dialog, dan me-refresh tabel dengan data terbaru.
10. IF sebuah operasi create/update/delete master gagal dengan HTTP 4xx atau 5xx, THEN THE Master_Admin_Page SHALL menampilkan toast error dengan pesan dari response server jika tersedia, atau pesan fallback "Operasi gagal, silakan coba lagi" jika response.message kosong; modal tetap terbuka.
11. WHILE master data sedang di-fetch (initial load atau refresh), THE Master_Admin_Page SHALL menampilkan loading state pada tabel yang aktif.

### Requirement 12: Default Seed Data

**User Story:** As a user, I want default master data tersedia setelah migrasi, so that saya dapat mulai mengkategorikan Objective tanpa setup manual.

#### Acceptance Criteria

1. WHEN seeder dijalankan dan tabel `strategies` belum memiliki record (yang `deleted_at IS NULL`) dengan name (case-insensitive, trim) yang sama, THE Master_Service SHALL membuat 3 record Strategy: "Defend to Scale", "Extend", "Transform", masing-masing dengan `is_active = true` dan `color` yang sesuai Color_Code, dalam satu transaksi DB.
2. WHEN seeder dijalankan dan tabel `segments` belum memiliki record (yang `deleted_at IS NULL`) dengan name (case-insensitive, trim) yang sama, THE Master_Service SHALL membuat 4 record Segment: "SME", "Enterprise", "Government", "B2B ICT", masing-masing dengan `is_active = true` dan `color` yang sesuai Color_Code, dalam satu transaksi DB.
3. WHEN seeder dijalankan dan tabel `divisions` belum memiliki record (yang `deleted_at IS NULL`) dengan name (case-insensitive, trim) yang sama, THE Master_Service SHALL membuat 6 record Division: "Product", "Developer", "GTM", "UX", "Operational", "Data", masing-masing dengan `code` unik, `is_active = true`, dan `color` yang sesuai Color_Code, dalam satu transaksi DB.
4. WHEN seeder dijalankan ulang pada database yang sudah memiliki sebagian atau seluruh seed records (matching by `name` case-insensitive setelah trim), THE Master_Service SHALL hanya membuat record yang belum ada DAN tidak menimpa field apapun (termasuk `is_active`, `color`, `code`) pada record existing, DAN tidak menghapus record existing.
5. IF transaksi seeder gagal pada salah satu langkah, THEN THE Master_Service SHALL melakukan rollback sehingga tidak ada record baru yang ter-create dan mengembalikan indikasi failure ke caller.
6. WHEN seeder selesai (sukses atau partial), THE Master_Service SHALL mengembalikan summary dengan jumlah record yang ter-create per entity (e.g. `{strategies: 3, segments: 0, divisions: 6}`).

### Requirement 13: Backward Compatibility for Existing Objectives

**User Story:** As an existing user, I want Objective lama tetap valid setelah fitur ini di-deploy, so that data historis tidak rusak.

#### Acceptance Criteria

1. WHEN migrasi fitur ini dijalankan pada database existing dengan Objective lama, THE Objective_Service SHALL menambahkan kolom `strategy_id`, `segment_id`, `division_id`, `owner_id` (nullable BIGINT UNSIGNED), dan `notes` (nullable TEXT) dengan nilai NULL pada seluruh Objective existing, dalam satu transaksi DB.
2. IF migrasi gagal pada salah satu langkah ALTER TABLE, THEN THE Objective_Service SHALL melakukan rollback transaksi sehingga schema database kembali ke kondisi sebelum migrasi.
3. WHEN user membuka Objective_List_Page dan terdapat Objective dengan nilai NULL pada `strategy_id`/`segment_id`/`division_id`/`owner_id`, THE Objective_Card SHALL merender Objective tersebut tanpa error dalam waktu maksimum 2 detik dan tanpa badge/avatar untuk field NULL.
4. WHEN user mengubah Objective lama melalui Objective_Form tanpa mengisi field konteks baru, THE Objective_Service SHALL menyimpan record dengan field konteks tetap NULL.
5. WHEN endpoint `GET /api/objectives` atau `GET /api/objectives/:id` mengembalikan Objective lama, THE Objective_Service SHALL men-serialize field `strategy`, `segment`, `division`, `owner` sebagai null pada response (tidak omit, tidak undefined).
6. THE Objective_Service SHALL tidak mengubah business rule existing untuk: (a) progress calculation (avg KR progress), (b) status values (`PLANNING`/`ON_TRACK`/`AT_RISK`/`OFF_TRACK`/`DONE`/`ARCHIVED`), (c) ownership edit/delete (hanya `created_by`), (d) cascade soft-delete Objective → Key Result → Initiative, (e) format Notification dan Activity Log.

### Requirement 14: Activity Logging for New Fields

**User Story:** As a user, I want perubahan field konteks pada Objective tercatat di activity log, so that saya bisa menelusuri perubahan strategis.

#### Acceptance Criteria

1. WHEN user mengubah nilai `strategy_id`, `segment_id`, `division_id`, `owner_id`, atau `notes` pada Objective melalui endpoint update Objective dan operasi sukses, THE Objective_Service SHALL membuat satu record `activity_logs` dengan `action = "UPDATE"`, `entity_type = "OBJECTIVE"`, `entity_id` = ID Objective, `user_id` = user yang melakukan update, `created_at` = timestamp operasi, dan `old_value`/`new_value` JSON yang hanya memuat field-field yang nilainya berubah (perbandingan equality terhadap nilai pre-update).
2. WHEN user membuat Objective baru dengan salah satu atau lebih field `strategy_id`, `segment_id`, `division_id`, `owner_id`, atau `notes` ter-set (tidak null untuk FK; tidak null dan tidak empty setelah trim untuk `notes`), THE Objective_Service SHALL menyertakan field-field tersebut pada `new_value` di record `activity_logs` dengan `action = "CREATE"`.
3. IF user mengirim update Objective tanpa perubahan nilai pada `strategy_id`, `segment_id`, `division_id`, `owner_id`, atau `notes` (semua field absent atau nilainya sama dengan pre-update), THEN THE Objective_Service SHALL tidak menambahkan field-field tersebut ke `old_value`/`new_value` dari activity log UPDATE; dan jika tidak ada field lain yang berubah, tidak membuat activity log sama sekali.
4. IF transaksi create/update Objective gagal (rollback), THEN THE Objective_Service SHALL tidak membuat record `activity_logs` untuk operasi tersebut.
