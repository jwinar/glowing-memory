// OpenFreeMap: no API key, unlimited use, self-hostable later. Swap for a
// self-hosted Protomaps PMTiles style once we're ready to own the tiles —
// or override at build time without a code change via this env var.
export const DEFAULT_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/liberty";
