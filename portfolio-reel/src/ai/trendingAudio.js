/**
 * Music library — organized by Instagram / TikTok vibe.
 * Primary: Jamendo API (royalty-free, real artists)
 * Fallback: curated tracks from Pixabay Music CDN & Mixkit
 */

// ── Curated fallback tracks ──────────────────────────────────────
// All URLs are royalty-free CDN tracks verified to play in browser.
export const TRENDING_CATEGORIES = [
  {
    id: "phonk",
    label: "🔥 Phonk / Trap",
    vibe: "Dark, aggressive, viral TikTok drill style",
    color: "#ff4444",
    jamendoTags: "hiphop darkambient electronic",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b07b444.mp3", title: "Dark Phonk", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/03/10/audio_2d0b82349c.mp3", title: "Trap Rage", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_cb8e9e6b86.mp3", title: "Drill Night", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3", title: "Hood Energy", artist: "Pixabay" },
    ],
  },
  {
    id: "lofi",
    label: "✨ Lo-Fi Chill",
    vibe: "Aesthetic, study vibes, Instagram chill",
    color: "#a78bfa",
    jamendoTags: "lounge ambient chill",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3", title: "Lo-Fi Dreams", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769b.mp3", title: "Tokyo Nights", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_0ab3e9d695.mp3", title: "Chill Afternoon", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3", title: "Aesthetic Mood", artist: "Pixabay" },
    ],
  },
  {
    id: "tech",
    label: "💻 Tech / Electronic",
    vibe: "Clean, modern, developer & product vibes",
    color: "#5B8DEF",
    jamendoTags: "electronic techno house",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/08/23/audio_d16737dc28.mp3", title: "Digital Rush", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/10/19/audio_a3b9a11cc7.mp3", title: "Tech Pulse", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3", title: "Code Mode", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3", title: "Neon Grid", artist: "Pixabay" },
    ],
  },
  {
    id: "motivational",
    label: "💪 Motivational / Epic",
    vibe: "Hype, energy, gym & hustle culture",
    color: "#FF3D00",
    jamendoTags: "rock epic motivational",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/04/27/audio_67f2e66b0d.mp3", title: "Rise Up", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/10/28/audio_3c0ee64d04.mp3", title: "Champion", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/11/04/audio_cb8f89f94d.mp3", title: "No Limits", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/09/07/audio_124bfae6b3.mp3", title: "Beast Mode", artist: "Pixabay" },
    ],
  },
  {
    id: "cinematic",
    label: "🎬 Cinematic / Epic",
    vibe: "Dramatic, storytelling, travel & fashion reels",
    color: "#00C9FF",
    jamendoTags: "cinematic orchestral epic",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/01/21/audio_d0fd6a5157.mp3", title: "Cinematic Dawn", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/10/05/audio_50e6e8e2af.mp3", title: "Epic Journey", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/08/31/audio_52c64ea8d3.mp3", title: "Dramatic Rise", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/03/28/audio_05cba2a43e.mp3", title: "Movie Trailer", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/04/14/audio_5f1da7bde3.mp3", title: "Grand Odyssey", artist: "Pixabay" },
    ],
  },
  {
    id: "aesthetic",
    label: "🌸 Aesthetic / Fashion",
    vibe: "Soft, lifestyle, beauty & fashion Instagram reels",
    color: "#E8C4A0",
    jamendoTags: "pop rnb soul",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/06/10/audio_33c566d13e.mp3", title: "Golden Hour", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/11/25/audio_2e72f31b87.mp3", title: "Soft Girl Era", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/10/11/audio_e4be7e1c0a.mp3", title: "Summer Vibes", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/02/11/audio_a347dc0aac.mp3", title: "Pink Aesthetic", artist: "Pixabay" },
    ],
  },
  {
    id: "luxury",
    label: "👑 Luxury / Ambient",
    vibe: "Sophisticated, minimal, high-end brand feel",
    color: "#D4AF37",
    jamendoTags: "ambient classical jazz",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/09/18/audio_6e57e0d9ef.mp3", title: "Prestige", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3", title: "Elegance", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/07/26/audio_fc8de6df68.mp3", title: "Gold Standard", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/05/16/audio_5be36da0de.mp3", title: "Velvet Room", artist: "Pixabay" },
    ],
  },
  {
    id: "pop",
    label: "🎵 Pop / Upbeat",
    vibe: "Fun, catchy, viral potential — Instagram Reels energy",
    color: "#FF6B9D",
    jamendoTags: "pop electropop dance",
    tracks: [
      { url: "https://cdn.pixabay.com/download/audio/2022/10/09/audio_9be53db0c7.mp3", title: "Happy Energy", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/06/06/audio_c3c6f51b2b.mp3", title: "Viral Pop", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2021/12/09/audio_f31ec65b63.mp3", title: "Upbeat Summer", artist: "Pixabay" },
      { url: "https://cdn.pixabay.com/download/audio/2022/08/04/audio_2dde668d05.mp3", title: "Good Vibes Only", artist: "Pixabay" },
    ],
  },
];

export function detectCategory(projectName = "", tagline = "", description = "") {
  const text = `${projectName} ${tagline} ${description}`.toLowerCase();
  if (text.match(/code|dev|tech|web|app|software|react|javascript|programming|startup|saas/)) return "tech";
  if (text.match(/motivat|hustle|grind|success|achieve|power|energy|gym|fitness|sport|warrior|champion/)) return "motivational";
  if (text.match(/travel|adventure|landscape|journey|explore|mountain|ocean|nature|cinematic|dramatic|epic|story/)) return "cinematic";
  if (text.match(/fashion|style|elegance|luxury|prestige|gold|premium|exclusive|haute|editorial/)) return "aesthetic";
  if (text.match(/luxury|premium|gold|prestige|exclusive|elite|penthouse|watch|yacht/)) return "luxury";
  if (text.match(/chill|relax|calm|study|lofi|lo-fi|ambient|peace|aesthetic|minimal|soft/)) return "lofi";
  if (text.match(/drill|phonk|dark|hard|trap|bass|hood|street/)) return "phonk";
  if (text.match(/pop|fun|happy|dance|party|viral|reel|energy|upbeat/)) return "pop";
  return "cinematic";
}

export function getCategoryById(id) {
  return TRENDING_CATEGORIES.find((c) => c.id === id) || TRENDING_CATEGORIES[4];
}

export function getTrackForCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  const track = cat.tracks[Math.floor(Math.random() * cat.tracks.length)];
  return { ...track, category: cat.label };
}
