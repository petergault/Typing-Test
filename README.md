# Quill Typing – Lesson 1

A kid-friendly typing practice experience built with Next.js and Tailwind CSS. Lesson 1 introduces the F and J home-row keys through guided drills, instant feedback, a simple mini-game, and a celebratory summary that saves progress locally in the browser.

## Features
- **Environment checks**: preflight keyboard detection plus focus reminders so keystrokes are captured reliably.
- **Posture & discovery**: interactive warm-up that walks students through finding the F and J bumps before drills start.
- **Drills with safeguards**: short F-only, J-only, and alternating sequences with gentle hints, streak celebrations, and optional skips when students feel stuck.
- **Mini-game**: a falling-letter catch challenge that rewards accuracy over spamming and adapts speed based on performance.
- **Summary & persistence**: stars, accuracy, streak, and game stats with best-run tracking stored in `localStorage` (device-only). Includes “Start fresh” reset controls for shared devices.

## Getting started
Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open http://localhost:3000 to use the lesson. Progress is saved per browser; clearing storage or switching devices resets it.

## Project structure
- `src/app/page.tsx`: Home page with lesson overview, start CTA, and device reset option.
- `src/app/lesson/1/page.tsx`: Full Lesson 1 flow (preflight, intro, drills, game, summary).
- `src/components/VisualKeyboard.tsx`: On-screen keyboard with target/feedback highlighting.
- `src/lib/progress.ts`: Safe helpers for reading/writing lesson progress in `localStorage`.

## Notes
- The experience assumes a hardware keyboard. On small/mobile viewports a reminder banner appears.
- No accounts or backend services are used; everything runs client-side.
