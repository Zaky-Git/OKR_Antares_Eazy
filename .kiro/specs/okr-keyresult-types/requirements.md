# Requirements Document

## Introduction

Fitur ini menambahkan dukungan dua tipe Key Result pada aplikasi OKR Antares Eazy: METRIC (KR numerik dengan baseline + target + current + metric unit) dan MILESTONE (KR binary done/not-done dengan due date). Saat ini seluruh KR di-treat sebagai metric numerik dengan field `target_value`, `current_value`, `metric_unit`, `progress`, dan `status`. Fitur ini menambahkan kolom `kr_type` (ENUM 'METRIC'/'MILESTONE'), `baseline_value` (nilai awal sebelum tracking untuk METRIC), `due_date` (deadline untuk MILESTONE), dan `notes` (catatan bebas) pada tabel `key_results`. Semua kolom tambahan nullable agar tidak merusak data lama, dengan migration auto-set existing KR ke `kr_type = 'METRIC'`. Perhitungan progress dibedakan per tipe: METRIC dihitung dengan rumus baseline-aware `((current - baseline) / (target - baseline)) * 100` clamped 0-100, sementara MILESTONE bersifat binary 0 atau 100. Form KR di frontend menampilkan radio button Type yang men-toggle field input yang tampil, card KR di list menampilkan visual berbeda sesuai tipe, dan filter dropdown opsional ditambahkan ke list KR. Activity log mencatat perubahan field baru. Tidak ada perubahan business rule existing (cascade delete, ownership, progress chain ke Objective tetap berjalan).

## Glossary

- **Key_Result**: Entity OKR pada level antara Objective dan Initiative yang merepresentasikan ukuran keberhasilan; kolom existing berada di tabel `key_results`.
- **KR_Type**: Nilai enum bertipe string yang menentukan kategori Key_Result, dengan domain `METRIC` dan `MILESTONE`. Disimpan pada kolom `key_results.kr_type` bertipe `VARCHAR(20)` dengan constraint check pada nilai yang diterima.
- **METRIC_KR**: Key_Result dengan `kr_type = 'METRIC'` yang mengukur progress numerik dari baseline ke target.
- **MILESTONE_KR**: Key_Result dengan `kr_type = 'MILESTONE'` yang bersifat binary (selesai atau belum) dengan due date opsional.
- **Baseline_Value**: Nilai awal numerik sebelum tracking dimulai pada METRIC_KR. Disimpan pada kolom `key_results.baseline_value` bertipe `DECIMAL(10,2)` nullable, default 0.
- **Target_Value**: Nilai numerik yang ingin dicapai pada METRIC_KR. Kolom existing `key_results.target_value` bertipe `DECIMAL(10,2)` not null default 100.
- **Current_Value**: Nilai numerik aktual pada METRIC_KR. Kolom existing `key_results.current_value` bertipe `DECIMAL(10,2)` not null default 0.
- **Metric_Unit**: Label unit numerik pada METRIC_KR (mis. "transactions", "%", "users"). Kolom existing `key_results.metric_unit` bertipe `VARCHAR(50)` nullable.
- **Due_Date**: Tanggal deadline pada MILESTONE_KR. Disimpan pada kolom `key_results.due_date` bertipe `DATE` nullable.
- **Notes**: Catatan teks bebas pada Key_Result, panjang 0-5000 karakter. Disimpan pada kolom `key_results.notes` bertipe `TEXT` nullable.
- **KR_Progress**: Nilai numerik 0-100 pada kolom `key_results.progress` (DECIMAL(5,2)) yang menyatakan persentase pencapaian Key_Result.
- **KR_Status**: Nilai string pada kolom `key_results.status` dengan domain `PLANNING`, `ON_TRACK`, `AT_RISK`, `OFF_TRACK`, `DONE`, `ARCHIVED`.
- **KeyResult_Service**: Layanan backend (Go + Gin + GORM) yang mengelola create/update/delete Key_Result, perhitungan KR_Progress, dan validasi per KR_Type.
- **KeyResult_Migration**: Komponen backend yang menambah kolom `kr_type`, `baseline_value`, `due_date`, dan `notes` pada tabel `key_results` dan melakukan backfill `kr_type = 'METRIC'` pada record dengan `kr_type IS NULL`.
- **ActivityLog_Service**: Layanan backend existing yang mencatat perubahan entity ke tabel `activity_logs`.
- **KeyResult_Form**: Komponen frontend (`KeyResultPanel.tsx` atau modal turunannya) yang digunakan untuk create/edit Key_Result.
- **KeyResult_Card**: Komponen frontend yang menampilkan ringkasan satu Key_Result pada halaman Objective Detail dan list KR.
- **KeyResult_Filter**: Komponen frontend opsional berupa dropdown filter `kr_type` pada list Key_Result.
- **PatchableUint**: Tipe Go existing pada package `objective` yang membedakan "key absent" vs "key present with null value" untuk field uint nullable di payload PATCH.
- **PatchableFloat**: Tipe Go yang membedakan "key absent" vs "key present with null value" untuk field float64 nullable di payload PATCH (analog PatchableUint).
- **PatchableString**: Tipe Go existing pada package `objective` yang membedakan "key absent" vs "key present with null value" untuk field string nullable di payload PATCH.
- **PatchableDate**: Tipe Go yang membedakan "key absent" vs "key present with null value" untuk field tanggal (string format `YYYY-MM-DD`) nullable di payload PATCH.
- **Authenticated_Request**: HTTP request yang menyertakan JWT token valid (tidak expired, tidak malformed) pada header Authorization.

