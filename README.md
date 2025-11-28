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

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Convex (real-time database)
- **Authentication**: Better Auth
- **UI Components**: shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+ 
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
