# SmartCampus ICT Learning Platform

Web semester project — React frontend, Express API, MySQL database.

## Local development

Install the dependencies once from the `backend` and `frontend` folders, then
run `npm run dev` from the repository root to start both servers together.
Use `Ctrl+C` to stop them.

### Backend

```bash
cd backend
cp .env.example .env   # edit with your MySQL credentials
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (API runs on http://localhost:5000).

Optional seed data:

```bash
cd backend
npm run seed
```

---

## Deploy (free tier)

| Part | Service |
|------|---------|
| MySQL | [Railway](https://railway.app) |
| Backend | [Render](https://render.com) |
| Frontend | [Netlify](https://netlify.com) |

**Full step-by-step guide:** see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Quick overview:

1. **Railway** — create a MySQL database and copy `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
2. **Render** — deploy `backend` using `render.yaml`; set `DB_*`, `JWT_SECRET`, `LECTURER_CODE`, `ANTHROPIC_API_KEY`.
3. **Netlify** — deploy `frontend` (uses `frontend/netlify.toml`); set `VITE_API_URL` to your Render URL.
4. **Render** — set `CLIENT_URL` to your Netlify URL and redeploy for CORS.

> Render free tier has no persistent disk — uploaded files may be lost on restart. Fine for demos.

Frontend can be deployed with the Netlify CLI (no Git required). See DEPLOYMENT.md for details.

---

## Environment variables

### Backend (`backend/.env`)

See `backend/.env.example`.

### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (no `/api` suffix) |

Local dev uses `frontend/.env.development` (`http://localhost:5000`). Production value is set in the Netlify dashboard or when building locally for CLI deploy.
