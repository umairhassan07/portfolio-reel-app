// Trending audio categories — royalty-free tracks organized by Instagram/TikTok vibes
// Spotify trending names shown as hints, royalty-free versions play

export const TRENDING_CATEGORIES = [
  {
    id: "phonk",
    label: "🔥 Phonk / Drill",
    vibe: "Dark, aggressive, viral TikTok style",
    color: "#ff4444",
    gradient: "linear-gradient(135deg, #1a0a0a, #3a0a0a)",
    spotifyHints: ["Astronomia", "Cruel Summer", "Hood Melody"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", title: "Dark Energy", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", title: "Drill Beat", artist: "SoundHelix" },
    ],
  },
  {
    id: "lofi",
    label: "✨ Lo-Fi Chill",
    vibe: "Aesthetic, study vibes, Instagram chill",
    color: "#a78bfa",
    gradient: "linear-gradient(135deg, #0f0a1a, #1a0f2e)",
    spotifyHints: ["lofi hip hop", "Chill Vibes", "Tokyo Nights"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", title: "Lo-Fi Dreams", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", title: "Chill Study", artist: "SoundHelix" },
    ],
  },
  {
    id: "tech",
    label: "💻 Tech / Dev",
    vibe: "Clean, modern, developer portfolio vibes",
    color: "#6C63FF",
    gradient: "linear-gradient(135deg, #0a0a1a, #0f0f2e)",
    spotifyHints: ["Techno Flow", "Code Mode", "Digital Wave"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", title: "Tech Pulse", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3", title: "Digital Flow", artist: "SoundHelix" },
    ],
  },
  {
    id: "motivational",
    label: "💪 Motivational",
    vibe: "Hype, energy, gym & hustle culture",
    color: "#f97316",
    gradient: "linear-gradient(135deg, #1a0f0a, #2e1a0a)",
    spotifyHints: ["Eye of the Tiger", "Power", "Champion"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", title: "Rise Up", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", title: "Hustle Mode", artist: "SoundHelix" },
    ],
  },
  {
    id: "cinematic",
    label: "🎬 Cinematic",
    vibe: "Epic, dramatic, storytelling reels",
    color: "#22d3ee",
    gradient: "linear-gradient(135deg, #0a1a1a, #0a2030)",
    spotifyHints: ["Interstellar Theme", "Hans Zimmer", "Epic Score"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", title: "Epic Scene", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", title: "Cinematic Rise", artist: "SoundHelix" },
    ],
  },
  {
    id: "aesthetic",
    label: "🌸 Aesthetic",
    vibe: "Soft, lifestyle, beauty & fashion reels",
    color: "#f472b6",
    gradient: "linear-gradient(135deg, #1a0a14, #2a0a1e)",
    spotifyHints: ["Aesthetic Vibes", "Soft Girl Era", "Golden Hour"],
    tracks: [
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", title: "Soft Glow", artist: "SoundHelix" },
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3", title: "Golden Hour", artist: "SoundHelix" },
    ],
  },
];

// Auto-detect category from video context
export function detectCategory(projectName = "", tagline = "", description = "") {
  const text = `${projectName} ${tagline} ${description}`.toLowerCase();

  if (text.match(/code|dev|tech|web|app|software|react|javascript|programming/)) return "tech";
  if (text.match(/motivat|hustle|grind|success|achieve|power|energy|gym|fitness/)) return "motivational";
  if (text.match(/cinematic|epic|story|drama|film|movie|journey/)) return "cinematic";
  if (text.match(/aesthetic|beauty|fashion|lifestyle|minimal|soft|elegant/)) return "aesthetic";
  if (text.match(/chill|relax|calm|study|lofi|lo-fi|ambient|peace/)) return "lofi";
  if (text.match(/drill|phonk|dark|hard|trap|bass/)) return "phonk";

  return "tech"; // default for portfolio reels
}

export function getCategoryById(id) {
  return TRENDING_CATEGORIES.find((c) => c.id === id) || TRENDING_CATEGORIES[2];
}

export function getTrackForCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  const track = cat.tracks[Math.floor(Math.random() * cat.tracks.length)];
  return { ...track, category: cat.label };
}
