# Noteworthy

A beautiful, modern note-taking app built with Next.js and Convex. Capture your thoughts, organize your ideas, and stay productive.

![Noteworthy](public/logo.png)

## Features

- **Rich Text Editor** - Write notes with markdown support and beautiful formatting
- **Real-time Sync** - Your notes sync instantly across all devices
- **Tags & Organization** - Organize notes with tags for easy filtering
- **Quick Search** - Find any note instantly with fuzzy search
- **Dark Mode** - Easy on the eyes with automatic theme switching
- **Trash & Recovery** - Accidentally deleted? Restore from trash
- **Version History** - View and restore previous versions of your notes
- **PWA Support** - Install on mobile for a native app experience

## Tech Stack

- **Frontend**: Next.js 16.4.0, React 19.3.0, React Compiler, TailwindCSS
- **Backend**: Convex (real-time database)
- **Authentication**: Better Auth
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Node.js 22.12+ or Node.js 24
- npm or yarn
- A Convex account (free tier available)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/lulacoder/Notes-app-for-reals.git
   cd Notes-app-for-reals/notes-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with your Convex and auth credentials:
   ```
   CONVEX_DEPLOYMENT=your-convex-deployment
   NEXT_PUBLIC_CONVEX_URL=your-convex-url
   BETTER_AUTH_SECRET=your-auth-secret
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Checks and backend updates

```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm test
npm audit --omit=dev
npm run build
```

Tests run against an in-memory Convex database. Configure `NEXT_PUBLIC_CONVEX_SITE_URL` for the auth proxy and `SITE_URL` on the Convex deployment for auth callbacks. Keep `BETTER_AUTH_SECRET` on the backend deployment.

This project intentionally uses the Convex **dev deployment for the hosted app** and the **prod deployment for localhost**:

| Frontend | Convex deployment | Backend `SITE_URL` |
| --- | --- | --- |
| `https://notes-app-liart-eight.vercel.app` | Dev: `calculating-seal-739` | `https://notes-app-liart-eight.vercel.app` |
| `http://localhost:3000` | Prod: `dapper-lemming-169` | `http://localhost:3000` |

Local `.env.development.local` and `.env.production.local` must point `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` at `dapper-lemming-169`. The hosted frontend points these variables at `calculating-seal-739`. Frontend env files do not change Convex's backend `SITE_URL`; set that separately on the named deployment. Selecting the wrong deployment or changing its `SITE_URL` to the other frontend's origin causes `403 INVALID_ORIGIN`.

Private links send signed-out visitors to `/login?next=...`. Sign-in and sign-up preserve that destination, and active sessions skip both auth pages. Return paths are limited to notes, canvases, boards, and admin pages. Session checks read the live user on each server request, with request-local deduplication. Signing in or out starts a fresh page request to discard private client route caches.

See [the Next.js 16.4 upgrade notes](docs/next-16-4-upgrade.md) for caching behavior, authentication safeguards, and the required backend-first release order.

## Usage

1. **Create an account** - Sign up with your email
2. **Create notes** - Click the + button to create a new note
3. **Organize with tags** - Add tags to categorize your notes
4. **Search** - Use `Ctrl/Cmd + K` to quickly search all notes
5. **Dark mode** - Toggle theme in the header

## Canvas Mode (Experimental)

The app includes an experimental canvas feature for visual note-taking. This feature is currently unstable and under active development.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ by [lulacoder](https://github.com/lulacoder)
