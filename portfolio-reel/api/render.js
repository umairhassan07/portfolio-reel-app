/**
 * POST /api/render
 * Starts a Remotion Lambda render job.
 * Returns { renderId, bucketName } immediately — client polls /api/progress.
 *
 * Required env vars (set in Vercel dashboard):
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION
 *   REMOTION_LAMBDA_FUNCTION_NAME
 *   REMOTION_SERVE_URL
 */

import { renderMediaOnLambda } from "@remotion/lambda/client";

const REGION        = process.env.AWS_REGION || "us-east-1";
const FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
const SERVE_URL     = process.env.REMOTION_SERVE_URL;

export const config = { maxDuration: 30 }; // seconds — just starts the job

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!FUNCTION_NAME || !SERVE_URL) {
    return res.status(500).json({
      error: "Lambda not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL in Vercel env vars.",
    });
  }

  const { props, compositionId = "PortfolioReel", scale = 1 } = req.body;

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REGION,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      compositionId,
      inputProps: props,
      codec: "h264",
      imageFormat: "jpeg",
      maxRetries: 1,
      framesPerLambda: 40,
      privacy: "public",
      // Scale down resolution if needed
      ...(scale !== 1 && { scale }),
    });

    return res.status(200).json({ renderId, bucketName });
  } catch (err) {
    console.error("[render]", err);
    return res.status(500).json({ error: err.message });
  }
}