## Requirements

### Requirement 1: Key Result Schema Extension

**User Story:** As a backend engineer, I want tabel `key_results` punya kolom `kr_type`, `baseline_value`, `due_date`, dan `notes`, so that aplikasi dapat membedakan METRIC_KR dan MILESTONE_KR tanpa merusak data lama.

#### Acceptance Criteria

1. THE KeyResult_Migration SHALL menambahkan kolom `kr_type` bertipe `VARCHAR(20)` nullable pada tabel `key_results`, dengan domain nilai yang diizinkan `METRIC` dan `MILESTONE`.
2. THE KeyResult_Migration SHALL menambahkan kolom `baseline_value` bertipe `DECIMAL(10,2)` nullable dengan default `0` pada tabel `key_results`.
3. THE KeyResult_Migration SHALL menambahkan kolom `due_date` bertipe `DATE` nullable pada tabel `key_results`.
4. THE KeyResult_Migration SHALL menambahkan kolom `notes` bertipe `TEXT` nullable pada tabel `key_results`.
5. WHEN KeyResult_Migration dijalankan pada database yang sudah memiliki record `key_results` dengan `kr_type IS NULL`, THE KeyResult_Migration SHALL meng-update record tersebut menjadi `kr_type = 'METRIC'` dalam satu transaksi DB, tanpa menyentuh record dengan `kr_type` non-null.
6. WHEN KeyResult_Migration dijalankan dan tidak ada record `key_results` dengan `kr_type IS NULL`, THE KeyResult_Migration SHALL menyelesaikan tanpa error tanpa mengeksekusi statement update, sehingga operasi backfill bersifat idempotent dan tidak menulis perubahan ke database.
7. THE KeyResult_Service SHALL men-set nilai default `kr_type = 'METRIC'` ketika record Key_Result dibuat tanpa field `kr_type` di payload.
8. THE KeyResult_Service SHALL mempertahankan kolom existing `target_value`, `current_value`, `metric_unit`, `progress`, dan `status` tanpa mengubah tipe, default, atau nullability-nya.

### Requirement 2: Create Key Result with kr_type

**User Story:** As a user, I want to membuat Key_Result dengan tipe METRIC atau MILESTONE, so that saya dapat mendokumentasikan KR sesuai sifatnya (numerik atau binary).

#### Acceptance Criteria

