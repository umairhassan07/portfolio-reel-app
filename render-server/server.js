import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { createReadStream, existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// Find the remotion binary
function getRemotionCommand() {
  const cliEntry = resolve(__dirname, "node_modules/@remotion/cli/dist/index.js");
  if (existsSync(cliEntry)) {
    return { cmd: process.execPath, args: [cliEntry], useShell: false };
  }
  const localBin = resolve(__dirname, "node_modules/.bin/remotion");
  if (existsSync(localBin)) {
    return { cmd: localBin, args: [], useShell: true };
  }
  return { cmd: "npx", args: ["remotion"], useShell: true };
}

// ── GET /health ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ── POST /api/render — SSE progress stream ────────────────────
app.post("/api/render", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  try {
    const { props, compositionId = "PortfolioReel", scale = 1, codec = "h264" } = req.body;

    const propsPath = join(tmpdir(), `remotion-props-${Date.now()}.json`);
    writeFileSync(propsPath, JSON.stringify(props));

    const outDir = resolve(__dirname, "out");
    mkdirSync(outDir, { recursive: true });

    const suffix =
      compositionId === "PortfolioReel"      ? "9x16" :
      compositionId === "PortfolioReel_16x9" ? "16x9" : "1x1";
    const outPath = resolve(outDir, `reel-${suffix}.mp4`);

    const { cmd, args: binArgs, useShell } = getRemotionCommand();

    const args = [
      ...binArgs,
      "render",
      compositionId,
      outPath,
      `--codec=${codec}`,
      `--props=${propsPath}`,
      `--scale=${scale}`,
      "--log=verbose",
      "--overwrite",
    ];

    send({ log: "🎬 Starting render…", progress: 0 });

    let errored = false;

    const child = spawn(cmd, args, {
      shell: useShell,
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none", FORCE_COLOR: "0", NO_COLOR: "1" },
    });

    const parseProgress = (text) => {
      const pct = text.match(/\((\d{1,3})%\)/);
      if (pct) return parseInt(pct[1]);
      const bare = text.match(/\b(\d{1,3})%/);
      if (bare) return parseInt(bare[1]);
      const frame = text.match(/frame\s+(\d+)\s+of\s+(\d+)/i);
      if (frame) return Math.round((parseInt(frame[1]) / parseInt(frame[2])) * 100);
      return null;
    };

    const handleOutput = (data) => {
      const text = data.toString().trim();
      if (!text) return;
      const progress = parseProgress(text);
      send({ log: text, ...(progress !== null ? { progress } : {}) });
    };

    child.stdout.on("data", handleOutput);
    child.stderr.on("data", handleOutput);

    child.on("error", (err) => {
      errored = true;
      send({ error: `Failed to start Remotion: ${err.message}` });
      try { unlinkSync(propsPath); } catch {}
      res.end();
    });

    child.on("close", (code, signal) => {
      if (errored) return;
      try { unlinkSync(propsPath); } catch {}
      if (code === 0) {
        send({ done: true, progress: 100, log: "✅ Render complete!", suffix });
      } else if (signal) {
        send({ error: `Process killed (${signal}) — likely out of memory.` });
      } else {
        send({ error: `Render failed (exit code ${code}). Check logs above.` });
      }
      res.end();
    });

    req.on("close", () => { try { child.kill(); } catch {} });

  } catch (err) {
    send({ error: `Server error: ${err.message}` });
    res.end();
  }
});

// ── GET /api/download?suffix=9x16 ────────────────────────────
app.get("/api/download", (req, res) => {
  const suffix = req.query.suffix || "9x16";
  const outPath = resolve(__dirname, "out", `reel-${suffix}.mp4`);
  if (!existsSync(outPath)) {
    return res.status(404).send("File not found — render first.");
  }
  res.setHeader("Content-Disposition", `attachment; filename="reel-${suffix}.mp4"`);
  res.setHeader("Content-Type", "video/mp4");
  createReadStream(outPath).pipe(res);
});

// ── POST /api/generate-image ──────────────────────────────────
// Uses Qwen Wanx image generation (fast, cheap ~$0.008/image)
app.post("/api/generate-image", async (req, res) => {
  const { prompt, seed = Math.floor(Math.random() * 99999) } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "QWEN_API_KEY not set on Railway" });

  try {
    // Qwen Wanx — native DashScope API (compatible-mode doesn't support Wanx)
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "wanx2.1-t2i-turbo",
        input: { prompt },
        parameters: {
          size: "576*1024",  // 9:16 portrait
          n: 1,
          seed,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[generate-image] Qwen error:", response.status, text);
      return res.status(response.status).json({ error: `Qwen API error ${response.status}: ${text.slice(0, 300)}` });
    }

    const data = await response.json();
    console.log("[generate-image] Qwen response:", JSON.stringify(data).slice(0, 200));

    const imageUrl = data?.output?.results?.[0]?.url;
    if (!imageUrl) return res.status(500).json({ error: "No image URL in response", raw: data });

    // Fetch the image and convert to base64 so the browser can display it
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

    return res.json({ image: `data:${contentType};base64,${base64}`, seed });
  } catch (err) {
    console.error("[generate-image] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Render server running on port ${PORT}`);
});
