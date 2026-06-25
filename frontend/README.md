# React Frontend

A premium travel planning UI built with **React 19 + TypeScript + Vite**. Provides a rich interactive interface for submitting travel goals and viewing AI-generated plans, weather reports, budget breakdowns, and execution traces.

## Running

```powershell
cd frontend
npm install   # first time only
npm run dev
```

Opens at **http://localhost:5173**

> ⚠️ The **Gateway (port 8080)** and **Backend (port 9090)** must also be running for the app to function.

## Tech Stack

| Library | Purpose |
|---------|---------|
| **React 19** | UI framework |
| **TypeScript 5.7** | Type safety |
| **Vite 6** | Build tool & dev server |
| **MUI 6 (Material UI)** | Component library |
| **Zustand 5** | Global state management |
| **TanStack Query 5** | Server state & data fetching |
| **React Hook Form + Zod** | Form validation |
| **Axios** | HTTP client |
| **Mermaid** | GOAP action graph rendering |
| **OGL** | WebGL background effects |
| **React Router 7** | Client-side routing |

## Available Scripts

```powershell
npm run dev          # Start development server (hot reload)
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format code with Prettier
npm run format:check # Check formatting without writing
```

## Folder Structure

```
src/
├── App.tsx                  Application root with routing
├── main.tsx                 Entry point
├── features/
│   └── planner/             Core planning feature
│       ├── api/             API client functions
│       ├── components/      UI components (form, results panels)
│       ├── dashboard/       Dashboard layout
│       ├── hooks/           React Query hooks
│       ├── model/           TypeScript types & interfaces
│       ├── pages/           Page-level components
│       └── store/           Zustand store slices
├── shared/                  Shared UI components & utilities
├── store/                   Global app state
└── widgets/                 Reusable widget components
```

## Environment / Proxy

The Vite dev server is configured to proxy `/api` requests to the gateway at `http://localhost:8080`. See [vite.config.ts](vite.config.ts) for proxy settings.
