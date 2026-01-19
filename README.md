# CoupleCanvas Backend (Express)

Minimal Express backend scaffold for CoupleCanvas.

Quick start

Install deps:

```bash
cd backend
npm install
```

Run in development:

```bash
npm run dev
```

If you want MongoDB support, set `MONGODB_URI` in `.env` (example in `.env.example`) and install the driver:

```bash
npm install mongodb
```

Endpoints

- `GET /api/` - health
- `POST /api/auth/login` - sample auth
- `GET /api/products` - sample products
