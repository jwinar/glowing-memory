import GlobeMap from "@/components/GlobeMap";

export default function Home() {
  return (
    <div className="relative h-dvh w-dvw">
      <GlobeMap />
      <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-zinc-800 shadow dark:bg-black/70 dark:text-zinc-100">
        Travel Animator — prototype
      </div>
    </div>
  );
}
