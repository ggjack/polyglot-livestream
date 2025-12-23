# polyglot-livestream

A web MVP of a multi-lingual livestream. Takes in one livestream feed, and output multiple new livestreams with slightly delayed dubbing, hopefully as close to user's original voice profile. Hopefully train on their voice on the dubbed language if the user already can speak that language.

## Monorepo layout
- `apps/web`: React + TypeScript (Vite)
- `apps/api`: Node.js + TypeScript (Fastify)
- `packages/shared`: shared types and constants
- `docs`: architecture notes

## Quick start (local)
1) Install dependencies
   - `npm install`
2) Start frontend
   - `npm run dev -w apps/web`
3) Start API
   - `npm run dev -w apps/api`

## Environment variables
Copy `.env.example` to `.env` in `apps/api` and set keys.
