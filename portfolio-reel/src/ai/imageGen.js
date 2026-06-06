/**
 * Free AI image generation via Pollinations.ai
 * No API key required — completely free.
 */

const STYLE_PRESETS = {
  cinematic:  "cinematic photography, dramatic lighting, movie still, ultra detailed, shallow depth of field",
  fashion:    "high fashion editorial photography, studio lighting, vogue magazine, elegant, luxury brand",
  tech:       "tech product photography, dark background, neon accents, futuristic, minimal clean design",
  fitness:    "athletic photography, dramatic shadows, high contrast, powerful, motivational, gym aesthetic",
  travel:     "travel photography, golden hour, stunning landscape, wide angle, national geographic style",
  luxury:     "luxury lifestyle photography, bokeh, warm tones, expensive, premium brand, minimal",
  food:       "food photography, macro lens, bokeh, michelin star plating, dramatic side lighting",
  abstract:   "abstract digital art, vibrant colors, geometric shapes, modern design, 4k",
  portrait:   "professional portrait photography, studio lighting, sharp focus, editorial style",
  minimal:    "minimalist photography, clean background, simple composition, modern aesthetic",
};

export const STYLE_OPTIONS = Object.entries(STYLE_PRESETS).map(([id, desc]) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  desc,
}));

/**
 * Generate an image using Pollinations.ai (free, no auth).
 * Uses 576×1024 for faster generation while keeping 9:16 ratio.
 */
export async function generateImage({ prompt, style = "cinematic", seed }) {
  const styleDesc = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic;
  const fullPrompt = `${prompt}, ${styleDesc}`;
  const s = seed ?? Math.floor(Math.random() * 99999);
  // 576×1024 = 9:16, fast enough for preview
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=576&height=1024&seed=${s}&nologo=true`;
  return { url, seed: s, prompt: fullPrompt };
}

export function buildReferencePrompt(basePrompt, referenceDescription) {
  if (!referenceDescription) return basePrompt;
  return `${basePrompt}, inspired by: ${referenceDescription}`;
}
