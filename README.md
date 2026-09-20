# Spider-X

Spider-X is a disaster-response platform. This repository will contain both the frontend and backend.

## Backend foundation

The initial backend is a JavaScript REST API built with Node.js and Express. It includes a health endpoint, CORS, JSON parsing, centralized error handling, and a Supabase client configuration for future database work.

### Run locally

```bash
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000` by default. Check it at `GET /api/health`.

Create `backend/.env` from `backend/.env.example` before adding Supabase-dependent functionality. Do not commit `.env` files.
