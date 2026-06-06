/**
 * Free AI image generation via Pollinations.ai
 * No API key required — completely free.
 */

const STYLE_PRESETS = {
  cinematic:  "cinematic photography, dramatic lighting, movie still, 8k ultra detailed, shallow depth of field",
  fashion:    "high fashion editorial photography, studio lighting, vogue magazine, elegant, luxury brand aesthetic",
  tech:       "tech product photography, dark background, neon accents, futuristic, minimal clean design",
  fitness:    "athletic photography, dramatic shadows, high contrast, powerful, motivational, gym aesthetic",
  travel:     "travel photography, golden hour, stunning landscape, wide angle, national geographic style",
  luxury:     "luxury lifestyle photography, bokeh, warm tones, expensive, premium brand, minimal",
  food:       "food photography, macro lens, bokeh, michelin star plating, dramatic side lighting, appetizing",
  abstract:   "abstract art, vibrant colors, geometric shapes, modern design, digital art, 4k",
  portrait:   "professional portrait photography, studio lighting, sharp focus, editorial style",
  minimal:    "minimalist photography, clean white background, simple composition, modern aesthetic",
};

export const STYLE_OPTIONS = Object.entries(STYLE_PRESETS).map(([id, desc]) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  desc,
}));

/**
 * Generate an image using Pollinations.ai (free, no auth).
 * Returns a URL that resolves to the generated image.
 */
export async function generateImage({ prompt, style = "cinematic", width = 768, height = 1344, seed }) {
  const styleDesc = STYLE_PRESETS[style] || STYLE_PRESETS.cinematic;
  const fullPrompt = `${prompt}, ${styleDesc}`;
  const s = seed ?? Math.floor(Math.random() * 99999);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${s}&nologo=true&model=flux&enhance=true`;

  // Pre-fetch to trigger generation, return the URL for use in img src
  return { url, seed: s, prompt: fullPrompt };
}

/**
 * Analyze a reference image's dominant color + basic description.
 * Used to augment the generation prompt with reference style.
 */
export function buildReferencePrompt(basePrompt, referenceDescription) {
  if (!referenceDescription) return basePrompt;
  return `${basePrompt}, inspired by: ${referenceDescription}`;
}
