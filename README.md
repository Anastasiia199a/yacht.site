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

## Before going live

- Ilya's contacts are placeholders in the `CONTACTS` constant in `src/App.tsx`.
- The request form doesn't send data anywhere yet.
