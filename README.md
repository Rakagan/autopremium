# AutoPremium — Vercel Postgres Setup

## Project structure

```
autopremium/
├── api/
│   ├── auth.js        # POST /api/auth — admin login/logout/check
│   ├── cars.js        # GET/POST/PUT/DELETE /api/cars
│   ├── reviews.js     # GET/POST/PUT/DELETE /api/reviews
│   └── content.js     # GET/PUT /api/content
├── public/
│   └── index.html     # Full frontend SPA
├── schema.sql         # Run once to create tables + seed data
├── vercel.json
└── package.json
```

## Deploy steps

### 1. Push to GitHub
Create a repo and push this folder.

### 2. Create project on Vercel
Import your GitHub repo at vercel.com/new.

### 3. Add Vercel Postgres
In your Vercel project dashboard → **Storage** → **Create Database** → **Postgres**.
Connect it to your project. Vercel automatically injects `POSTGRES_URL` and related
env vars into your serverless functions — `@vercel/postgres` picks them up automatically.

### 4. Run the schema
In the Vercel Postgres dashboard → **Query** tab, paste and run the contents of `schema.sql`.
This creates the tables and seeds the default cars and reviews.

### 5. Set environment variables
In Vercel project **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `AP_PASSWORD_HASH` | SHA-256 hex of your admin password (see below) |
| `AP_SESSION_TOKEN` | A long random secret (run `openssl rand -hex 32`) |

**To generate AP_PASSWORD_HASH for your password:**
Open your browser console and run:
```javascript
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD'));
console.log(Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''));
```
Copy the output as `AP_PASSWORD_HASH`.

### 6. Redeploy
After setting env vars, trigger a redeploy. The site is live.

## How it works

| What | Before (localStorage) | After (Postgres) |
|---|---|---|
| Car inventory | Browser-local | `cars` table in Postgres, shared across all users/devices |
| Reviews | Browser-local | `reviews` table, admin approval flow works globally |
| Page content | Browser-local | `page_content` table |
| Car images | localStorage (base64) | Still base64 inside JSONB — works fine for moderate catalogues. For large scale, migrate to Vercel Blob. |
| Admin auth | sessionStorage flag | httpOnly cookie + server-side `AP_SESSION_TOKEN` check |

## Notes

- Images are stored as base64 inside the Postgres JSONB column. Each image is
  compressed to 900×900 JPEG (~50-150KB). This is fine for up to ~50 cars. For
  larger catalogues consider migrating images to Vercel Blob and storing URLs instead.
- The admin password is verified server-side by comparing SHA-256 hashes. The actual
  password never touches the server — only its hash.
- Session cookies are `HttpOnly` and `SameSite=Strict`, so they can't be read by JS.
