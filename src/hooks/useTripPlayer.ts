"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/trip";

// Tracks playback position for a Trip timeline: play/pause advance tMs via
// requestAnimationFrame's wall clock, seeking jumps it directly. Doesn't
// touch the map itself — GlobeMap applies whatever tMs comes out of this
// hook via the same applyTripFrame() the export renderer uses, so preview
// and export can never drift apart.
export function useTripPlayer(trip: Trip) {
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
