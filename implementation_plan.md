# Turnkey New-PC Reproducibility & Skip Biometric Verification

This implementation plan covers two deliverables:
1. **100% Turnkey Reproducibility on a New PC**: Guaranteeing that copying this entire folder to any new PC and launching it will start the website, local database, and all services without manual configuration, missing SQLite crashes, or missing dependency failures.
2. **Skip Biometric Verification (Testing & Quick Entry)**: Adding an instant skip button and bypass toggle for rapid testing and immediate vault entry without requiring webcam hardware, face alignment, or liveness gestures.

---

## User Review Required

> [!IMPORTANT]
> - **1-Click Launching (`start.bat` & `npm start`)**: On a new PC, double-clicking `start.bat` or typing `npm start` will:
>   1. Verify Node.js is present.
>   2. Automatically run `npm install` if `node_modules` is absent.
>   3. Automatically initialize the local D1 SQLite database from `functions/schema.sql` if no database exists.
>   4. Start both the 3D site server (`http://localhost:8788`) and the private local DB app (`http://127.0.0.1:8790`).
>   5. Automatically launch `http://localhost:8788` in your default browser.
> - **Resilient SQLite Path Discovery**: [vault-manager-app.cjs](file:///G:/Programming/Cave/vault-manager-app.cjs) currently has a hardcoded database hash path (`.wrangler/.../af125035...sqlite`) which would crash with `[FATAL]` on a new machine. We will update it to dynamically find any `.sqlite` in the Wrangler state directory or auto-create one from `schema.sql`.
> - **Biometric Bypass Features**:
>   - A quick HUD button: `⚡ SKIP BIOMETRICS (QUICK ENTRY)` in the top-right toolbar.
>   - A modal HUD button: `⚡ BYPASS & GRANT` inside the optical camera reticle view.
>   - A toggle: `🔓 BYPASS: ON / OFF` so clicking the 3D terminal directly opens the vault without asking for camera permissions.

---

## Proposed Changes

### 1. New PC Turnkey Reproducibility & Launcher

#### [NEW] [launch.cjs](file:///G:/Programming/Cave/launch.cjs)
- Orchestrates clean startup of all services:
  1. Checks if `node_modules` exists; if missing, runs `npm install`.
  2. Ensures `.dev.vars` exists with fallback local development secrets (`DEVICE_BINDING_SECRET`, `BIOMETRIC_KEK_V1`, `VAULT_ORIGIN`).
  3. Checks if the local D1 database is initialized; if not, automatically invokes `wrangler d1 execute WORKSHOP_DB --local --file=./functions/schema.sql`.
  4. Synchronizes any changes between root and `./dist`.
  5. Spawns `vault-manager-app.cjs` on `127.0.0.1:8790`.
  6. Spawns `wrangler pages dev ./dist --d1=WORKSHOP_DB --kv=WORKSHOP_CACHE --local --port 8788`.
  7. Opens `http://localhost:8788` in the default system browser after servers bind.
  8. Handles `SIGINT` (Ctrl+C) to terminate both child processes cleanly.

#### [NEW] [start.bat](file:///G:/Programming/Cave/start.bat)
- Standard Windows double-clickable batch launcher:
  - Verifies Node.js is installed.
  - Launches `node launch.cjs`.

#### [MODIFY] [package.json](file:///G:/Programming/Cave/package.json)
- Add `"start": "node launch.cjs"` so running `npm start` works out of the box on any platform (Windows, macOS, Linux).

#### [MODIFY] [vault-manager-app.cjs](file:///G:/Programming/Cave/vault-manager-app.cjs)
- Replace hardcoded SQLite hash path with dynamic discovery:
  - Scans `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` for `*.sqlite`.
  - If missing or empty, automatically creates and bootstraps a local SQLite database using `functions/schema.sql` via `DatabaseSync`.
  - Prevents fatal crashes on fresh installations.

---

### 2. Skip Biometric Verification for Testing & Quick Entry

#### [MODIFY] [index.html](file:///G:/Programming/Cave/index.html) & [dist/index.html](file:///G:/Programming/Cave/dist/index.html)
- **Top-Right Quick HUD Toolbar**:
  - Add `⚡ SKIP BIOMETRICS (QUICK ENTRY)` button:
    - Immediately grants authorization (`mode = 'granted'`).
    - Plays granted chime (`beep(1320, .12); setTimeout(() => beep(1760, .18), 140);`).
    - Dispatches `vault:granted` event with `{ id: 'usr_dev_bypass', displayName: 'DEV OPERATIVE', accessLevel: 'ADMIN' }`.
    - Triggers door release and room traversal.
  - Add `🔓 BYPASS: OFF` toggle button:
    - When clicked, toggles `window.VAULT.bypassBiometrics = true/false` and updates label to `🔓 BYPASS: ON` (highlighted amber).
    - When active, clicking the terminal in 3D directly unlocks the vault without asking for camera permissions or liveness scan.
- **Camera Viewport HUD**:
  - Add `⚡ BYPASS & GRANT` button next to `✕ CANCEL`.
  - Allows immediate bypass even if the camera HUD was already triggered.
- **Memory Safety**:
  - When bypassing, calls `FaceEngine.unload()` to ensure neural models and camera streams are released.

---

## Verification Plan

### Automated Verification
1. **New PC Clean Boot Simulation**:
   - Run `node launch.cjs --dry-run` or verify that database discovery, dependency check, and process orchestration execute without error.
   - Verify `vault-manager-app.cjs` starts successfully with dynamic SQLite path resolution.
2. **Biometric Skip & Quick Entry Verification** (Playwright test):
   - Click `#btn-skip-biometrics` and verify:
     - HUD mode switches to `granted`.
     - `vault:granted` event fires.
     - Door animation begins without opening webcam or showing camera prompts.
   - Toggle `#btn-toggle-bypass` to `ON`, click terminal, and verify immediate access grant.
3. **Project Rules 4, 7 & 8**:
   - Run `node scripts/rule4-verify.cjs` (confirm 60 FPS, 0 raster images, 0 WebGL warnings).
   - Run `node scripts/rule8-verify.cjs` (confirm cinematic door sequence and 0 warnings).
