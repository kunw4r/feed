// Per-track identity for tiles and heroes: an accent hue (for the typographic
// covers of tracks without a photo) and the lucide icon name from the index.
// Plain module so server and client components can both use it.
export const TRACK_ACCENTS: Record<string, string> = {
  finance: "#0d9488",
  photography: "#d97706",
  coding: "#0284c7",
  gym: "#dc2626",
  psychology: "#7c3aed",
  writing: "#a16207",
  cooking: "#ea580c",
  geography: "#0891b2",
  mathematics: "#4f46e5",
  "music-theory": "#db2777",
  "public-speaking": "#9333ea",
};

export const trackAccent = (slug: string) => TRACK_ACCENTS[slug] ?? "#d9481f";

/** Warm stone gradient with a whisper of the track's accent in one corner. */
export const coverGradient = (slug: string) =>
  `linear-gradient(140deg, #1c1917 0%, #292524 48%, ${trackAccent(slug)} 150%)`;
