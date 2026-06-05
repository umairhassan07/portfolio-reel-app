import { detectCategory, getTrackForCategory, getCategoryById } from "./trendingAudio.js";

const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "b6747d04";

// SoundHelix — completely free, CORS-enabled, no restrictions
const FALLBACK_TRACKS = {
  upbeat:    { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",  title: "Upbeat Track",    artist: "SoundHelix" },
  calm:      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",  title: "Calm Ambient",    artist: "SoundHelix" },
  cinematic: { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",  title: "Cinematic",       artist: "SoundHelix" },
  happy:     { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",  title: "Happy Vibes",     artist: "SoundHelix" },
  corporate: { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", title: "Corporate",       artist: "SoundHelix" },
  default:   { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",  title: "Background",      artist: "SoundHelix" },
};

function pickFallback(query) {
  const q = query.toLowerCase();
  if (q.includes("epic") || q.includes("cinematic") || q.includes("dramatic")) return FALLBACK_TRACKS.cinematic;
  if (q.includes("calm") || q.includes("ambient") || q.includes("chill") || q.includes("relax")) return FALLBACK_TRACKS.calm;
  if (q.includes("happy") || q.includes("fun") || q.includes("positive")) return FALLBACK_TRACKS.happy;
  if (q.includes("corporate") || q.includes("professional") || q.includes("business")) return FALLBACK_TRACKS.corporate;
  if (q.includes("upbeat") || q.includes("tech") || q.includes("modern") || q.includes("energy")) return FALLBACK_TRACKS.upbeat;
  return FALLBACK_TRACKS.default;
}

export async function searchPixabayAudio(query, videoContext = {}) {
  // Detect category from query + video context
  const categoryId = detectCategory(
    videoContext.projectName || query,
    videoContext.tagline || "",
    videoContext.description || ""
  );
  const track = getTrackForCategory(categoryId);
  console.log(`[Trending Audio] Category: ${categoryId} → ${track.title}`);
  return track;
}

// Auto-pick music based on video content (called by AI)
export async function autoPickMusic(projectName, tagline, description) {
  const categoryId = detectCategory(projectName, tagline, description);
  const track = getTrackForCategory(categoryId);
  console.log(`[Auto Music] Detected: ${categoryId} → ${track.title}`);
  return track;
}