1. WHEN an Authenticated_Request `POST /api/objectives/:id/key-results` diterima dengan field `title` (1-255 karakter setelah trim), `kr_type` bernilai `METRIC` atau `MILESTONE`, dan field tambahan optional `description`, `target_value`, `current_value`, `baseline_value`, `metric_unit`, `due_date`, `notes`, THE KeyResult_Service SHALL membuat record baru pada tabel `key_results` dan mengembalikan HTTP 201 beserta data record termasuk `kr_type`, `baseline_value`, `due_date`, dan `notes`.
2. WHEN a create Key_Result request tidak menyertakan field `kr_type` di payload, THE KeyResult_Service SHALL menyimpan record dengan `kr_type = 'METRIC'`.
3. IF a create Key_Result request mengirim `kr_type` dengan nilai selain `METRIC` atau `MILESTONE` (case-sensitive), THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.kr_type` mengindikasikan nilai tidak valid, tanpa menulis perubahan ke database.
4. WHEN a create METRIC_KR request diterima, THE KeyResult_Service SHALL mewajibkan `target_value` dengan nilai `> 0` dan menerima `baseline_value` (default 0 jika absent atau null) serta `current_value` (default 0 jika absent atau null) dengan nilai `>= 0`.
5. IF a create METRIC_KR request memiliki `target_value` `<= 0` atau absent, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.target_value`, tanpa menulis perubahan ke database.
6. IF a create METRIC_KR request memiliki `current_value` atau `baseline_value` bernilai negatif, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error per field, tanpa menulis perubahan ke database.
7. WHEN a create MILESTONE_KR request diterima, THE KeyResult_Service SHALL menerima field `due_date` dalam format `YYYY-MM-DD` (nullable, optional) dan menyimpan field `target_value`, `current_value`, `baseline_value`, `metric_unit` apa adanya tanpa menerapkan validasi numerik METRIC.
8. IF a create MILESTONE_KR request memiliki `due_date` non-null dengan format string yang tidak cocok pola `YYYY-MM-DD` atau bukan tanggal kalender valid, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.due_date`, tanpa menulis perubahan ke database.
9. IF a create Key_Result request mengirim `notes` dengan panjang lebih dari 5000 karakter, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.notes`, tanpa menulis perubahan ke database.
10. WHEN a create Key_Result berhasil dengan HTTP 201, THE KeyResult_Service SHALL memanggil ActivityLog_Service untuk mencatat aksi `CREATE` dengan `entity_type = 'KEY_RESULT'`, `entity_id` sama dengan id record yang dibuat, dan `new_value` mencakup `kr_type`, `target_value`, `current_value`, `baseline_value`, `due_date`, dan `notes`.

### Requirement 3: Update Key Result with kr_type Semantics

**User Story:** As a user, I want to update Key_Result dan mengubah field tipe-spesifik termasuk `kr_type`, so that saya bisa mengoreksi atau berganti tipe KR sesuai kebutuhan.

#### Acceptance Criteria

1. THE KeyResult_Service SHALL menerima payload `PATCH /api/key-results/:id` yang mendukung semantik PatchableUint/PatchableFloat/PatchableString/PatchableDate untuk field `kr_type`, `target_value`, `current_value`, `baseline_value`, `metric_unit`, `due_date`, dan `notes`, sehingga key absent berarti "tidak diubah" dan key dengan nilai null berarti "set ke NULL atau nilai default" sesuai aturan per kolom.
2. WHEN a PATCH Key_Result request tidak menyertakan key `kr_type`, `baseline_value`, `due_date`, atau `notes`, THE KeyResult_Service SHALL mempertahankan nilai existing pada kolom yang absent.
3. WHEN a PATCH Key_Result request mengirim `kr_type` dengan nilai `METRIC` atau `MILESTONE`, THE KeyResult_Service SHALL memperbarui `kr_type` ke nilai tersebut dan tetap mempertahankan kolom numerik existing kecuali dikirim ulang oleh user.
4. IF a PATCH Key_Result request mengirim `kr_type` dengan nilai null, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.kr_type` mengindikasikan nilai wajib non-null, tanpa menulis perubahan ke database.
5. IF a PATCH Key_Result request mengirim `kr_type` dengan nilai selain `METRIC` atau `MILESTONE`, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.kr_type`, tanpa menulis perubahan ke database.
6. WHEN a PATCH METRIC_KR request mengirim `target_value` non-null, THE KeyResult_Service SHALL mewajibkan nilai `> 0` dan menolak dengan HTTP 400 jika `<= 0`, tanpa menulis perubahan ke database.
7. WHEN a PATCH METRIC_KR request mengirim `current_value` atau `baseline_value` non-null, THE KeyResult_Service SHALL mewajibkan nilai `>= 0` dan menolak dengan HTTP 400 jika negatif, tanpa menulis perubahan ke database.
8. WHEN a PATCH METRIC_KR request mengirim `baseline_value` dengan nilai null, THE KeyResult_Service SHALL men-set kolom `baseline_value` menjadi 0.
9. WHEN a PATCH MILESTONE_KR request mengirim `due_date` dengan nilai null, THE KeyResult_Service SHALL men-set kolom `due_date` menjadi NULL.
10. WHEN a PATCH MILESTONE_KR request mengirim `due_date` dengan string format `YYYY-MM-DD` valid, THE KeyResult_Service SHALL men-set kolom `due_date` ke tanggal tersebut.
11. IF a PATCH Key_Result request mengirim `due_date` non-null dengan format string yang tidak cocok pola `YYYY-MM-DD` atau bukan tanggal kalender valid, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.due_date`, tanpa menulis perubahan ke database.
12. WHEN a PATCH Key_Result request mengirim `notes` dengan nilai null, THE KeyResult_Service SHALL men-set kolom `notes` menjadi NULL.
13. WHEN a PATCH Key_Result request mengirim `notes` dengan string panjang 1-5000 karakter, THE KeyResult_Service SHALL men-set kolom `notes` ke string tersebut.
14. IF a PATCH Key_Result request mengirim `notes` dengan panjang lebih dari 5000 karakter, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.notes`, tanpa menulis perubahan ke database.
15. THE KeyResult_Service SHALL mempertahankan permission edit Key_Result hanya untuk user dengan `id` sama dengan `key_results.created_by` dan menolak dengan HTTP 403 untuk user lain pada endpoint PATCH.
16. IF a PATCH Key_Result request menargetkan `id` yang tidak ditemukan atau `deleted_at IS NOT NULL`, THEN THE KeyResult_Service SHALL menolak dengan HTTP 404, tanpa menulis perubahan ke database.

