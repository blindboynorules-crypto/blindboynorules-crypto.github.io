# Portfolio Editing Kit

This portfolio is now split for deeper editing:

- `index.html` controls page structure and text content.
- `src/styles.css` controls colors, typography, layout, responsive rules and visual polish.
- `src/main.js` controls scroll video, reveal motion, title morphing and the contact particle surface.

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run format
```

## Installed Toolkit

- Vite: live local server and production build.
- Prettier: consistent formatting.
- Motion: animation toolkit for future advanced transitions.
- Three.js: 3D/canvas toolkit for visual effects.

## Fast Edit Map

- Brand color: `src/styles.css`, `--orange`.
- Background/video hero: `index.html`, `.hero-video` sources.
- Mobile layout: `src/styles.css`, `@media (max-width: 700px)`.
- Scroll-linked video behavior: `src/main.js`, `syncVideoToScroll()`.
- Contact dotted surface: `src/main.js`, `contactDottedSurface`.
