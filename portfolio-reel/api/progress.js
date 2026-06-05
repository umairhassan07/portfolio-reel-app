/**
 * GET /api/progress?renderId=...&bucketName=...
 * Polls Remotion Lambda for render progress.
 * Returns { progress, done, outputUrl?, error? }
 */

import { getRenderProgress } from "@remotion/lambda/client";

const REGION        = process.env.AWS_REGION || "us-east-1";
const FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME;

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { renderId, bucketName } = req.query;

  if (!renderId || !bucketName) {
    return res.status(400).json({ error: "Missing renderId or bucketName" });
  }

  if (!FUNCTION_NAME) {
    return res.status(500).json({ error: "Lambda not configured" });
  }

  try {
    const result = await getRenderProgress({
      renderId,
      bucketName,
      functionName: FUNCTION_NAME,
      region: REGION,
    });

    if (result.fatalErrorEncountered) {
      return res.status(200).json({
        progress: 0,
        done: false,
        error: result.errors?.[0]?.message ?? "Render failed",
      });
    }

    return res.status(200).json({
      progress: Math.round((result.overallProgress ?? 0) * 100),
      done: result.done,
      outputUrl: result.done ? result.outputFile : null,
    });
  } catch (err) {
    console.error("[progress]", err);
    return res.status(500).json({ error: err.message });
  }
}