### Requirement 4: METRIC Progress Calculation

**User Story:** As a user, I want progress METRIC_KR dihitung dari baseline, target, dan current secara konsisten, so that saya dapat melihat persentase pencapaian yang benar walaupun baseline bukan nol.

#### Acceptance Criteria

1. WHEN sebuah METRIC_KR di-create atau di-update sehingga `target_value > baseline_value`, THE KeyResult_Service SHALL menghitung KR_Progress dengan formula `((current_value - baseline_value) / (target_value - baseline_value)) * 100`, kemudian clamp hasilnya ke range 0-100 (nilai `< 0` menjadi 0, nilai `> 100` menjadi 100).
2. WHEN sebuah METRIC_KR di-create atau di-update sehingga `target_value < baseline_value` (target turun dari baseline, mis. "kurangi cost dari 100 ke 60"), THE KeyResult_Service SHALL menghitung KR_Progress dengan formula `((baseline_value - current_value) / (baseline_value - target_value)) * 100`, kemudian clamp hasilnya ke range 0-100.
3. WHEN sebuah METRIC_KR di-create atau di-update sehingga `target_value == baseline_value` dan `current_value >= target_value`, THE KeyResult_Service SHALL men-set KR_Progress ke 100.
4. WHEN sebuah METRIC_KR di-create atau di-update sehingga `target_value == baseline_value` dan `current_value < target_value`, THE KeyResult_Service SHALL men-set KR_Progress ke 0.
5. WHEN sebuah METRIC_KR di-create atau di-update tanpa nilai eksplisit untuk `baseline_value`, THE KeyResult_Service SHALL menggunakan `baseline_value = 0` pada perhitungan KR_Progress.
6. THE KeyResult_Service SHALL menyimpan KR_Progress dengan presisi maksimal 2 desimal (kolom `progress` bertipe `DECIMAL(5,2)`), membulatkan hasil perhitungan ke 2 desimal terdekat (half-up rounding) dan tidak menolak input numerik dengan presisi lebih tinggi.
7. WHEN initiative root di bawah METRIC_KR berubah progress dan trigger recalculation existing aktif, THE KeyResult_Service SHALL meng-update `current_value = (avg root initiative progress / 100) * (target_value - baseline_value) + baseline_value`, kemudian menerapkan formula KR_Progress sesuai criterion 1-4 di atas.
8. WHEN sebuah METRIC_KR memiliki KR_Status = `DONE`, THE KeyResult_Service SHALL men-set KR_Progress ke 100 menggantikan hasil formula numerik, dan menyimpan nilai `current_value` apa adanya tanpa diubah otomatis.
9. WHEN KR_Status sebuah METRIC_KR berubah dari `DONE` ke status lain (mis. `ON_TRACK`), THE KeyResult_Service SHALL menghitung ulang KR_Progress menggunakan formula METRIC pada criterion 1-5 berdasarkan nilai `baseline_value`, `target_value`, dan `current_value` saat itu.

### Requirement 5: MILESTONE Progress Behavior

**User Story:** As a user, I want progress MILESTONE_KR bersifat binary (0 atau 100), so that saya dapat menandai milestone sebagai selesai atau belum tanpa input numerik.

#### Acceptance Criteria

