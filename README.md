# AI 301 Questions

Simple question-submission app for the **AI 301: From Tools to Transformation** panel with Ryan².

- `/` — mobile-first submission form (anyone)
- `/presenter/ai301-a7c9k2m` — presenter view with live count + questions (obscure URL)

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000 to submit, http://localhost:3000/presenter/ai301-a7c9k2m for the stage view.

## Deploy to DigitalOcean App Platform

1. Push this repo to GitHub.
2. In DO, **Create App → GitHub** → select this repo / `main` branch.
3. DO auto-detects Node. Settings:
   - Build command: `npm ci && npm run build`
   - Run command: `npm start`
   - HTTP port: `8080`
4. Env vars:
   - `PORT=8080`
   - `DB_DIR=/tmp`
   - `ADMIN_KEY=<something-only-you-know>` (used for "Clear all" on the presenter page)
5. Basic-xxs instance is plenty.

**Important:** DO App Platform containers have ephemeral filesystems. SQLite data persists while the container is running, but **restarts and redeploys wipe all questions**. This is fine for a single event. Don't redeploy during the panel.

## Change the presenter URL

Rename the folder `app/presenter/ai301-a7c9k2m/` to whatever obscure path you want, then commit. The presenter URL becomes `/presenter/<that-folder>`.

## Clear questions

On the presenter page, click **Clear all** (bottom-right of the status bar) and enter the `ADMIN_KEY` you set in DO. Useful for wiping test traffic before the real session.
