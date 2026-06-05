// Spotify API — get trending track names as hints
// Add your keys to .env: VITE_SPOTIFY_CLIENT_ID, VITE_SPOTIFY_CLIENT_SECRET

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
  });
  if (!res.ok) return null;
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

// Get trending track names for a category/mood
export async function getTrendingNames(query, limit = 5) {
  try {
    const token = await getToken();
    if (!token) return [];

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.tracks?.items?.map((t) => `${t.name} — ${t.artists[0]?.name}`) || [];
  } catch {
    return [];
  }
}