1. THE KeyResult_Service SHALL men-set KR_Progress sebuah MILESTONE_KR ke 100 ketika KR_Status = `DONE` dan ke 0 ketika KR_Status bukan `DONE` (`PLANNING`, `ON_TRACK`, `AT_RISK`, `OFF_TRACK`, `ARCHIVED`).
2. WHEN sebuah MILESTONE_KR di-update melalui PATCH `/api/key-results/:id` dengan `status = 'DONE'`, THE KeyResult_Service SHALL men-set KR_Progress ke 100 pada record yang sama dalam transaksi update.
3. WHEN sebuah MILESTONE_KR di-update melalui PATCH `/api/key-results/:id` dengan `status` bernilai selain `DONE`, THE KeyResult_Service SHALL men-set KR_Progress ke 0 pada record yang sama dalam transaksi update.
4. WHEN an Authenticated_Request `PATCH /api/key-results/:id/toggle-milestone` diterima dan target Key_Result memiliki `kr_type = 'MILESTONE'`, THE KeyResult_Service SHALL membalik KR_Status: jika sebelumnya `DONE` menjadi `IN_PROGRESS` mapping ke `ON_TRACK`, jika sebelumnya bukan `DONE` menjadi `DONE`, dan menyesuaikan KR_Progress sesuai criterion 1, dalam satu transaksi DB.
5. IF a `PATCH /api/key-results/:id/toggle-milestone` request menargetkan Key_Result dengan `kr_type = 'METRIC'`, THEN THE KeyResult_Service SHALL menolak dengan HTTP 422 dan pesan error `Cannot toggle milestone on METRIC key result`, tanpa menulis perubahan ke database.
6. IF a `PATCH /api/key-results/:id/toggle-milestone` request dipanggil oleh user dengan `id` berbeda dari `key_results.created_by`, THEN THE KeyResult_Service SHALL menolak dengan HTTP 403, tanpa menulis perubahan ke database.
7. THE KeyResult_Service SHALL mengabaikan perubahan `target_value`, `current_value`, dan `baseline_value` (jika dikirim pada payload PATCH) dalam perhitungan KR_Progress untuk MILESTONE_KR; kolom-kolom tersebut hanya disimpan apa adanya tanpa mempengaruhi KR_Progress.
8. WHEN initiative root di bawah MILESTONE_KR berubah progress dan trigger recalculation existing aktif, THE KeyResult_Service SHALL tidak mengubah `current_value`, `baseline_value`, atau KR_Progress MILESTONE_KR berdasarkan rata-rata initiative; KR_Progress tetap 0 atau 100 sesuai KR_Status.

### Requirement 6: Type Switching Behavior

**User Story:** As a user, I want bisa mengganti `kr_type` dari METRIC ke MILESTONE atau sebaliknya tanpa kehilangan data, so that saya dapat mengoreksi tipe KR yang salah pilih.

#### Acceptance Criteria

1. WHEN a PATCH Key_Result request mengubah `kr_type` dari `METRIC` ke `MILESTONE`, THE KeyResult_Service SHALL mempertahankan nilai existing `target_value`, `current_value`, `baseline_value`, dan `metric_unit` pada record dan men-set KR_Progress sesuai aturan MILESTONE_KR (criterion 5.1) dalam satu transaksi update.
2. WHEN a PATCH Key_Result request mengubah `kr_type` dari `MILESTONE` ke `METRIC`, THE KeyResult_Service SHALL mempertahankan nilai existing `due_date` pada record dan men-set KR_Progress sesuai formula METRIC (Requirement 4) dalam satu transaksi update.
3. IF a PATCH Key_Result request mengubah `kr_type` ke `METRIC` sementara record sebelumnya memiliki `target_value <= 0` (mis. KR awalnya MILESTONE dan tidak punya target valid) dan request tidak menyertakan `target_value` valid `> 0`, THEN THE KeyResult_Service SHALL menolak dengan HTTP 400 dan struktur error `errors.target_value` mengindikasikan target wajib `> 0`, tanpa menulis perubahan ke database.
4. WHEN a PATCH Key_Result mengubah `kr_type` berhasil, THE KeyResult_Service SHALL memanggil ActivityLog_Service untuk mencatat aksi `UPDATE` dengan `entity_type = 'KEY_RESULT'`, `old_value` mencakup `kr_type` lama, dan `new_value` mencakup `kr_type` baru.

### Requirement 7: Activity Logging for New Fields

**User Story:** As a user, I want perubahan `kr_type`, `baseline_value`, `due_date`, dan `notes` tercatat di activity log, so that saya dapat melacak siapa mengubah field penting kapan.

#### Acceptance Criteria

