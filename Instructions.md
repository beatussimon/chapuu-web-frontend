# Chapuu Core Mandates & AI Agent Skill

This document defines the foundational architecture, safety protocols, and coding standards for the Chapuu project. All AI agents **MUST** internalize these mandates before modifying any files.

---

## 0. Monorepo Structure (Turbo)
The frontend is organized as a monorepo using **TurboRepo**:
- `apps/web`: The core React 19 + Vite 7 web application.
- `apps/mobile`: Expo-based React Native WebView wrapper ("Pasifiq Store").
- `packages/shared`: Shared logic, types, and constants.

## 1. System Integrity & Data Safety (CRITICAL)
- **BUILD VERIFICATION**: You **MUST** test the build in both the web app (`apps/web`) and mobile app (`apps/mobile`) before marking any task as done. Use `npm run build` in the monorepo root to verify all workspaces.
- **ZERO DATA WIPING**: Never execute `flush`, `reset_db`, or `rm -rf` on the database or media volumes. Protect `db.sqlite3` and production PostgreSQL at all costs.
- **NO DESTRUCTIVE SEEDING**: Never write or run database seeding, cleanup, or initialization commands/scripts that execute `DELETE`, `TRUNCATE`, or `DROP` commands on user-created data tables (such as `stores`, `products`, `orders`, `users`, `reviews`, etc.). All seeding operations must strictly be additive (using `get_or_create` or safe updates) to protect existing database records.
- **SAFE MIGRATIONS**: Prefer additive changes. Never drop columns or tables without explicit confirmation and a verified backup strategy.
- **SECRET PROTECTION**: Never log, print, or commit `.env` files, JWT secrets, or SSH keys.
- **DOCKER ENVIRONMENT**: Production runs on Docker. Always verify that changes (especially environment variables or file paths) are compatible with the containerized volume structure in `chapuu-backend/deploy/`.

## 2. Architectural Pillars

### A. Mobile App (Pasifiq Store)
The mobile app is an Expo native app with a comprehensive bidirectional WebView bridge.
- **Safe-Area**: Uses `SafeAreaView` with `edges=['top']` to protect content from overlapping with system UI.
- **State Bridge**:
    - **Native → Web**: Pre-seeds `localStorage` before load; sends `STATE_SYNC` for live updates (token, role, cart, location).
    - **Web → Native**: Posts `STORAGE_UPDATE` on store changes; reports `ACTIVE_ORDERS_COUNT` for tab badges.
- **Navigation Sync**: The web app detects `ChapuuMobile` User-Agent and hides all navigation bars and specific headers (via `.webview-hide-header`) synchronously.
- **Geolocation**: Native Modal permission flow; results synced to web Zustand store.
- **Notifications**: Native system notifications triggered by `ORDER_STATUS_NOTIFICATION` bridge messages. **Safety guards** are in place for Android Expo Go (SDK 53+) compatibility.
- **Resource Management**: Suspends Web-side polling/WebSockets when native tab loses focus (listens for `focus`/`blur` events).
- **Haptics**: Leverages `triggerHaptic` which maps to native device vibration.
- **Tunneling (ngrok)**: 
    - Use `npm run tunnel` to start Expo with a manual ngrok tunnel.
    - **Troubleshooting**: If `start-tunnel.sh` fails, verify no orphaned ngrok processes are holding port `4040` or `8081` (`killall -9 ngrok && fuser -k 8081/tcp`).
    - **Timeout**: Connection can take ~60-100s. The script timeout is set to 120s to accommodate slow handshakes.

### B. Real-Time Infrastructure (WebSockets)
- **WebSocket Auth**: Authentication for WebSockets is handled manually via `JWTAuthMiddleware` in `config/middleware.py`. It extracts the `token` from query parameters. **Do not modify this handshake logic.**
- **Order Broadcasts**: State transitions in `OrderStateMachine` (backend) automatically trigger WebSocket broadcasts to store and customer groups via `emit_update()`. **Never decouple state changes from broadcasts.**
- **Daphne/ASGI**: Real-time features rely on `daphne` and `channels`. Ensure the `ASGI_APPLICATION` setting remains pointed to `config.asgi.application`.

### C. Business Logic & Ordering
- **Multi-Vendor Logic**: Always scope store-specific logic using `selectedStore.id`. The cart stores a `store` object with each item; **do not remove it.**
- **Inventory Validation**: Stock checks must be enforced in **both** the frontend (`useStore.js`) and backend (`OrderSerializer.create`). Never allow ordering more than available `stock_quantity`.
- **Handoff Verification**: Customers must provide the 6-digit handoff code to the seller. 5 failed attempts will lock the order for manual support verification.

### D. State & Auth Layer
- **Nuclear Auth**: The `login` function in `useStore.js` uses native browser `fetch` to bypass Axios interceptors for a clean state. Do not "simplify" this back to the `apiClient`.
- **Zustand Persistence**: Core state (tokens, role, cart) is persisted in `chapuu-storage`.
- **Axios Client**: `apiClient.js` handles token injection and 401 redirection. The auth header logic is designed to prevent "Bearer null" errors; maintain the JWT dot-count validation.

## 3. Coding Standards

### Frontend (React 19 + Vite 7)
- **Monorepo Workflow**: Run commands from the root using `npm run dev` (Turbo) or target specific apps.
- **Defensive Guards**: Always use `Array.isArray()` and optional chaining (`?.`) when consuming API data.
- **Fulfillment Constraints**: `DINE_IN` requires a `table`. `DELIVERY` requires `customer_phone` and `delivery_location`. Ensure these are validated in `Checkout.jsx`.
- **Optimized Images**: Use the `<OptimizedImage />` component for all assets.
- **Responsive Layout**: Navigation bars must have solid backgrounds (`bg-dark-950/95`) and `backdrop-blur` to prevent scroll bleed.

### Backend (Django + DRF)
- **Role Hierarchy**: State transitions in `advance_state` are strictly role-gated (e.g., only `ACCOUNTANT` can verify payment, only `CHEF` can mark ready). Maintain these permission checks.
- **Queryset Scoping**: Always filter querysets by `request.user` or `store` in `get_queryset()` to prevent data leaks.
- **Image Compression**: Store and Payment images must pass through the `compress_image` utility to convert to WebP.
- **Parity**: Rules like "Mandatory Transaction IDs" must be enforced at both the Serializer and React levels.

## 4. Deployment & Workflow (MANDATORY SEQUENCE)
- **PUSH-BEFORE-PULL**: Never modify code directly on the production instance. The absolute mandatory sequence is: **Local Fix** → **Local Verification** → **Push to GitHub (master)** → **Pull on Remote Instance** → **Docker Rebuild**.
- **VERSION CONTROL**: Always stage and commit changes with descriptive messages. Never bypass the repository as the single source of truth.
- **PRODUCTION CONFIG**: Do not hardcode IPs or URLs. Use `BACKEND_URL` and `CSRF_TRUSTED_ORIGINS` from environment variables.

---

**PROCEED WITH CAUTION**: If a requested task contradicts these mandates, **STOP** and ask for clarification.
