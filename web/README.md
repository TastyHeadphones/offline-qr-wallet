# Web Console

Browser-first operations console for environments where native iOS deployment is unavailable.

## Run

```bash
cd web
npm install
npm run dev
```

Open the local URL shown by Vite (default `http://localhost:5173`).

## Supported Operations

- Account creation
- Device registration
- Top-up
- Balance query
- Device freeze
- Card transfer start/complete
- Manual offline transaction sync upload

## Backend Requirement

Backend API should be running on `http://localhost:8080` (or set a different base URL in the UI header field).
