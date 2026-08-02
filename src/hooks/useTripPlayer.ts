"use client";

import { setNow, restoreNow, type MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { evaluateCamera, type Trip } from "@/lib/trip";

// Drives the map from a Trip timeline. This is deliberately the same
// evaluateCamera(trip, tMs) call the export pipeline (milestone 6) will
// use — preview just advances tMs from requestAnimationFrame's wall clock
// instead of stepping it frame-by-frame, so the two can never drift apart.
export function useTripPlayer(map: MapLibreMap | null, trip: Trip) {
  const [tMs, setTMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  // Read by the rAF loop below, which must always see the latest trip
  // without restarting (and losing its elapsed-time baseline) every time
  // stops are added or edited mid-playback.
  const tripRef = useRef(trip);
  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  // Apply whatever tMs currently is to the map, whether that came from
  // playback, a seek, or the trip itself changing (e.g. a pin was added).
  useEffect(() => {
    if (!map) return;
    setNow(tMs);
    map.jumpTo(evaluateCamera(trip, tMs));
  }, [map, tMs, trip]);

  useEffect(() => restoreNow, []);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameRef.current = null;
      return;
    }

    function tick(now: number) {
      const last = lastFrameRef.current ?? now;
      const delta = now - last;
      lastFrameRef.current = now;

      setTMs((prev) => {
        const next = prev + delta;
        if (next >= tripRef.current.totalMs) {
          setIsPlaying(false);
          return tripRef.current.totalMs;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const play = useCallback(() => {
    if (tripRef.current.totalMs === 0) return;
    setTMs((prev) => (prev >= tripRef.current.totalMs ? 0 : prev));
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => setIsPlaying(false), []);

  const seek = useCallback((next: number) => {
    setIsPlaying(false);
    setTMs(Math.min(Math.max(next, 0), tripRef.current.totalMs));
  }, []);

  return { tMs, isPlaying, play, pause, seek, totalMs: trip.totalMs };
}
