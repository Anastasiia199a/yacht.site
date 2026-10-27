# Ilya Belov — Switch winter to summer

A one-page site for a yacht crew mentor: consultations, mentoring and a 3-month
program for anyone who wants to work on yachts.

The backdrop is a live WebGPU ocean (the FFT Ocean Surface component from
21st.dev): the camera follows the scroll, dives under water and surfaces into a
calm. Without WebGPU the scene falls back to a flat background.

## Run

```bash
bun install
bun run dev
```

Build: `bun run build`, output in `dist/`.

## Stack

React, TypeScript, Vite, Tailwind CSS 4, vgpu (WebGPU), bun.

## Leads, emails and the AI assistant

`apps-script/Code.gs` is a Google Apps Script backend: form requests go to a Google Sheet,
Ilya gets a notification and the visitor gets a confirmation with a copy of their request.
The same script answers the on-site assistant with Gemini, using `apps-script/knowledge-base.md`.
Setup (in Russian): `apps-script/SETUP.md`. The Web app URL goes into `src/lib/backend.ts`.

## Before going live

- Deploy the Apps Script and paste its URL into `BACKEND_URL` in `src/lib/backend.ts`.
- The Instagram handle and phone number are placeholders in `CONTACTS` in `src/App.tsx`.
