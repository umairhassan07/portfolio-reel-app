const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;

export async function searchPexels(query, count = 1) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );

  if (!res.ok) throw new Error(`Pexels error: ${res.status}`);

  const data = await res.json();
  if (!data.photos || data.photos.length === 0) throw new Error(`No images found for "${query}"`);

  // Return portrait/large2x URLs — best quality for 9:16
  return data.photos.map((p) => ({
    url: p.src.large2x,
    photographer: p.photographer,
    alt: p.alt || query,
  }));
}
