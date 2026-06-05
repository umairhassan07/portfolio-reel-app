/**
 * Remotion Lambda cloud render helper.
 *
 * Setup (one-time):
 *   1. Add AWS credentials to .env:
 *        VITE_AWS_REGION=us-east-1
 *        VITE_REMOTION_LAMBDA_FUNCTION_NAME=remotion-render-4-0-...
 *        VITE_REMOTION_SERVE_URL=https://your-site.s3.amazonaws.com/index.html
 *   2. Deploy the function once:  npx remotion lambda functions deploy
 *   3. Deploy the site once:       npx remotion lambda sites create src/index.js
 *
 * After that, renderOnLambda() works from the browser via the Remotion Lambda SDK.
 */

// Dynamically imported so Vite doesn't bundle this Node.js-only module.
// eslint-disable-next-line no-unused-vars
let _lambdaClient = null;
async function getLambdaClient() {
  if (!_lambdaClient) _lambdaClient = await import("@remotion/lambda/client");
  return _lambdaClient;
}

const AWS_REGION         = import.meta.env.VITE_AWS_REGION         || "us-east-1";
const FUNCTION_NAME      = import.meta.env.VITE_REMOTION_LAMBDA_FUNCTION_NAME;
const SERVE_URL          = import.meta.env.VITE_REMOTION_SERVE_URL;

// Composition IDs that match Root.jsx
export const FORMAT_COMPOSITION = {
  "9:16": "PortfolioReel",
  "16:9": "PortfolioReel_16x9",
  "1:1":  "PortfolioReel_1x1",
};

/**
 * @param {object} inputProps   — full video state from videoStore
 * @param {"9:16"|"16:9"|"1:1"} format
 * @param {(progress: number) => void} onProgress  — 0–100
 * @returns {Promise<string>}   — public S3 URL of the rendered MP4
 */
export async function renderOnLambda(inputProps, format = "9:16", onProgress) {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error(
      "Lambda not configured. Add VITE_REMOTION_LAMBDA_FUNCTION_NAME and VITE_REMOTION_SERVE_URL to your .env file."
    );
  }

  const compositionId = FORMAT_COMPOSITION[format];

  const { renderMediaOnLambda, getRenderProgress } = await getLambdaClient();

  const { renderId, bucketName } = await renderMediaOnLambda({
    region: AWS_REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    compositionId,
    inputProps,
    codec: "h264",
    imageFormat: "jpeg",
    maxRetries: 1,
    framesPerLambda: 40,
    privacy: "public",
  });

  // Poll progress
  while (true) {
    await new Promise((r) => setTimeout(r, 1500));
    const { getRenderProgress: getProgress } = await getLambdaClient();
    const progress = await getProgress({ renderId, bucketName, functionName: FUNCTION_NAME, region: AWS_REGION });

    if (progress.fatalErrorEncountered) {
      throw new Error(progress.errors?.[0]?.message ?? "Lambda render failed");
    }

    const pct = Math.round((progress.overallProgress ?? 0) * 100);
    onProgress?.(pct);

    if (progress.done) {
      return progress.outputFile;
    }
  }
}
