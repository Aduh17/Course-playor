# Course Player

A local-first web app that turns a folder of videos into a course library. Point it at your videos folder once: every top-level subfolder becomes a course, nested folders become sections, and video files become lessons. Watch progress is tracked per lesson and saved in your browser.

## Features

- **Folder → course mapping** — no manual playlist building; your existing folder structure is the course structure
- **Custom HTML5 player** — scrub bar with buffer indicator, ±10s skip, playback speed (0.5–2×), volume, picture-in-picture, fullscreen, and auto-detected `.vtt` subtitles
- **Progress tracking** — resume where you left off, lessons auto-complete at 90% watched, partial lessons show a progress ring, courses show overall completion
- **Auto-advance** — finished a lesson? The next one starts playing
- **Keyboard shortcuts** — `Space`/`K` play/pause, `←`/`→` ±5s, `J`/`L` ±10s, `F` fullscreen, `M` mute
- **Persistence** — the chosen folder is remembered (Chromium), progress lives in `localStorage`

## Folder layout

```
Videos/                 ← the folder you pick
├─ Course A/           ← top-level folder = 1 course
│  ├─ 01 Basics/       ← nested folder = section (any depth)
│  │  ├─ 1 Intro.mp4   ← video file = lesson
│  │  └─ 2 Setup.mp4
│  └─ 02 Advanced/
│     └─ 1 Going deeper.mp4
└─ Course B/
   └─ Lesson 1.mp4     ← videos directly in a course folder work too
```

Supported video formats: `.mp4`, `.webm`, `.ogv`, `.ogg`, `.mov`, `.m4v`, `.mkv` (mkv depends on your browser's codec support).

## Getting started

Requires Node 18+.

```bash
npm install --include=dev
npm run dev
```

Then open http://localhost:5173 and select your videos folder.

> If `npm install` skips devDependencies on your machine (e.g. `NODE_ENV=production` or `omit=dev` is configured globally), `--include=dev` is required — without it `tsc` and `vite` won't be installed.

### Scripts

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server                  |
| `npm run build`     | Typecheck + production build to dist/ |
| `npm run preview`   | Serve the production build locally    |
| `npm run typecheck` | Typecheck only                        |

## How it works

- **File System Access API** (`showDirectoryPicker`) reads the folder, and the directory handle is stored in IndexedDB so the library reloads on your next visit. Supported by Chromium browsers (Chrome, Edge). On Firefox/Safari the app falls back to a folder input, and you reselect the folder on each visit.
- **Progress store** — each lesson's last position, furthest point watched, and completion state are kept in `localStorage` under `vcp:progress:v1`, keyed by the lesson's relative path. Clear it from the header with *Reset progress*.
- **No backend** — videos are read directly from disk and played through object URLs; nothing is uploaded anywhere.

## Tech stack

React 18 · TypeScript · Vite · plain CSS — no UI, state, or database libraries.

```
src/
├─ components/   # FolderPicker, Library, LessonTree, VideoPlayer, CourseView
├─ lib/          # fs (folder scanning), progress store, IndexedDB helper, utils
└─ styles/       # global.css (design tokens + all styling)
```
