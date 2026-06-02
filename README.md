# eazy OKR - Antares Eazy

Sistem manajemen OKR internal untuk tim Antares Eazy yang digunakan untuk mengelola Objective, Key Result, Initiative, Sprint, dan Quarterly Planning secara realtime.

## Tech Stack

* **Backend**: Go (Gin, GORM, MySQL, JWT, WebSocket)
* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
* **Database**: MySQL 8.0
* **Realtime**: WebSocket
* **Deployment**: Docker + Caddy Reverse Proxy

---

# Quick Start (Development)

## Prerequisites

Pastikan software berikut sudah terinstall:

* Go 1.23+
* Node.js 22+
* MySQL 8.0+

---

## 1. Clone Repository

```bash
git clone <repo-url>
cd <project>
```

---

## 2. Buat Database

Pastikan MySQL sudah berjalan.

Buat database baru:

```sql
CREATE DATABASE okr_antares_eazy;
```

---

## 3. Setup Backend

Masuk ke folder backend:

```bash
cd backend
```

Copy file environment:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
APP_PORT=8080

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=okr_antares_eazy
JWT_SECRET=your-secret-key
```

Install dependency:

```bash
go mod download
```

Jalankan backend:

```bash
go run cmd/api/main.go
```

Backend berjalan pada:

```text
http://localhost:8080
```

Saat startup pertama kali backend akan:

* Membuat seluruh tabel secara otomatis (Auto Migration)
* Membuat data Quarter (Q1-Q4) tahun berjalan
* Menyiapkan data master yang dibutuhkan sistem

---

## 4. Setup Frontend

Buka terminal baru:

```bash
cd frontend
```

Copy file environment:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Install dependency:

```bash
npm install
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan pada:

```text
http://localhost:5173
```

---

## 5. Initial Data Setup (Opsional)

Data awal dapat dibuat melalui API menggunakan:

* LiteClient
* Postman
* Insomnia
dll

### Register User

```http
POST http://localhost:8080/api/auth/register
```

Body:

```json
{
  "name": "Administrator",
  "email": "admin@antares.id",
  "password": "password123"
}
```

### Login

```http
POST http://localhost:8080/api/auth/login
```

Body:

```json
{
  "email": "admin@antares.id",
  "password": "password123"
}
```

Response:

```json
{
  "token": "jwt-token"
}
```

Gunakan JWT Token tersebut untuk mengakses endpoint yang membutuhkan autentikasi.

---

## 6. Mulai Menggunakan Aplikasi

Buka:

```text
http://localhost:5173
```

Kemudian:

1. Register akun
2. Login
3. Buat Objective
4. Buat Key Result
5. Buat Initiative
6. Buat Sprint
7. Update Progress
8. Pantau Dashboard secara realtime

---

# API Collection

Collection API tersedia pada folder:

```text
docs/api_collection/
```

Base URL Development:

```text
http://localhost:8080/api
```

---

# Deploy ke VPS (Docker)

## Prerequisites

Pastikan VPS sudah memiliki:

* Docker
* Docker Compose
* Caddy

---

## 1. Upload Project

```bash
scp -r . user@vps:/opt/okr-app
```

atau

```bash
git clone <repo-url> /opt/okr-app
```

---

## 2. Setup Environment

```bash
cd /opt/okr-app
cp .env.example .env
nano .env
```

Isi:

```env
DB_PASSWORD=strong-password-here
DB_NAME=okr_antares_eazy
JWT_SECRET=random-secret-minimum-32-characters
VITE_API_BASE_URL=/api
```

---

## 3. Build dan Jalankan Container

```bash
docker compose up -d --build
```

Services yang berjalan:

| Service  | Host Port | Container Port |
| -------- | --------- | -------------- |
| MySQL    | 3307      | 3306           |
| Backend  | 8181      | 8080           |
| Frontend | 8182      | 80             |

---

## 4. Setup Caddy

Edit:

```bash
sudo nano /etc/caddy/Caddyfile
```

