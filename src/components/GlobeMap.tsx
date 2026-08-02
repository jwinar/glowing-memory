"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

// OpenFreeMap: no API key, unlimited use, self-hostable later. Swap for a
// self-hosted Protomaps PMTiles style once we're ready to own the tiles.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export default function GlobeMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      map.setProjection({ type: "globe" });
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
