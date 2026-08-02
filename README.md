# glowing-memory — Travel Animator

A web SaaS that turns a list of places you've traveled into a smooth, cute animated map
video, exportable as MP4 for Instagram / TikTok / YouTube.

Built on **MapLibre GL JS** (BSD-3, globe projection) + **Protomaps/OpenFreeMap tiles**
(CC0 cartography, ODbL data) — a stack with no video-export licensing restrictions, unlike
Mapbox or Google Earth Studio. Export runs client-side via WebCodecs, at zero marginal cost.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind
- MapLibre GL JS for rendering (globe projection + 3D terrain)
- Turf.js for great-circle flight arcs
- d3-ease / d3-interpolate for camera easing
- WebCodecs + Mediabunny for in-browser MP4 export
