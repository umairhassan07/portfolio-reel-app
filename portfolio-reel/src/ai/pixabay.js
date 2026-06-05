import { detectCategory, getTrackForCategory, getCategoryById } from "./trendingAudio.js";

// Jamendo — free royalty-free music API with real artists
const JAMENDO_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "b6747d04";

/**
 * Search Jamendo for a real royalty-free track matching the mood.
 * Falls back to curated library if API fails or returns nothing.
 */
async function searchJamendo(tags, limit = 8) {
  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_ID}&format=json&limit=${limit}&tags=${encodeURIComponent(tags)}&order=popularity_total&audioformat=mp32&include=musicinfo&imagesize=200`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const tracks = (data.results || []).filter(t => t.audio);
    if (!tracks.length) return null;
    // Pick a random one from the top results for variety
    const pick = tracks[Math.floor(Math.random() * Math.min(tracks.length, 4))];
    return { url: pick.audio, title: pick.name, artist: pick.artist_name };
  } catch {
    return null;
  }
}

/**
 * Main audio search — called by AI with a mood/genre query.
 * Order of attempts:
 *   1. Jamendo API (real music, random pick from top results)
 *   2. Curated Pixabay/Mixkit library (by category)
 */
export async function searchPixabayAudio(query, videoContext = {}) {
  const categoryId = detectCategory(
    videoContext.projectName || query,
    videoContext.tagline || "",
    videoContext.description || ""
  );
  const cat = getCategoryById(categoryId);

  // Try Jamendo first
  const jamendoTrack = await searchJamendo(cat.jamendoTags);
  if (jamendoTrack) {
    console.log(`[Music] Jamendo: "${jamendoTrack.title}" by ${jamendoTrack.artist}`);
    return { ...jamendoTrack, category: cat.label };
  }

  // Fallback to curated library
  const fallback = getTrackForCategory(categoryId);
  console.log(`[Music] Fallback: "${fallback.title}" (${categoryId})`);
  return fallback;
}

export async function autoPickMusic(projectName, tagline, description) {
  return searchPixabayAudio("", { projectName, tagline, description });
}
