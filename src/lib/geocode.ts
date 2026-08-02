export interface GeocodeResult {
  id: string;
  label: string;
  lng: number;
  lat: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

// Public Photon demo instance — fine for a prototype, but it's rate-limited
// and non-commercial per komoot's usage policy. Self-host photon
// (github.com/komoot/photon) before this sees real traffic.
const PHOTON_URL = "https://photon.komoot.io/api/";

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "5");

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon request failed: ${res.status}`);
  const data: PhotonResponse = await res.json();

  return (data.features ?? []).map((feature, index) => {
    const [lng, lat] = feature.geometry.coordinates;
    const { name, city, state, country } = feature.properties ?? {};
    const label =
      [name, city, state, country].filter(
        (part, i, arr) => part && arr.indexOf(part) === i,
      ).join(", ") || "Unnamed place";
    return { id: `${lng},${lat},${index}`, label, lng, lat };
  });
}
