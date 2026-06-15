# Every Man a Warrior — Warrior Band

Small-group companion app for the *Every Man a Warrior* men's discipleship
program. One shared wall for the whole band: chat, weekly check-ins, prayer
requests, scripture memory, and God moments.

## How it's built

- **`index.html`** — the entire front-end (React + Babel, no build step). Its
  `window.storage` client talks to the serverless backend below.
- **`netlify/functions/storage.mjs`** — the storage backend. Implements
  `get / set / list / delete` with a `shared` flag, backed by **Netlify Blobs**.
  `shared: true` = one wall the whole group reads/writes; `shared: false` =
  private to a single browser.
- **`netlify.toml` / `package.json`** — Netlify config + the one dependency
  (`@netlify/blobs`).

The shared wall lives in `warrior:band:v1` in the `warrior-shared` blob store.

> `warrior-band.jsx` is the original single-file React component (the source of
> truth for the UI). `index.html` is the deployable build generated from it,
> with the in-memory preview shim swapped for the real backend.

## Auto-deploy (set up once, then every push deploys itself)

1. Push this repo to GitHub (done — branch `claude/focused-goodall-61ltph`).
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick this
   repo. (This OAuth connect is the one manual step — it lets Netlify pull from
   GitHub.)
3. Build settings — Netlify reads `netlify.toml`, so just confirm:
   - **Build command:** *(none)*
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
4. Deploy. From then on, **every push to the connected branch auto-builds and
   redeploys** — no drag-and-drop, no CLI.

Netlify Blobs needs no setup — it's provisioned automatically for the site.

## Verify after deploy

1. Open the site → **Leader** tab → PIN `7777` → **Test connection**.
   - **Green** = shared storage round-trips correctly.
   - **Red** = it names the exact failing stage (write / read / verify).
2. Two-device test: post a check-in on device A, refresh device B — it should
   appear within a few seconds (the app polls every 8s).

## Notes

- Leader PIN is `7777` (in `index.html` / `warrior-band.jsx` as `ADMIN_PIN`).
- A failed save now shows a red "That didn't save" toast and logs to the
  console, so silent failures are visible.
