# Simona Singh's Spreetail — AI Ingestion & Debugging Log

This document outlines the AI assistance utilized in constructing Spreetail, key prompts executed, and three concrete debugging case studies where AI errors were caught and resolved.

---

## 1. AI Tools & Prompt Logs

- **AI Tools Engaged**: Claude 3.5 Sonnet (Anthropic) & Antigravity (Google DeepMind).
- **Core Prompts**:
  - *"audit each and every thing from UI to backend and connection and logics"*
  - *"make UI more premium and unique and production grade"*
  - *"deploy both in vercel"*
  - *"now I want to change whole UI and structure so It doesnt look the same as before and for background color use premium creamy background blackish design. Recruiter shouldnt be able to see it as same"*

---

## 2. Debugging Case Studies

### Case 1: Incomplete Serialization of Prisma Decimals
- **AI Mistake**: The AI sent the Prisma database query objects containing `Decimal` fields directly to the React frontend. Because standard JSON translation does not support fixed-point decimals, the client-side app read these attributes as raw nested object structures instead of numbers, causing calculations and formatting (e.g. `toFixed()`) to fail.
- **Detection**: Caught when loading the group detail view, which threw console errors: `TypeError: amount.toFixed is not a function`.
- **Resolution**: Refactored the backend controllers to explicitly convert database `Decimal` values into JS floating-point numbers (`Number(decimalVal)`) prior to API dispatch.

### Case 2: Browser Style Desynchronization due to Vite Caching
- **AI Mistake**: During the custom color palette redesign (implementing champagne gold and warm off-black), the AI kept writing redundant CSS overrides because visual changes were not showing up in the browser, believing the Tailwind classes were incorrect.
- **Detection**: The browser rendered the old blue-indigo default theme despite changes in `index.css`.
- **Resolution**: Identified that Vite aggressively caches local style bundles. Cleared the Vite dependency pre-optimization cache by running `npx vite --force` and performed a browser hard reload (`Ctrl + F5`), forcing the browser to load the new premium color theme.

### Case 3: WebSocket Namespace Failures under Reverse Proxy
- **AI Mistake**: The AI initialized the Socket.io client using the default endpoint origin without specifying namespace paths for the deployment's reverse proxy structure.
- **Detection**: On the live URL, expense comment threads failed to load, and the browser console reported continuous `404 Not Found` requests on `/socket.io`.
- **Resolution**: In the Render multi-project setup, the backend runs behind the reverse proxy routing prefix `/_/backend`. Configured custom path options on the client:
  ```ts
  const socket = io(SOCKET_URL, {
    path: '/_/backend/socket.io'
  });
  ```
  This allowed the proxy to correctly route WebSocket handshakes to the Node.js Express server.
