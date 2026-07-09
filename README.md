# WardConnect

WardConnect is a full-stack civic service platform built as a monorepo with an Angular frontend, a Node.js backend, and PostgreSQL for persistence. The workspace also includes module-specific documentation for the Kudumbashree implementation and supporting API notes.

## What’s Included

- Angular frontend in `angular-frontend/`
- Node.js backend in `backend/`
- Shared root scripts for installing and running both apps together
- Docker configuration for local containerized setup
- Project documentation for APIs, setup, Firebase, and the Kudumbashree module

## Tech Stack

- Frontend: Angular, TypeScript, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Tooling: Concurrent process runner, Docker, PWA support

## Project Structure

```text
ward conn/
├── angular-frontend/      # Angular application
├── backend/               # API server and supporting scripts
├── integrated-modules/    # Additional module workspaces
├── API_DOCUMENTATION.md
├── API_NAMES_LIST.md
├── KUDUMBASHREE_PRESENTATION.md
├── RUN_INSTRUCTIONS.md
├── firebase_instructions.md
└── docker-compose.yml
```

## Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL running locally on port `5432`
- A `wardconnect` database available in PostgreSQL

## Installation

From the root of the repository:

```bash
npm install
npm run install-all
```

This installs dependencies for the root project, the backend, and the frontend.

## Run Locally

Start both applications together:

```bash
npm run dev
```

Useful scripts from the root `package.json`:

- `npm run install-all` - installs backend and frontend dependencies
- `npm start` - starts backend and frontend together
- `npm run dev` - runs the backend in development mode and starts the Angular app

By default:

- Frontend: http://localhost:4200
- Backend API: http://localhost:5000

## Docker

If you prefer containers, review `docker-compose.yml` and the Dockerfiles inside the backend and frontend folders. They provide the starting point for running the stack in Docker.

## Documentation

- [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md)
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [API_NAMES_LIST.md](API_NAMES_LIST.md)
- [KUDUMBASHREE_PRESENTATION.md](KUDUMBASHREE_PRESENTATION.md)
- [firebase_instructions.md](firebase_instructions.md)

## Notes

- The repository is organized as a monorepo, so most work should happen inside either `backend/` or `angular-frontend/`.
- Some module-specific work lives under `integrated-modules/` and should be kept in sync with the main apps when features overlap.

## License

No license file is currently included in the repository.