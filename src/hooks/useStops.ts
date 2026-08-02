"use client";

import { useCallback, useSyncExternalStore } from "react";
import { loadStops, saveStops } from "@/lib/storage";
import type { Stop } from "@/lib/types";

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `stop-${Date.now()}-${idCounter}`;
}

const CHANGE_EVENT = "travel-animator:stops-changed";

// Module-level cache backing useSyncExternalStore's snapshot. Fine here
// since only one component tree (the Home page) consumes this hook.
let cachedStops: Stop[] | null = null;

function getSnapshot(): Stop[] {
  cachedStops ??= loadStops();
  return cachedStops;
}

// Must be a stable reference — a new array each call reads as "changed"
// on every render and triggers an infinite update loop.
const EMPTY_STOPS: Stop[] = [];
function getServerSnapshot(): Stop[] {
  return EMPTY_STOPS;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function commit(next: Stop[]) {
  cachedStops = next;
  saveStops(next);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useStops() {
  const stops = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addStop = useCallback(
    (lng: number, lat: number, name = "New stop") => {
      commit([...getSnapshot(), { id: makeId(), name, lng, lat }]);
    },
    [],
  );

  const moveStop = useCallback((id: string, lng: number, lat: number) => {
    commit(
      getSnapshot().map((s) => (s.id === id ? { ...s, lng, lat } : s)),
    );
  }, []);

  const renameStop = useCallback((id: string, name: string) => {
    commit(getSnapshot().map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const removeStop = useCallback((id: string) => {
    commit(getSnapshot().filter((s) => s.id !== id));
  }, []);

  return { stops, addStop, moveStop, renameStop, removeStop };
}