1. WHEN a create Key_Result request berhasil, THE KeyResult_Service SHALL memanggil ActivityLog_Service dengan `action = 'CREATE'`, `entity_type = 'KEY_RESULT'`, `entity_id` = id KR baru, `entity_title` = title KR, dan `new_value` JSON yang mencakup `kr_type`, `target_value`, `current_value`, `baseline_value`, `due_date`, dan `notes`.
2. WHEN a PATCH Key_Result request mengubah salah satu kolom `kr_type`, `baseline_value`, `due_date`, atau `notes` dengan nilai berbeda dari sebelumnya, THE KeyResult_Service SHALL memanggil ActivityLog_Service dengan `action = 'UPDATE'`, `entity_type = 'KEY_RESULT'`, `entity_id` sama dengan id Key_Result yang di-update, `old_value` JSON memuat nilai lama field yang berubah, dan `new_value` JSON memuat nilai baru field yang berubah.
3. WHEN a PATCH Key_Result request tidak mengubah salah satu kolom `kr_type`, `baseline_value`, `due_date`, atau `notes` (nilai tetap sama atau key absent), THE KeyResult_Service SHALL tidak menyertakan field tersebut dalam `old_value` dan `new_value` di activity log.
4. WHEN a PATCH `/api/key-results/:id/toggle-milestone` berhasil, THE KeyResult_Service SHALL memanggil ActivityLog_Service dengan `action = 'STATUS_CHANGE'`, `entity_type = 'KEY_RESULT'`, `entity_id` sama dengan id Key_Result yang ditoggle, `old_value` memuat `status` dan `progress` lama, `new_value` memuat `status` dan `progress` baru.
5. IF panggilan ActivityLog_Service gagal, THEN THE KeyResult_Service SHALL tidak membatalkan transaksi update Key_Result, dan log error pada server log tanpa mengembalikan error ke client (konsisten dengan pola activity log existing).

### Requirement 8: API Response Shape

**User Story:** As a frontend developer, I want response Key_Result API menyertakan field baru, so that frontend dapat menampilkan tipe, baseline, due date, dan notes.

#### Acceptance Criteria

1. WHEN endpoint `GET /api/objectives/:id` atau `GET /api/objectives/:id/key-results` mengembalikan data Key_Result, THE KeyResult_Service SHALL menyertakan field `kr_type` (string), `baseline_value` (number, default 0 jika kolom NULL), `due_date` (string `YYYY-MM-DD` atau null), dan `notes` (string atau null) pada setiap item.
2. WHEN endpoint `POST /api/objectives/:id/key-results` atau `PATCH /api/key-results/:id` berhasil, THE KeyResult_Service SHALL menyertakan field `kr_type`, `baseline_value`, `due_date`, dan `notes` pada response body sesuai criterion 1.
3. WHEN endpoint global search `GET /api/search?q=...` mengembalikan item bertipe Key_Result, THE KeyResult_Service SHALL menyertakan field `kr_type` pada item tersebut.
4. THE KeyResult_Service SHALL mempertahankan field existing `id`, `objective_id`, `title`, `description`, `target_value`, `current_value`, `metric_unit`, `progress`, `confidence_level`, `status`, `created_by`, `created_at`, `updated_at` pada response Key_Result tanpa mengubah nama atau tipe.

### Requirement 9: KeyResult Form Type Toggle

**User Story:** As a user, I want KeyResult_Form menampilkan radio button Type dan toggle field input sesuai tipe, so that saya tidak melihat field yang tidak relevan.

#### Acceptance Criteria

