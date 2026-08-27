# AnyConvert

**100% client-side, privacy-first file converter.** Images, PDFs, audio,
video, and text are converted entirely inside the user's browser using
WebAssembly and native browser APIs — no file ever touches a server.

## Why it's private

- All conversion logic lives in `src/lib/converters/` and runs in the
  browser (Canvas API, `pdf-lib`, `pdfjs-dist`, `@ffmpeg/ffmpeg`, `tesseract.js`).
- The only network calls are: (1) the Google Translate widget script,
  (2) the one-time FFmpeg core WASM download (cached afterwards), and
  (3) optional Supabase auth/usage-logging calls that never include file
  content — see `supabase/migrations/0001_init.sql`.
- `conversion_logs` stores only a format pair (`file_type_from`,
  `file_type_to`) and a timestamp. No filenames, sizes, or bytes.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # optional — only needed for Google sign-in
npm run dev
```

Open http://localhost:3000.

### Optional: enabling Google Sign-In + usage tracking

1. Create a Supabase project.
2. Run the migration in `supabase/migrations/0001_init.sql` (SQL editor or
   `supabase db push`).
3. In Supabase Auth settings, enable the Google provider and configure the
   OAuth redirect URL as `<your-site-url>/auth/callback`.
4. Fill in `.env.local` with your project URL and anon key.

If you skip all of the above, the app still works exactly the same —
`AuthButton` simply doesn't render, and `FREE_MODE` in
`src/lib/utils/usageLimits.ts` keeps every conversion unlimited.

## Project structure

```
src/
  app/
    layout.tsx              Root layout, metadata
    page.tsx                Main two-column converter UI
    auth/callback/route.ts  Supabase OAuth redirect handler
    globals.css
  components/
    Navbar.tsx               Logo, tagline, translate widget, auth button
    GoogleTranslate.tsx       1-click language switcher (Hindi, Marathi, Spanish, ...)
    AuthButton.tsx            Google sign-in / avatar menu
    DropZone.tsx              Left column: drag-and-drop + file queue
    OutputPanel.tsx           Right column: format/quality controls + convert button
    Footer.tsx
  lib/
    converters/
      image.ts          Canvas-based JPG/PNG/WebP/GIF/BMP/ICO
      pdf.ts            pdf-lib + pdfjs-dist: merge/split/compress/img<->pdf
      text.ts           TXT→PDF, CSV→JSON, Markdown→HTML
      audioVideo.ts     FFmpeg.wasm: MP4→MP3/WAV, Video→GIF
      ocr.ts            Tesseract.js: Image→Text
      index.ts          Single dispatcher used by the UI
    supabase/
      client.ts         Browser client, sign-in/out, usage logging
      server.ts         Server client (OAuth callback only)
    store/useConversionStore.ts   Zustand store for the file queue + options
    utils/
      fileHelpers.ts
      usageLimits.ts    Phase 1 (unlimited) / Phase 2 (metered) toggle
  types/index.ts

supabase/migrations/0001_init.sql   users + conversion_logs schema
```

## Phase 1 → Phase 2

Everything needed for metered usage later already exists but is inert:

- Flip `FREE_MODE = false` in `src/lib/utils/usageLimits.ts`.
- `conversion_logs` + the `monthly_conversion_counts` view are already
  live in the database, so per-user counts are just a query away.
- `canConvert()` already branches on guest vs free vs pro — wire it to a
  real fetch of `monthly_conversion_counts` for signed-in users and you're
  done.

## Deployment notes

- The `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers
  in `next.config.js` are required for FFmpeg.wasm's multi-threaded mode —
  keep them if you self-host.
- Any static host (Vercel, Netlify, Cloudflare Pages) works since nothing
  conversion-related runs server-side.
