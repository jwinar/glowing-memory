import maplibregl from "maplibre-gl";
import {
  BufferTarget,
  CanvasSource,
  Output,
  QUALITY_HIGH,
  canEncode,
  Mp4OutputFormat,
  type VideoCodec,
} from "mediabunny";
import {
  applyTripFrame,
  buildTripLegRoutes,
  setupTripLayers,
  updateStopsLayer,
} from "@/lib/map-layers";
import { DEFAULT_STYLE_URL } from "@/lib/map-style";
import type { Trip } from "@/lib/trip";
import type { Stop } from "@/lib/types";

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  styleUrl?: string;
  onProgress?: (fraction: number) => void;
}

// Mirrors MapLibre's own reference export approach (debug/video-export.html
// in mapbox-gl-js): freeze the clock with setNow(), advance it one frame at
// a time, wait for tiles/labels to settle, then capture. The one thing that
// implementation doesn't need but we do: a completely separate, offscreen
// map instance sized to the export resolution, so a 30s render doesn't
// hijack the visible editor map the user is still looking at.
export async function exportTripToVideo(
  trip: Trip,
  stops: Stop[],
  options: ExportOptions,
): Promise<Blob> {
  const { width, height, fps, styleUrl = DEFAULT_STYLE_URL, onProgress } = options;
  if (trip.totalMs === 0) {
    throw new Error("Add at least one stop before exporting.");
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const map = new maplibregl.Map({
    container,
    style: styleUrl,
    center: [0, 20],
    zoom: 1.5,
    interactive: false,
    pixelRatio: 1,
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  try {
    await waitForLoad(map);
    map.setProjection({ type: "globe" });
    setupTripLayers(map);
    updateStopsLayer(map, stops);

    const legRoutes = buildTripLegRoutes(trip);

    // Prefer a royalty-free codec (VP9) over H.264/AVC, which carries VIA LA
    // patent licensing considerations for commercial video distribution.
    // MP4 (the container format users expect) supports both.
    const codec: VideoCodec = (await canEncode("vp9")) ? "vp9" : "avc";

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });
    const canvasSource = new CanvasSource(map.getCanvas(), {
      codec,
      quality: QUALITY_HIGH,
    });
    output.addVideoTrack(canvasSource, { frameRate: fps });
    await output.start();

    const totalFrames = Math.max(1, Math.ceil((trip.totalMs / 1000) * fps));
    const frameDuration = 1 / fps;

    for (let i = 0; i < totalFrames; i++) {
      const tMs = (i / fps) * 1000;
      applyTripFrame(map, trip, legRoutes, tMs);
      map.triggerRepaint();
      await waitForIdle(map);
      await canvasSource.add(i * frameDuration, frameDuration);
      onProgress?.((i + 1) / totalFrames);
    }

    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Export produced no output data.");
    return new Blob([buffer], { type: await output.getMimeType() });
  } finally {
    map.remove();
    container.remove();
  }
}

function waitForLoad(map: maplibregl.Map): Promise<void> {
  return new Promise((resolve, reject) => {
    map.once("load", () => resolve());
    map.once("error", (e) => reject(new Error(e.error?.message ?? "Map failed to load")));
  });
}

function waitForIdle(map: maplibregl.Map, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve) => {
    if (map.areTilesLoaded() && map.isStyleLoaded()) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      map.off("idle", onIdle);
      resolve();
    }, timeoutMs);
    function onIdle() {
      clearTimeout(timeout);
      resolve();
    }
    map.once("idle", onIdle);
  });
}