1. THE KeyResult_Form SHALL menampilkan radio button group "Type" pada bagian atas form dengan dua opsi: "Metric" (value `METRIC`) dan "Milestone" (value `MILESTONE`), dengan opsi default `METRIC` saat mode create.
2. WHEN user memilih opsi "Metric" pada radio Type, THE KeyResult_Form SHALL menampilkan field `Baseline Value` (number input, optional, default 0), `Target Value` (number input, required, min 0.01), `Current Value` (number input, optional, default 0, min 0), dan `Metric Unit` (text input, optional, max 50 karakter), serta menyembunyikan field `Due Date` dan checkbox "Selesai".
3. WHEN user memilih opsi "Milestone" pada radio Type, THE KeyResult_Form SHALL menampilkan field `Due Date` (date picker, optional) dan checkbox "Selesai" (bind ke `status = 'DONE'`), serta menyembunyikan field `Baseline Value`, `Target Value`, `Current Value`, dan `Metric Unit`.
4. THE KeyResult_Form SHALL selalu menampilkan field `Title` (text input, required, 1-255 karakter), `Description` (textarea, optional, max 1000 karakter), `Confidence Level` (slider 0-10, default 5), dan `Notes` (textarea, optional, max 5000 karakter dengan character counter `{used}/5000`) terlepas dari nilai radio Type.
5. WHEN user membuka KeyResult_Form pada mode edit untuk Key_Result yang `kr_type = 'METRIC'`, THE KeyResult_Form SHALL men-set radio Type ke "Metric" dan prefill field `Baseline Value`, `Target Value`, `Current Value`, `Metric Unit`, dan `Notes` dengan nilai existing record.
6. WHEN user membuka KeyResult_Form pada mode edit untuk Key_Result yang `kr_type = 'MILESTONE'`, THE KeyResult_Form SHALL men-set radio Type ke "Milestone", prefill field `Due Date` (kosong jika null) dan `Notes`, men-set checkbox "Selesai" ke true jika `status = 'DONE'` dan false untuk status lain.
7. WHEN user mengubah pilihan radio Type pada mode edit dari "Metric" ke "Milestone" atau sebaliknya, THE KeyResult_Form SHALL mempertahankan nilai field yang sebelumnya diisi (tidak menghapus value), tetapi hanya field yang relevan untuk tipe terpilih yang ditampilkan.
8. IF user menekan tombol Simpan saat radio Type = "Metric" dan `Target Value` kosong atau `<= 0`, THEN THE KeyResult_Form SHALL menampilkan inline error pada field `Target Value` dan tidak mengirim request.
9. IF user menekan tombol Simpan saat panjang `Notes` melebihi 5000 karakter, THEN THE KeyResult_Form SHALL menampilkan inline error pada field `Notes` dan men-disable tombol Simpan sampai panjang valid.
10. WHEN user menekan tombol Simpan pada KeyResult_Form, THE KeyResult_Form SHALL mengirim payload yang mencakup `kr_type`, dan untuk tipe `MILESTONE` mengirim `due_date` (null jika kosong), serta `status = 'DONE'` jika checkbox "Selesai" terpilih atau `status = 'PLANNING'` (untuk create) atau status existing (untuk edit) jika tidak terpilih, dan `notes` (null jika kosong setelah trim).

### Requirement 10: KeyResult Card Visualization per Type

**User Story:** As a user, I want KeyResult_Card menampilkan visual berbeda untuk METRIC dan MILESTONE, so that saya dapat membaca konteks KR dengan cepat.

#### Acceptance Criteria

1. WHEN sebuah Key_Result memiliki `kr_type = 'METRIC'`, THE KeyResult_Card SHALL menampilkan progress bar horizontal (height 8px, warna primary) dengan width persentase = KR_Progress, beserta label numerik dengan format `{current_value}/{target_value} {metric_unit}` ketika `metric_unit` non-null, atau format `{current_value}/{target_value}` ketika `metric_unit` null.
2. WHEN sebuah METRIC_KR memiliki `baseline_value > 0`, THE KeyResult_Card SHALL menambahkan label tambahan dengan format `from {baseline_value} → {target_value}, now {current_value}` di bawah progress bar.
3. WHEN sebuah Key_Result memiliki `kr_type = 'MILESTONE'`, THE KeyResult_Card SHALL menampilkan ikon checkbox (filled hijau jika `status = 'DONE'`, outline abu-abu untuk status lain) di kiri title, beserta judul `title` di kanan ikon.
4. WHEN sebuah MILESTONE_KR memiliki `due_date` non-null dan `due_date >= today`, THE KeyResult_Card SHALL menampilkan countdown dalam format `Due in {N} days` (N = jumlah hari kalender ke `due_date`, minimum 0) di bawah title.
5. WHEN sebuah MILESTONE_KR memiliki `due_date` non-null dan `due_date < today` dan `status != 'DONE'`, THE KeyResult_Card SHALL menampilkan label `Overdue {N} days` (N = jumlah hari sejak due_date, minimum 1) dengan warna merah (`#991B1B`) di bawah title.
6. WHEN sebuah MILESTONE_KR memiliki `due_date` null, THE KeyResult_Card SHALL menampilkan label `No due date` dengan warna abu-abu (`#6B7280`) di bawah title.
7. WHEN sebuah MILESTONE_KR memiliki `status = 'DONE'`, THE KeyResult_Card SHALL menampilkan label `Completed` dengan warna hijau (`#065F46`) menggantikan countdown atau overdue label.
8. THE KeyResult_Card SHALL menampilkan Status_Badge dan Confidence_Indicator yang sama untuk kedua tipe KR sesuai aturan styling existing.

### Requirement 11: Quick Toggle Milestone UI

**User Story:** As a user, I want bisa toggle MILESTONE_KR sebagai selesai atau belum langsung dari KeyResult_Card, so that saya tidak perlu membuka form penuh untuk update status milestone.

#### Acceptance Criteria