Tambahkan:

```caddy
okr.yourdomain.com {

    handle /api/* {
        reverse_proxy localhost:8181
    }

    handle {
        reverse_proxy localhost:8182
    }

}
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

Aplikasi dapat diakses melalui:

```text
https://okr.yourdomain.com
```

---

# Useful Commands

```bash
# Melihat logs
docker compose logs -f

# Restart service
docker compose restart

# Rebuild setelah update code
docker compose up -d --build

# Masuk container backend
docker compose exec backend sh

# Masuk MySQL
docker compose exec db mysql -u root -p

# Stop seluruh service
docker compose down

# Stop + hapus seluruh volume database
docker compose down -v
```

---

# Project Structure

```text
/
├── backend/                        # Go REST API
│   ├── cmd/api/
│   │   └── main.go                 # Entry point: inisialisasi server, DB, routes
│   │
│   ├── internal/
│   │   ├── config/                 # Load environment variables (.env)
│   │   ├── database/               # Koneksi MySQL + Auto Migration tabel
│   │   ├── middleware/             # JWT auth middleware, CORS
│   │   ├── routes/                 # Registrasi semua endpoint API
│   │   ├── ws/                     # WebSocket hub, client, broadcast handler
│   │   │
│   │   ├── modules/                # Business logic per domain
│   │   │   ├── auth/               # Register, login, JWT, get users
│   │   │   ├── period/             # Quarter management (Q1-Q4, auto-generate)
│   │   │   ├── sprint/             # Sprint CRUD, activate, complete, board, backlog
│   │   │   ├── objective/          # Objective CRUD, reorder, context fields
│   │   │   ├── keyresult/          # Key Result CRUD, METRIC/MILESTONE type
│   │   │   ├── initiative/         # Initiative nested CRUD, progress update
│   │   │   ├── activitylog/        # Log semua aktivitas CRUD ke tabel activity_logs
│   │   │   ├── notification/       # Due date notifications, mark read
│   │   │   ├── dashboard/          # Summary stats quarter & annual, context health
│   │   │   ├── strategy/           # Master data Strategy (konteks OKR)
│   │   │   ├── segment/            # Master data Segment (pasar/customer)
│   │   │   └── division/           # Master data Divisi organisasi
│   │   │
│   │   └── shared/
│   │       ├── response/           # Helper standar response JSON API
│   │       ├── utils/              # Fungsi helper umum
│   │       └── validation/         # Validasi input (hex color, dll)
│   │
│   ├── .env                        # Environment variables (tidak di-commit)
│   ├── .env.example                # Template environment variables
│   ├── go.mod / go.sum             # Go module dependencies
│   └── Dockerfile                  # Multi-stage build Go binary
│
├── frontend/                       # React + Vite + TypeScript
│   ├── public/
│   │   └── EazyOKR.png             # Logo aplikasi
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── router.tsx          # React Router v6: semua route + guards
│   │   │   └── queryClient.ts      # TanStack Query client config
│   │   │
│   │   ├── pages/                  # Halaman utama aplikasi
│   │   │   ├── LoginPage.tsx       # Halaman login
│   │   │   ├── RegisterPage.tsx    # Halaman register
│   │   │   ├── DashboardPage.tsx   # Dashboard quarter & annual view
│   │   │   ├── ObjectivesPage.tsx  # List objective + KR + initiative tree
│   │   │   ├── SprintsPage.tsx     # List sprint per quarter
│   │   │   ├── SprintDetailPage.tsx# Sprint board, backlog, summary
│   │   │   ├── LogsPage.tsx        # Activity log terpaginasi
│   │   │   ├── NotificationsPage.tsx# In-app notifications
│   │   │   └── MasterAdminPage.tsx # Admin: kelola Strategy, Segment, Divisi
│   │   │
│   │   ├── components/
│   │   │   ├── atomics/            # Komponen UI terkecil, tidak ada business logic
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Dropdown.tsx  
│   │   │   │   ├── ConfirmDialog.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── organisms/          # Komponen kompleks dengan state & API calls
│   │   │   │   ├── Sidebar.tsx     # Navigasi utama
│   │   │   │   ├── TopBar.tsx      # Header: title, search global, notifikasi
│   │   │   │   ├── ObjectivePanel.tsx  # Form create/edit objective (drawer)
│   │   │   │   ├── KeyResultPanel.tsx  # Form create/edit key result (drawer)
│   │   │   │   ├── InitiativePanel.tsx # Form create/edit initiative (drawer)
│   │   │   │   ├── SprintPanel.tsx     # Form create/edit sprint (drawer)
│   │   │   │   ├── SprintBoard.tsx     # Kanban board sprint + drag-drop
│   │   │   │   ├── SprintSummary.tsx   # Progress summary sprint
│   │   │   │   ├── BacklogPanel.tsx    # Backlog initiative belum di-assign sprint
│   │   │   │   ├── FilterChips.tsx     # Filter strategy/segment/divisi
│   │   │   │   ├── ContextBadges.tsx   # Badge konteks OKR di objective card
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── templates/
│   │   │       ├── AppLayout.tsx   # Layout utama: sidebar + topbar + content
│   │   │       └── AuthLayout.tsx  # Layout login/register (tanpa sidebar)
│   │   │
│   │   ├── guards/
│   │   │   └── ProtectedRoute.tsx  # Redirect ke /login jika belum autentikasi
│   │   │
│   │   ├── services/               # Fungsi API call via axios
│   │   │   ├── api.ts              # Axios instance + auth header + 401 handler
│   │   │   ├── auth.service.ts
│   │   │   ├── sprint.service.ts
│   │   │   ├── objective.service.ts
│   │   │   ├── keyResult.service.ts
│   │   │   ├── initiative.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── dashboard.service.ts
│   │   │   └── master.service.ts   # Strategy, Segment, Division API
│   │   │
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts     # Hook WebSocket: auto-reconnect, invalidate cache
│   │   │
│   │   ├── stores/
│   │   │   └── useAuthStore.ts     # Zustand: user, token, login, logout
│   │   │
│   │   └── types/
│   │       ├── index.ts            # Interface utama: Objective, KR, Initiative, dll
│   │       └── master.ts           # Interface Strategy, Segment, Division
│   │
│   ├── .env                        # VITE_API_BASE_URL (tidak di-commit)
│   ├── .env.example                # Template environment frontend
│   ├── nginx.conf                  # Nginx config untuk serve SPA di Docker
│   ├── tailwind.config.js          # Konfigurasi Tailwind + warna primary
│   ├── vite.config.ts              # Vite build config
│   └── Dockerfile                  # Multi-stage: build Vite → serve via nginx
│
├── .env.example                    # Template env root (untuk docker-compose)
├── docker-compose.yml              # Orkestrasi: MySQL + Backend + Frontend
├── Caddyfile.example               # Contoh config reverse proxy Caddy
└── README.md                       # Dokumentasi ini
```

## Arsitektur Backend

Setiap modul mengikuti pola **Handler → Service → Repository**:

| Layer | Tanggung Jawab |
|---|---|
| `handler.go` | Parse request, validasi input, panggil service, return response, log aktivitas |
| `service.go` | Business logic, kalkulasi progress, trigger notification |
| `repository.go` | Query database via GORM |
| `model.go` | Definisi struct GORM (mapping ke tabel) |
| `dto.go` | Request/response DTO, transformasi data |

## Arsitektur Frontend

Komponen mengikuti **Atomic Design**:

| Layer | Isi | Contoh |
|---|---|---|
| `atomics/` | Komponen UI terkecil, pure UI | Button, Input, Modal, Dropdown |
| `organisms/` | Komponen dengan state & API | Sidebar, ObjectivePanel, SprintBoard |
| `templates/` | Shell layout (slot konten) | AppLayout, AuthLayout |
| `pages/` | Halaman penuh, compose organisms | DashboardPage, ObjectivesPage |
