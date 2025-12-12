# 📚 Complete Learning Guide for Noteworthy

> A step-by-step guide to understand every aspect of this project from top to bottom.

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites & Setup](#2-prerequisites--setup)
3. [Tech Stack Deep Dive](#3-tech-stack-deep-dive)
4. [Step 1: Configuration Files](#step-1-configuration-files)
5. [Step 2: Database Schema (Convex)](#step-2-database-schema-convex)
6. [Step 3: Authentication System](#step-3-authentication-system)
7. [Step 4: Backend API Functions](#step-4-backend-api-functions)
8. [Step 5: Providers & Context](#step-5-providers--context)
9. [Step 6: Application Layout & Routing](#step-6-application-layout--routing)
10. [Step 7: Core Components](#step-7-core-components)
11. [Step 8: UI Components (shadcn/ui)](#step-8-ui-components-shadcnui)
12. [Step 9: Utility Libraries](#step-9-utility-libraries)
13. [Step 10: Styling & Theming](#step-10-styling--theming)
14. [Learning Path Recommendations](#learning-path-recommendations)
15. [Key Concepts to Master](#key-concepts-to-master)

---

## 1. Project Overview

**Noteworthy** is a modern, real-time note-taking application with the following features:

- ✍️ Markdown-based note editing with live preview
- 🎨 Infinite canvas for visual note-taking (tldraw)
- 🏷️ Tag-based organization system
- 🔍 Fuzzy search with Fuse.js
- 📱 Mobile-responsive with PWA support
- 🌓 Dark/Light theme support
- 📚 Version history for notes
- 🗑️ Soft delete with trash recovery

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  Pages & Routes  │  Components  │  Providers  │  Utilities   │
├─────────────────────────────────────────────────────────────┤
│                    Convex React Hooks                        │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND (Convex)                        │
├─────────────────────────────────────────────────────────────┤
│   Schema   │   Queries   │   Mutations   │   HTTP Routes    │
├─────────────────────────────────────────────────────────────┤
│                    Better Auth Plugin                        │
├─────────────────────────────────────────────────────────────┤
│                 Convex Real-time Database                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites & Setup

### Required Knowledge
- JavaScript/TypeScript fundamentals
- React basics (hooks, components, state)
- Basic understanding of REST APIs
- CSS/TailwindCSS basics

### Environment Setup

**Files to read first:**
1. `package.json` - Dependencies and scripts
2. `.env.local` - Environment variables (create from template)

**Key Environment Variables:**
```env
NEXT_PUBLIC_CONVEX_URL=your-convex-deployment-url
CONVEX_DEPLOYMENT=your-convex-deployment-id
SITE_URL=http://localhost:3000
```

---

## 3. Tech Stack Deep Dive

| Technology | Purpose | Files to Study |
|------------|---------|----------------|
| **Next.js 16** | React framework with App Router | `next.config.ts`, `app/` folder |
| **React 19** | UI library | All `.tsx` components |
| **Convex** | Real-time backend database | `convex/` folder |
| **Better Auth** | Authentication | `convex/auth.ts`, `lib/auth-client.ts` |
| **TailwindCSS 4** | Styling | `globals.css`, `tailwind.config` |
| **shadcn/ui** | UI component library | `components/ui/` folder |
| **tldraw** | Infinite canvas | `components/CanvasEditor.tsx` |
| **Fuse.js** | Fuzzy search | `lib/fuse.ts` |
| **React Markdown** | Markdown rendering | `components/NoteEditor.tsx` |

---

## Step 1: Configuration Files

### 📁 Read These Files First

| File | Purpose | Key Learnings |
|------|---------|---------------|
| `package.json` | Project dependencies | All packages used in the project |
| `tsconfig.json` | TypeScript config | Path aliases (`@/`), compiler options |
| `next.config.ts` | Next.js configuration | Build settings, redirects |
| `components.json` | shadcn/ui config | Component styling defaults |
| `eslint.config.mjs` | Linting rules | Code quality standards |
| `postcss.config.mjs` | PostCSS config | TailwindCSS processing |

### Key Dependencies to Understand

```json
{
  // Backend & Data
  "convex": "Real-time database and backend",
  "@convex-dev/better-auth": "Auth integration with Convex",
  "better-auth": "Authentication library",
  
  // UI Framework
  "@radix-ui/*": "Accessible UI primitives",
  "lucide-react": "Icon library",
  "cmdk": "Command palette component",
  
  // Canvas
  "@tldraw/tldraw": "Infinite canvas editor",
  
  // Markdown
  "react-markdown": "Markdown renderer",
  "remark-gfm": "GitHub Flavored Markdown",
  "rehype-sanitize": "HTML sanitization",
  
  // Utilities
  "fuse.js": "Fuzzy search",
  "date-fns": "Date formatting",
  "clsx": "Conditional classnames",
  "tailwind-merge": "Merge Tailwind classes"
}
```

---

## Step 2: Database Schema (Convex)

### 📁 File to Read: `convex/schema.ts`

This is the **most important backend file**. It defines all data structures.

### Database Tables

#### 1. `notes` Table
```typescript
{
  title: string,          // Note title
  content: string,        // Markdown content
  userId: string,         // Owner ID
  createdAt: number,      // Unix timestamp
  updatedAt: number,      // Last update timestamp
  isDeleted: boolean,     // Soft delete flag
  deletedAt: number,      // When deleted
  isPinned: boolean,      // Pin status
  pinnedAt: number,       // When pinned
  tagIds: Id<"tags">[],   // Associated tags
}
```

#### 2. `tags` Table
```typescript
{
  name: string,           // Tag name
  color: string,          // CSS color class
  userId: string,         // Owner ID
  createdAt: number,      // Creation timestamp
}
```

#### 3. `noteVersions` Table
```typescript
{
  noteId: Id<"notes">,    // Parent note reference
  title: string,          // Version title
  content: string,        // Version content
  userId: string,         // Owner ID
  createdAt: number,      // Version timestamp
}
```

#### 4. `canvases` Table
```typescript
{
  title: string,          // Canvas title
  content: string,        // tldraw JSON snapshot
  userId: string,         // Owner ID
  createdAt: number,
  updatedAt: number,
  isDeleted: boolean,
  deletedAt: number,
  isPinned: boolean,
  pinnedAt: number,
  tagIds: Id<"tags">[],
}
```

#### 5. `canvasAssets` Table
```typescript
{
  canvasId: Id<"canvases">,  // Parent canvas
  assetId: string,            // tldraw asset ID
  storageId: Id<"_storage">,  // Convex storage reference
  userId: string,
  mimeType: string,
  createdAt: number,
}
```

### Database Indexes
Study the `.index()` calls - they optimize queries:
- `by_user` - Query by user ID
- `by_user_updated` - Sort by update time
- `by_user_deleted` - Filter trash
- `by_user_pinned` - Filter pinned items

---

## Step 3: Authentication System

### 📁 Files to Read (In Order)

1. **`convex/auth.ts`** - Server-side auth setup
2. **`lib/auth-client.ts`** - Client-side auth
3. **`convex/http.ts`** - HTTP routes for auth
4. **`providers/convex-provider.tsx`** - Auth provider wrapper
5. **`app/(auth)/login/page.tsx`** - Login page
6. **`app/(auth)/register/page.tsx`** - Registration page

### How Authentication Works

```
┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│  auth-client │───▶│  Better Auth   │───▶│   Convex     │
│   (browser)  │    │   (handles)    │    │  (stores)    │
└──────────────┘    └────────────────┘    └──────────────┘
      │                     │                     │
   signIn()           validates          stores session
   signUp()           passwords           user data
   signOut()          tokens             accounts
```

### Key Concepts

**Server-side (`convex/auth.ts`):**
- `createClient` - Creates Convex-compatible auth client
- `createAuth` - Configures Better Auth with email/password
- `getCurrentUser` - Query to get authenticated user

**Client-side (`lib/auth-client.ts`):**
- `signIn` - Login function
- `signUp` - Registration function  
- `signOut` - Logout function
- `useSession` - Hook for session state

**Protected Routes:**
- Check `useConvexAuth()` hook
- Redirect to `/login` if not authenticated

---

## Step 4: Backend API Functions

### 📁 Files to Read (In Order)

| File | Purpose | Functions |
|------|---------|-----------|
| `convex/notes.ts` | Note CRUD operations | listNotes, createNote, updateNote, deleteNote, etc. |
| `convex/canvases.ts` | Canvas operations | listCanvases, createCanvas, updateCanvas, etc. |
| `convex/tags.ts` | Tag management | listTags, createTag, updateTag, deleteTag |
| `convex/versions.ts` | Version history | listVersions, createVersion, restoreVersion |

### Query vs Mutation

```typescript
// QUERY - Read data (reactive, auto-updates UI)
export const listNotes = query({
  args: {},
  handler: async (ctx) => {
    // Read from database
    return await ctx.db.query("notes").collect();
  },
});

// MUTATION - Write data
export const createNote = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    // Write to database
    return await ctx.db.insert("notes", { title: args.title });
  },
});
```

### Important Patterns

**1. User Authentication Check:**
```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Not authenticated");
}
```

**2. User Data Isolation:**
```typescript
.withIndex("by_user", (q) => q.eq("userId", identity.subject))
```

**3. Soft Delete Pattern:**
```typescript
// Move to trash (recoverable)
await ctx.db.patch(noteId, { isDeleted: true, deletedAt: Date.now() });

// Permanent delete
await ctx.db.delete(noteId);
```

---

## Step 5: Providers & Context

### 📁 Files to Read

1. **`providers/convex-provider.tsx`** - Convex + Auth provider
2. **`providers/theme-provider.tsx`** - Theme (dark/light) provider
3. **`app/layout.tsx`** - Root layout with providers

### Provider Hierarchy

```tsx
<ThemeProvider>              {/* Theme context */}
  <ConvexClientProvider>     {/* Convex + Auth context */}
    {children}               {/* Your app */}
  </ConvexClientProvider>
</ThemeProvider>
```

### Using Convex in Components

```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function MyComponent() {
  // Read data (auto-subscribes to changes)
  const notes = useQuery(api.notes.listNotes);
  
  // Write data
  const createNote = useMutation(api.notes.createNote);
  
  const handleCreate = async () => {
    await createNote({ title: "New Note" });
  };
}
```

---

## Step 6: Application Layout & Routing

### 📁 Files to Read (In Order)

1. **`app/layout.tsx`** - Root layout (fonts, metadata, providers)
2. **`app/page.tsx`** - Landing page
3. **`app/(auth)/layout.tsx`** - Auth pages layout (if exists)
4. **`app/(dashboard)/layout.tsx`** - Dashboard layout (auth guard)
5. **`app/(dashboard)/notes/page.tsx`** - Main notes page
6. **`app/(dashboard)/canvas/page.tsx`** - Canvas listing
7. **`app/(dashboard)/canvas/[id]/page.tsx`** - Canvas editor

### Route Structure

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # / (landing)
├── globals.css             # Global styles
├── (auth)/                 # Auth route group
│   ├── login/page.tsx      # /login
│   └── register/page.tsx   # /register
├── (dashboard)/            # Protected route group
│   ├── layout.tsx          # Dashboard layout (auth guard)
│   ├── notes/page.tsx      # /notes
│   └── canvas/
│       ├── page.tsx        # /canvas
│       └── [id]/page.tsx   # /canvas/:id
└── api/
    └── auth/
        └── [...all]/route.ts  # Auth API routes
```

### Route Groups Explained

- `(auth)` - Parentheses create a route group (no URL segment)
- `(dashboard)` - Groups protected routes with shared layout
- `[id]` - Dynamic route parameter
- `[...all]` - Catch-all route (for auth endpoints)

---

## Step 7: Core Components

### 📁 Read These Components (In Order)

| Priority | Component | File | Purpose |
|----------|-----------|------|---------|
| 1 | **Sidebar** | `components/Sidebar.tsx` | Note list, search, navigation |
| 2 | **NoteEditor** | `components/NoteEditor.tsx` | Markdown editor with preview |
| 3 | **CanvasEditor** | `components/CanvasEditor.tsx` | tldraw canvas integration |
| 4 | **Header** | `components/Header.tsx` | Top navigation, user menu |
| 5 | **QuickSwitcher** | `components/QuickSwitcher.tsx` | Cmd+K note search |
| 6 | **TagManager** | `components/TagManager.tsx` | Tag CRUD, filtering |
| 7 | **TrashView** | `components/TrashView.tsx` | Deleted notes recovery |
| 8 | **VersionHistory** | `components/VersionHistory.tsx` | Note versions |
| 9 | **KeyboardShortcuts** | `components/KeyboardShortcuts.tsx` | Global shortcuts |
| 10 | **MobileNav** | `components/MobileNav.tsx` | Mobile navigation |
| 11 | **ThemeToggle** | `components/ThemeToggle.tsx` | Dark/light switch |

### Component Deep Dives

#### Sidebar.tsx - Key Concepts
- Uses `useQuery` for reactive note list
- Implements fuzzy search with Fuse.js
- Handles note CRUD operations
- Manages canvas navigation
- Tag filtering logic

#### NoteEditor.tsx - Key Concepts
- Split-pane editor (Markdown + Preview)
- Auto-save with debouncing (1 second)
- Version creation with debouncing (5 minutes)
- Auto-title extraction from content
- Tag assignment
- Pin toggle

#### CanvasEditor.tsx - Key Concepts
- Dynamic tldraw import (code splitting)
- Theme sync with app theme
- Auto-save canvas state
- Snapshot save/restore

---

## Step 8: UI Components (shadcn/ui)

### 📁 Files in `components/ui/`

These are pre-built, accessible UI primitives from [shadcn/ui](https://ui.shadcn.com/).

| Component | File | Usage |
|-----------|------|-------|
| Button | `button.tsx` | Click actions |
| Input | `input.tsx` | Text input |
| Textarea | `textarea.tsx` | Multi-line input |
| Card | `card.tsx` | Content containers |
| Dialog | `dialog.tsx` | Modals |
| DropdownMenu | `dropdown-menu.tsx` | Menus |
| Command | `command.tsx` | Command palette |
| Badge | `badge.tsx` | Labels/tags |
| Tabs | `tabs.tsx` | Tab navigation |
| ScrollArea | `scroll-area.tsx` | Custom scrollbar |
| Tooltip | `tooltip.tsx` | Hover hints |
| AlertDialog | `alert-dialog.tsx` | Confirmations |
| Popover | `popover.tsx` | Floating content |
| Avatar | `avatar.tsx` | User images |
| Switch | `switch.tsx` | Toggle switches |
| Label | `label.tsx` | Form labels |
| Separator | `separator.tsx` | Dividers |

### Understanding shadcn/ui

These components are **not a library** - they're copied into your project and can be customized. They use:
- **Radix UI** - Accessible primitives
- **class-variance-authority (cva)** - Variant styling
- **tailwind-merge** - Class merging

---

## Step 9: Utility Libraries

### 📁 Files in `lib/`

| File | Purpose | Key Exports |
|------|---------|-------------|
| `utils.ts` | General utilities | `cn()` - class name merger |
| `auth-client.ts` | Auth utilities | `signIn`, `signUp`, `signOut`, `useSession` |
| `fuse.ts` | Search utilities | `createNotesSearchIndex()`, `searchNotes()` |
| `relative-time.ts` | Date formatting | `getRelativeTime()` |

### Key Utility Functions

```typescript
// cn() - Merge Tailwind classes safely
import { cn } from "@/lib/utils";
cn("px-4 py-2", condition && "bg-blue-500", "text-white");

// Fuse.js search setup
import { createNotesSearchIndex } from "@/lib/fuse";
const index = createNotesSearchIndex(notes);
const results = index.search("query");

// Relative time
import { getRelativeTime } from "@/lib/relative-time";
getRelativeTime(timestamp); // "2 hours ago"
```

---

## Step 10: Styling & Theming

### 📁 Files to Read

1. **`app/globals.css`** - Global styles, CSS variables
2. **`tailwind.config.ts`** - Tailwind configuration (if exists)
3. **`components.json`** - shadcn/ui styling config

### CSS Variables (Theme System)

The app uses CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --muted: 0 0% 96.1%;
  /* ... */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... */
}
```

### Using Theme Colors

```tsx
// In Tailwind classes
<div className="bg-background text-foreground" />
<button className="bg-primary text-primary-foreground" />
<p className="text-muted-foreground" />
```

---

## Learning Path Recommendations

### 🎯 Beginner Path (1-2 weeks)

1. **Day 1-2:** Configuration files, understand project structure
2. **Day 3-4:** Database schema (`convex/schema.ts`)
3. **Day 5-6:** Auth system (login/register flow)
4. **Day 7-8:** Basic CRUD (`convex/notes.ts`)
5. **Day 9-10:** UI components (Button, Input, Card)
6. **Day 11-14:** Main page flow (Sidebar → NoteEditor)

### 🚀 Intermediate Path (1 week)

1. **Day 1-2:** Provider architecture, context flow
2. **Day 3-4:** Real-time subscriptions, optimistic updates
3. **Day 5-6:** Canvas integration (tldraw)
4. **Day 7:** Search, keyboard shortcuts, mobile nav

### ⚡ Advanced Path (2-3 days)

1. **Day 1:** Performance patterns (debouncing, code splitting)
2. **Day 2:** Version history, soft delete patterns
3. **Day 3:** PWA features, deployment considerations

---

## Key Concepts to Master

### 1. Real-time Data Flow
```
User Action → Mutation → Database → Query Subscription → UI Update
```

### 2. Component State Management
- Local state (`useState`) for UI
- Server state (`useQuery`) for data
- No global state manager needed (Convex handles it)

### 3. Authentication Pattern
```tsx
// Protected route check
const { isAuthenticated, isLoading } = useConvexAuth();
if (!isAuthenticated) redirect("/login");
```

### 4. Debouncing Pattern
```typescript
// Auto-save after 1 second of no typing
useEffect(() => {
  const timeout = setTimeout(() => save(), 1000);
  return () => clearTimeout(timeout);
}, [content]);
```

### 5. Optimistic Updates
Convex automatically provides optimistic updates - UI updates immediately while server syncs in background.

---

## 🎓 Practice Exercises

### Exercise 1: Add Note Sharing
Extend the schema to allow sharing notes with other users.

### Exercise 2: Add Note Categories
Create a folder/category system for notes.

### Exercise 3: Export to PDF
Add a feature to export notes as PDF files.

### Exercise 4: Collaborative Editing
Research and implement real-time collaborative editing.

### Exercise 5: Mobile App
Convert to React Native or create a PWA with offline support.

---

## 📚 Additional Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Better Auth Docs](https://www.better-auth.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [tldraw Documentation](https://tldraw.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

---

## 📝 Quick Reference Card

| Task | Code |
|------|------|
| Read data | `useQuery(api.notes.listNotes)` |
| Write data | `useMutation(api.notes.createNote)` |
| Check auth | `useConvexAuth()` |
| Get user | `useSession()` |
| Navigate | `useRouter().push('/path')` |
| Theme | `useTheme()` |

---

Happy Learning! 🚀

*Generated for the Noteworthy project - A modern note-taking app*
