# eazy OKR - Antares Eazy

Sistem manajemen OKR internal untuk tim Antares Eazy.

## Tech Stack

- **Backend**: Go (Gin, GORM, MySQL, JWT, WebSocket)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
- **Database**: MySQL 8.0
- **Deployment**: Docker + Caddy for Reverse Proxy

## Quick Start (Development)

### Prerequisites

- Go 1.23+
- Node.js 22+
- MySQL 8.0

### 1. Clone & Setup

```bash
git clone <repo-url>
cd <project>
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env sesuai konfigurasi MySQL lokal
```

`.env`:
```
APP_PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=okr_antares_eazy
JWT_SECRET=your-secret-key
```

```bash
go mod download
go run cmd/api/main.go
```

Backend jalan di `http://localhost:8080`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
```

`.env`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

```bash
npm install
npm run dev
```

Frontend jalan di `http://localhost:5173`

### 4. Buat Database

Buat database MySQL:
```sql
CREATE DATABASE okr_antares_eazy;
```

Backend akan auto-migrate semua tabel dan generate Q1-Q4 tahun ini saat pertama kali jalan.

### 5. Mulai Pakai

Buka `http://localhost:5173`, register akun baru, dan mulai buat objective.

## Deploy ke VPS (Docker)

### Prerequisites di VPS

- Docker & Docker Compose
- Caddy (untuk reverse proxy + auto HTTPS)

### 1. Upload project ke VPS

```bash
scp -r . user@vps:/opt/okr-app
# atau git clone
```

### 2. Setup environment

```bash
cd /opt/okr-app
cp .env.example .env
nano .env
```

Isi `.env`:
```
DB_PASSWORD=strong-password-here
DB_NAME=okr_antares_eazy
JWT_SECRET=random-secret-min-32-chars
VITE_API_BASE_URL=/api
```

### 3. Build & Run

```bash
docker compose up -d --build
```

Services yang jalan:
| Service | Port (host) | Port (container) |
|---------|-------------|------------------|
| MySQL | 3307 | 3306 |
| Backend | 8181 | 8080 |
| Frontend | 8182 | 80 |

### 4. Setup Caddy

Tambahkan di Caddyfile VPS (`/etc/caddy/Caddyfile`):

```
okr.yourdomain.com {
    handle /api/* {
        reverse_proxy localhost:8181
    }

    handle {
        reverse_proxy localhost:8182
    }
}
```

```bash
sudo systemctl reload caddy
```

Akses di: `https://okr.yourdomain.com`

## Useful Commands

```bash
# Lihat logs
docker compose logs -f

# Restart semua
docker compose restart

# Rebuild setelah update code
docker compose up -d --build

# Masuk ke container
docker compose exec backend sh
docker compose exec db mysql -u root -p

# Stop semua
docker compose down

# Stop + hapus data (reset DB)
docker compose down -v
```

## Project Structure

```
/
├── backend/              Go API server
│   ├── cmd/api/          Entry point
│   ├── internal/         Business logic
│   │   ├── config/       Env loading
│   │   ├── database/     DB connection + migration
│   │   ├── middleware/   JWT auth, CORS
│   │   ├── routes/       Route registration
│   │   ├── ws/           WebSocket hub
│   │   ├── modules/      Feature modules
│   │   └── shared/       Response helpers
│   └── Dockerfile
├── frontend/             React SPA
│   ├── src/
│   │   ├── app/          Router, query client
│   │   ├── pages/        Page components
│   │   ├── components/   Atomic Design (atomics/organisms/templates)
│   │   ├── guards/       Route protection
│   │   ├── services/     API calls
│   │   ├── hooks/        WebSocket hook
│   │   ├── stores/       Zustand state
│   │   └── types/        TypeScript interfaces
│   ├── nginx.conf        SPA routing
│   └── Dockerfile
├── docker-compose.yml    Orchestration
├── Caddyfile.example     Reverse proxy config
└── README.md
```
