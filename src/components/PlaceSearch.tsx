"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode";

export default function PlaceSearch({
  onSelect,
}: {
  onSelect: (result: GeocodeResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const showDropdown =
    !dismissed && query.trim() !== "" && (loading || results.length > 0 || !!error);

  useEffect(() => {
    if (!query.trim()) return;

    const timeout = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      searchPlaces(query, controller.signal)
        .then((r) => setResults(r))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResults([]);
          setError("Search unavailable — check your connection.");
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelect(result: GeocodeResult) {
    onSelect(result);
    setQuery("");
    setResults([]);
    setDismissed(true);
  }

  return (
    <div className="relative w-72">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setDismissed(false);
        }}
        onFocus={() => setDismissed(false)}
        onBlur={() => setTimeout(() => setDismissed(true), 150)}
        placeholder="Search a place to pin…"
        className="w-full rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-sm shadow focus:outline-none focus:ring-2 focus:ring-pink-400 dark:border-zinc-700 dark:bg-black/80 dark:text-zinc-100"
      />
      {loading && (
        <div className="absolute right-3 top-2.5 text-xs text-zinc-400">
          …
        </div>
      )}
      {showDropdown && error && (
        <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
      )}
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white/95 shadow dark:border-zinc-700 dark:bg-black/90">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-pink-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