1. WHEN sebuah Key_Result memiliki `kr_type = 'MILESTONE'`, THE KeyResult_Card SHALL menampilkan ikon checkbox yang clickable (kursor pointer pada hover).
2. WHEN user yang merupakan creator (id sama dengan `created_by`) menekan ikon checkbox pada MILESTONE_KR, THE KeyResult_Card SHALL memanggil endpoint `PATCH /api/key-results/:id/toggle-milestone` dan meng-update tampilan secara optimistic.
3. WHEN response `PATCH /api/key-results/:id/toggle-milestone` mengembalikan HTTP 200, THE KeyResult_Card SHALL meng-invalidate TanStack Query cache untuk objective dan KR list sehingga data ter-refresh.
4. IF response `PATCH /api/key-results/:id/toggle-milestone` mengembalikan HTTP 4xx atau 5xx, THEN THE KeyResult_Card SHALL me-revert tampilan optimistic ke state sebelumnya dan menampilkan toast error dengan pesan dari response.
5. WHEN user yang bukan creator (id berbeda dari `created_by`) menekan ikon checkbox pada MILESTONE_KR, THE KeyResult_Card SHALL tidak memicu API call dan SHALL menampilkan toast error dengan pesan `Anda tidak punya izin untuk mengubah milestone ini`.

### Requirement 12: KR List Filter by kr_type

**User Story:** As a user, I want filter KR list berdasarkan kr_type, so that saya bisa fokus melihat hanya METRIC atau hanya MILESTONE.

#### Acceptance Criteria

1. THE KeyResult_Filter SHALL menampilkan dropdown pada list Key_Result di halaman Objective Detail dengan opsi "All Types" (default), "Metric Only" (value `METRIC`), dan "Milestone Only" (value `MILESTONE`).
2. WHEN user memilih opsi "Metric Only", THE KeyResult_Filter SHALL memfilter list lokal sehingga hanya menampilkan Key_Result dengan `kr_type = 'METRIC'`.
3. WHEN user memilih opsi "Milestone Only", THE KeyResult_Filter SHALL memfilter list lokal sehingga hanya menampilkan Key_Result dengan `kr_type = 'MILESTONE'`.
4. WHEN user memilih opsi "All Types", THE KeyResult_Filter SHALL menampilkan seluruh Key_Result tanpa filter `kr_type`.
5. WHEN list Key_Result yang ditampilkan kosong setelah penerapan filter (termasuk saat opsi "All Types" dipilih dan Objective tidak memiliki Key_Result sama sekali), THE KeyResult_Filter SHALL menampilkan empty state dengan pesan `Tidak ada key result dengan tipe yang dipilih`.

### Requirement 13: Backward Compatibility

**User Story:** As a system maintainer, I want Key_Result lama tetap berfungsi setelah deploy, so that data historis tidak rusak dan UI lama tetap bekerja.

#### Acceptance Criteria

1. WHEN aplikasi membaca Key_Result yang dibuat sebelum migration dengan `kr_type IS NULL` (mis. data lama yang belum ter-backfill), THE KeyResult_Service SHALL memperlakukan record tersebut seolah `kr_type = 'METRIC'` pada perhitungan KR_Progress dan validasi.
2. THE KeyResult_Service SHALL mempertahankan endpoint existing `POST /api/objectives/:id/key-results` dan `PATCH /api/key-results/:id` agar tetap menerima payload tanpa field `kr_type`, `baseline_value`, `due_date`, dan `notes` (treat as METRIC dengan baseline 0).
3. WHEN client lama mengirim payload create Key_Result tanpa field baru (`kr_type`, `baseline_value`, `due_date`, `notes`), THE KeyResult_Service SHALL membuat record dengan `kr_type = 'METRIC'`, `baseline_value = 0`, `due_date = NULL`, `notes = NULL`, dan tidak menolak request.
4. THE KeyResult_Service SHALL mempertahankan business rule existing untuk Key_Result: ownership edit/delete oleh creator, cascade soft-delete saat objective dihapus, dan progress chain auto-update Objective dari rata-rata KR_Progress.
5. WHEN endpoint progress-chain auto-update existing dijalankan untuk METRIC_KR, THE KeyResult_Service SHALL memanggil formula METRIC sesuai Requirement 4; ketika dijalankan untuk MILESTONE_KR, THE KeyResult_Service SHALL tidak mengubah KR_Progress (sesuai Requirement 5.8).
6. THE KeyResult_Service SHALL tidak mengubah skema, perilaku, atau API entity Initiative dan Objective di luar perubahan yang tercantum pada Requirement 4 dan 5 untuk progress chain.
