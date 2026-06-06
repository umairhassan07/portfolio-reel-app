/**
 * Music categories — organized by Instagram / TikTok vibe.
 * Tracks are fetched live from Jamendo API when a category is opened.
 */

const JAMENDO_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID || "b6747d04";

export const TRENDING_CATEGORIES = [
  {
    id: "phonk",
    label: "🔥 Phonk / Trap",
    vibe: "Dark, aggressive, viral TikTok drill style",
    color: "#ff4444",
    gradient: "linear-gradient(135deg, #1a0808, #3a0a0a)",
    jamendoTags: "hiphop electronic dark",
    spotifyHints: ["Astronomia Remix", "Hood Melody", "Dark Phonk"],
    tracks: [],
  },
  {
    id: "lofi",
    label: "✨ Lo-Fi Chill",
    vibe: "Aesthetic, study vibes, Instagram chill",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg, #0f0a1a, #1a0f2e)",
    jamendoTags: "lounge ambient chill",
    spotifyHints: ["Lo-Fi Hip Hop", "Tokyo Nights", "Chill Study Beats"],
    tracks: [],
  },
  {
    id: "tech",
    label: "💻 Tech / Electronic",
    vibe: "Clean, modern, developer & product vibes",
    color: "#5B8DEF",
    gradient: "linear-gradient(135deg, #080e1a, #0f1628)",
    jamendoTags: "electronic techno house",
    spotifyHints: ["Techno Flow", "Digital Wave", "Code Mode"],
    tracks: [],
  },
  {
    id: "motivational",
    label: "💪 Motivational / Epic",
    vibe: "Hype, energy, gym & hustle culture",
    color: "#FF3D00",
    gradient: "linear-gradient(135deg, #1a0800, #2e1000)",
    jamendoTags: "rock epic motivational",
    spotifyHints: ["Eye of the Tiger", "Power", "Champion"],
    tracks: [],
  },
  {
    id: "cinematic",
    label: "🎬 Cinematic / Epic",
    vibe: "Dramatic, storytelling, travel & fashion reels",
    color: "#00C9FF",
    gradient: "linear-gradient(135deg, #001a20, #002030)",
    jamendoTags: "cinematic orchestral epic",
    spotifyHints: ["Hans Zimmer Inspired", "Epic Score", "Cinematic Rise"],
    tracks: [],
  },
  {
    id: "aesthetic",
    label: "🌸 Aesthetic / Fashion",
    vibe: "Soft, lifestyle, beauty & fashion Instagram reels",
    color: "#E8C4A0",
    gradient: "linear-gradient(135deg, #1a0e0a, #2a1810)",
    jamendoTags: "pop soul rnb",
    spotifyHints: ["Golden Hour", "Soft Girl Era", "Summer Aesthetic"],
    tracks: [],
  },
  {
    id: "luxury",
    label: "👑 Luxury / Ambient",
    vibe: "Sophisticated, minimal, high-end brand feel",
    color: "#D4AF37",
    gradient: "linear-gradient(135deg, #100e00, #1a1500)",
    jamendoTags: "ambient jazz classical",
    spotifyHints: ["Prestige", "Velvet Room", "Gold Standard"],
    tracks: [],
  },
  {
    id: "pop",
    label: "🎵 Pop / Upbeat",
    vibe: "Fun, catchy, viral potential — Instagram Reels energy",
    color: "#FF6B9D",
    gradient: "linear-gradient(135deg, #1a0810, #2a0818)",
    jamendoTags: "pop electropop dance",
    spotifyHints: ["Viral Pop Hit", "Dance Floor", "Good Vibes Only"],
    tracks: [],
  },
];

// ── Fetch live tracks from Jamendo for a category ───────────────
const _cache = {};

export async function fetchCategoryTracks(categoryId, limit = 6) {
  if (_cache[categoryId]) return _cache[categoryId];

  const cat = TRENDING_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return [];

  try {
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_ID}&format=json&limit=${limit}&tags=${encodeURIComponent(cat.jamendoTags)}&order=popularity_total&audioformat=mp32&imagesize=100`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("Jamendo error");
    const data = await res.json();
    const tracks = (data.results || [])
      .filter(t => t.audio)
      .map(t => ({ url: t.audio, title: t.name, artist: t.artist_name, image: t.image }));
    _cache[categoryId] = tracks;
    return tracks;
  } catch {
    return [];
  }
}

// ── Auto-detect category from video context ──────────────────────
export function detectCategory(projectName = "", tagline = "", description = "") {
  const text = `${projectName} ${tagline} ${description}`.toLowerCase();
  if (text.match(/code|dev|tech|web|app|software|react|javascript|startup|saas/)) return "tech";
  if (text.match(/motivat|hustle|grind|gym|fitness|sport|warrior|champion|energy/)) return "motivational";
  if (text.match(/travel|adventure|mountain|ocean|nature|cinematic|dramatic|epic|journey/)) return "cinematic";
  if (text.match(/fashion|style|editorial|haute|beauty|lifestyle/)) return "aesthetic";
  if (text.match(/luxury|premium|gold|prestige|exclusive|elite|penthouse|yacht/)) return "luxury";
  if (text.match(/chill|relax|calm|lofi|lo-fi|ambient|minimal|soft/)) return "lofi";
  if (text.match(/drill|phonk|dark|trap|bass|hood|street/)) return "phonk";
  if (text.match(/pop|fun|happy|dance|viral|upbeat/)) return "pop";
  return "cinematic";
}

export function getCategoryById(id) {
  return TRENDING_CATEGORIES.find(c => c.id === id) || TRENDING_CATEGORIES[4];
}

export async function getTrackForCategory(categoryId) {
  const tracks = await fetchCategoryTracks(categoryId, 8);
  if (tracks.length) {
    const pick = tracks[Math.floor(Math.random() * Math.min(tracks.length, 4))];
    const cat = getCategoryById(categoryId);
    return { ...pick, category: cat.label };
  }
  // Hard fallback — silence (graceful)
  return { url: null, title: "No track found", artist: "", category: categoryId };
}
