# Deployment Guide — Railway + Render + Netlify (Free Tier)

Deploy **MySQL** on Railway, the **API** on Render, and the **React frontend** on Netlify.

> **Important:** Render’s free tier has no persistent disk. Uploaded lesson/assignment files are stored on the server filesystem and **may be lost** when the service restarts or redeploys. Fine for demos and grading.

---

## What you need before starting

| Item | Example |
|------|---------|
| Railway account | [railway.app](https://railway.app) |
| Render account | [render.com](https://render.com) |
| Netlify account | [netlify.com](https://netlify.com) |
| Anthropic API key | For the AI assistant (optional but recommended) |
| A long random string | For `JWT_SECRET` (e.g. 32+ random characters) |

Keep a text file handy to copy URLs and credentials as you go.

---

## Step 1 — MySQL on Railway

1. Log in to [Railway](https://railway.app) and create a **New Project**.
2. Click **+ New** → **Database** → **MySQL**.
3. Wait until the database is running, then open the MySQL service.
4. Go to the **Connect** or **Variables** tab and note these values:

| Railway variable | Maps to backend `DB_*` |
|------------------|------------------------|
| `MYSQLHOST` | `DB_HOST` |
| `MYSQLPORT` | `DB_PORT` |
| `MYSQLUSER` | `DB_USER` |
| `MYSQLPASSWORD` | `DB_PASSWORD` |
| `MYSQLDATABASE` | `DB_NAME` |

5. Leave Railway open — you will paste these into Render in Step 2.

**Railway billing note:** New accounts usually get trial credits. MySQL uses credits over time, so avoid leaving unused databases running after your demo.

---

## Step 2 — Backend on Render

Render needs your code from a Git repository. **You control when and what you push** — this guide does not require pushing from an AI tool.

### Option A — Connect your existing GitHub repo (recommended)

1. Make sure your project is on GitHub under **your** account (push commits yourself with your own messages).
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect GitHub and select your repository.
4. Render reads `render.yaml` at the repo root and creates the `smartcampus-api` web service.
5. In the service **Environment** tab, set these variables:

| Variable | Value |
|----------|-------|
| `DB_HOST` | Railway `MYSQLHOST` |
| `DB_PORT` | Railway `MYSQLPORT` |
| `DB_USER` | Railway `MYSQLUSER` |
| `DB_PASSWORD` | Railway `MYSQLPASSWORD` |
| `DB_NAME` | Railway `MYSQLDATABASE` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | Your long random secret |
| `LECTURER_CODE` | Code students need to register as lecturer (e.g. `LECT2024`) |
| `CLIENT_URL` | Leave blank for now — set after Step 3 |
| `ANTHROPIC_API_KEY` | Your Anthropic key |

`NODE_ENV=production` and `DB_SSL=true` are already set in `render.yaml`.

6. Click **Manual Deploy** → **Deploy latest commit** (or wait for auto-deploy).
7. When deploy finishes, open the service URL (e.g. `https://smartcampus-api.onrender.com`).
8. Test: visit `https://YOUR-RENDER-URL/health` — you should see `{"status":"ok"}`.

### Option B — New Web Service (without Blueprint)

1. **New** → **Web Service** → connect repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Plan:** Free
3. Add the same environment variables as in the table above.

### Seed the database (optional demo accounts)

From your PC, temporarily point `backend/.env` at Railway MySQL, then run:

```powershell
cd backend
npm install
npm run seed
```

This creates:

| Role | Email | Password |
|------|-------|----------|
| Lecturer | lecturer@smartcampus.com | lecturer123 |
| Student | student@smartcampus.com | student123 |

Remove or change these passwords before a real production launch.

---

## Step 3 — Frontend on Netlify

The frontend lives in the `frontend` folder. `netlify.toml` is already configured for a Vite/React SPA.

### Option A — Deploy without Git (Netlify CLI)

Good if you do not want to connect GitHub to Netlify.

1. Install the CLI once:

```powershell
npm install -g netlify-cli
netlify login
```

2. Build with your Render API URL (replace the URL):

```powershell
cd frontend
npm install
$env:VITE_API_URL="https://YOUR-RENDER-URL.onrender.com"
npm run build
```

3. Deploy:

```powershell
netlify deploy --prod --dir=dist
```

Follow the prompts to create a new site. Netlify prints your live URL (e.g. `https://smartcampus-demo.netlify.app`).

### Option B — Netlify dashboard + Git

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Connect GitHub and pick your repo.
3. Build settings (Netlify reads `frontend/netlify.toml` if **Base directory** is `frontend`):

| Setting | Value |
|---------|-------|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` |

4. **Site settings** → **Environment variables** → add:

```
VITE_API_URL = https://YOUR-RENDER-URL.onrender.com
```

(No trailing slash.)

5. **Deploy site**. Copy the Netlify URL.

### Option C — Manual drag-and-drop

1. Build locally with `VITE_API_URL` set (see Option A, step 2).
2. Go to [Netlify Drop](https://app.netlify.com/drop) and drag the `frontend/dist` folder onto the page.

---

## Step 4 — Connect frontend and backend (CORS)

1. In **Render** → your API service → **Environment**, set:

```
CLIENT_URL=https://smartcampus-utg-gambia.netlify.app
```

For multiple URLs (e.g. preview + production), use commas:

```
https://smartcampus-utg-gambia.netlify.app,https://deploy-preview-123--smartcampus.netlify.app
```

2. **Save** and **Manual Deploy** the backend so CORS picks up the new origin.
3. Open your Netlify site, register or log in, and test courses, uploads, and the AI assistant.

---

## Step 5 — Final checks

| Check | How |
|-------|-----|
| API health | `https://YOUR-RENDER-URL/health` → `{"status":"ok"}` |
| API root | `https://YOUR-RENDER-URL/` → welcome JSON |
| Frontend loads | Netlify URL opens login page |
| Login works | Use seed accounts or register |
| CORS | Browser console has no blocked requests to Render |
| Cold start | Render free tier sleeps after ~15 min idle; first request may take 30–60 seconds |

---

## Environment variables reference

### Backend (Render)

See `backend/.env.example`. Production values go in the Render dashboard, not in committed files.

### Frontend (Netlify)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Render API base URL, no trailing slash, no `/api` suffix |

Vite bakes this in at **build time**. After changing it on Netlify, trigger a **new deploy**.

---

## Troubleshooting

### Database connection failed on Render

- Confirm all five `DB_*` values match Railway exactly.
- Set `DB_SSL=true` for Railway MySQL.
- In Railway, ensure the MySQL service is running.

### CORS / “Network Error” in the browser

- First open `https://YOUR-RENDER-URL/health`. The SmartCampus Node API must return `{"status":"ok"}`. If it returns a 404, a different server response, or a `uvicorn` server header, the URL is not serving this project's backend. In Render, deploy this repository's root `render.yaml` Blueprint, or create a Node Web Service with root directory `backend`, build command `npm install`, and start command `npm start`.
- `CLIENT_URL` on Render should exactly match your Netlify URL (including `https://`, no trailing slash). The current production Netlify URL is allowed by default; set this variable for additional URLs or previews.
- Redeploy the backend after changing `CLIENT_URL`.
- If the correct backend is deployed at a different URL, update Netlify's `VITE_API_URL` to that API origin and redeploy the frontend.

### Frontend still calls localhost

- `VITE_API_URL` should be the Render API origin (`https://smartcampus-api.onrender.com`), with no trailing slash or `/api` suffix. It defaults to that production origin if unset. Set the variable and redeploy after changing it.

### 404 on page refresh (e.g. `/dashboard`)

- `frontend/netlify.toml` includes SPA redirects. Ensure Netlify base directory is `frontend`.

### Uploads disappear

- Expected on Render free tier. Files are not stored permanently.

### Render service won’t start

- Check **Logs** in the Render dashboard.
- Verify `npm start` runs `node src/server.js` and the service listens on `PORT` (already handled in code).

---

## Local `.env` files (do not commit)

```powershell
# backend/.env — local dev or temporary Railway access for seeding
copy backend\.env.example backend\.env

# frontend/.env.development — defaults to http://localhost:5000
```

`.env` files are in `.gitignore`. Never commit secrets.

---

## Deployment order summary

```
1. Railway  → create MySQL, copy credentials
2. Render   → deploy backend with DB_* env vars
3. Netlify  → deploy frontend with VITE_API_URL
4. Render   → set CLIENT_URL to Netlify URL, redeploy
5. Test     → login, courses, API health
```
