/**
 * AI image generation via Hugging Face Inference API (free tier).
 * Requests are proxied through /api/generate-image to keep HF_TOKEN server-side.
 *
 * Free token: https://huggingface.co/settings/tokens
 * Add HF_TOKEN to Vercel environment variables.
 */

const STYLE_PRESETS = {
  cinematic:  "cinematic photography, dramatic lighting, movie still, ultra detailed, shallow depth of field",
  fashion:    "high fashion editorial photography, studio lighting, vogue magazine, elegant luxury brand",
  tech:       "tech product photography, dark background, neon accents, futuristic, minimal clean design",
  fitness:    "athletic photography, dramatic shadows, high contrast, powerful motivational gym aesthetic",
  travel:     "travel photography, golden hour, stunning landscape, wide angle, national geographic style",
  luxury:     "luxury lifestyle photography, bokeh, warm tones, expensive premium brand minimal",
  food:       "food photography, macro lens, bokeh, michelin star plating, dramatic side lighting",
  abstract:   "abstract digital art, vibrant colors, geometric shapes, modern design",
  portrait:   "professional portrait photography, studio lighting, sharp focus, editorial style",
  minimal:    "minimalist photography, clean background, simple composition, modern aesthetic",
};

export const STYLE_OPTIONS = Object.entries(STYLE_PRESETS).map(([id, desc]) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  desc,
}));

/**
 * Generate an image.
 * Returns { url: "data:image/jpeg;base64,...", seed, prompt }
 */
export async function generateImage({ prompt, style = "cinematic", seed }) {
  const styleDesc = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic;
  const fullPrompt = `${prompt}, ${styleDesc}`;
  const s = seed ?? Math.floor(Math.random() * 99999);

  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: fullPrompt, seed: s }),
  });

  const data = await res.json();
  if (!res.ok || !data.image) {
    throw new Error(data.error || `Generation failed (${res.status})`);
  }

  return { url: data.image, seed: data.seed ?? s, prompt: fullPrompt };
}

export function buildReferencePrompt(basePrompt, referenceDescription) {
  if (!referenceDescription) return basePrompt;
  return `${basePrompt}, inspired by: ${referenceDescription}`;
}
