/**
 * POST /api/generate-image
 * Proxies to Hugging Face Inference API — keeps HF_TOKEN server-side.
 *
 * Setup: add HF_TOKEN to Vercel environment variables.
 * Get a free token at: https://huggingface.co/settings/tokens
 */

export const config = { maxDuration: 60 };

const MODELS = [
  "black-forest-labs/FLUX.1-schnell",   // Fast, high quality
  "stabilityai/stable-diffusion-xl-base-1.0", // Fallback
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, seed = Math.floor(Math.random() * 99999) } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(500).json({ error: "HF_TOKEN not configured in Vercel env vars" });

  let lastError = "";

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              seed,
              width: 576,
              height: 1024,
              num_inference_steps: model.includes("FLUX") ? 4 : 20,
              guidance_scale: model.includes("FLUX") ? 0 : 7.5,
            },
          }),
          signal: AbortSignal.timeout(55000),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        lastError = `${model}: ${response.status} — ${text.slice(0, 200)}`;
        continue;
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return res.status(200).json({
        image: `data:${contentType};base64,${base64}`,
        model,
        seed,
      });
    } catch (err) {
      lastError = `${model}: ${err.message}`;
    }
  }

  return res.status(500).json({ error: `All models failed. Last error: ${lastError}` });
}
