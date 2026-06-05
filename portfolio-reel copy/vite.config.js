import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { spawn } from "child_process";
import { createReadStream, existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";
import { join } from "path";

// Find the remotion binary
function getRemotionCommand() {
  // On macOS/Linux, node_modules/.bin/remotion is a shell script — must use shell:true
  // Use node directly to run the CLI entry point for reliability
  const cliEntry = resolve("node_modules/@remotion/cli/dist/index.js");
  if (existsSync(cliEntry)) {
    return { cmd: process.execPath, args: [cliEntry], useShell: false };
  }
  // fallback: shell wrapper
  const localBin = resolve("node_modules/.bin/remotion");
  if (existsSync(localBin)) {
    return { cmd: localBin, args: [], useShell: true };
  }
  // last resort: npx
  return { cmd: "npx", args: ["remotion"], useShell: true };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "remotion-render-api",
      configureServer(server) {

        // ── POST /api/render — start render, stream SSE progress ──
        server.middlewares.use("/api/render", (req, res) => {
          if (req.method === "OPTIONS") {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type");
            res.statusCode = 204;
            res.end();
            return;
          }
          if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }

          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            // SSE headers first — so client receives errors too
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.flushHeaders?.();

            const send = (data) => {
              try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
            };

            try {
              const { props, scale = 1, codec = "h264" } = JSON.parse(body);

              // Write props to temp JSON file (avoids shell quoting hell)
              const propsPath = join(tmpdir(), `remotion-props-${Date.now()}.json`);
              writeFileSync(propsPath, JSON.stringify(props));

              // Ensure output dir exists
              mkdirSync(resolve("out"), { recursive: true });
              const outPath = resolve("out/reel.mp4");

              const { cmd, args: binArgs, useShell } = getRemotionCommand();

              const args = [
                ...binArgs,
                "render",
                "PortfolioReel",
                outPath,
                `--codec=${codec}`,
                `--props=${propsPath}`,
                `--scale=${scale}`,
                "--log=verbose",
                "--overwrite",
              ];

              send({ log: `🎬 Starting render…`, progress: 0 });
              send({ log: `CMD: ${cmd} ${args.join(" ")}`, progress: 0 });

              let errored = false;

              const child = spawn(cmd, args, {
                shell: useShell,
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env, BROWSER: "none", FORCE_COLOR: "0", NO_COLOR: "1" },
              });

              const parseProgress = (text) => {
                const pct = text.match(/\((\d{1,3})%\)/);
                if (pct) return parseInt(pct[1]);
                const bare = text.match(/\b(\d{1,3})%/);
                if (bare) return parseInt(bare[1]);
                // "Rendering frame X of Y"
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
                send({ error: `Failed to start Remotion: ${err.message}. Make sure node_modules is installed (run: npm install).` });
                try { unlinkSync(propsPath); } catch {}
                res.end();
              });

              child.on("close", (code, signal) => {
                if (errored) return;
                try { unlinkSync(propsPath); } catch {}
                if (code === 0) {
                  send({ done: true, progress: 100, log: "✅ Render complete!" });
                } else if (signal) {
                  send({ error: `Process killed by signal: ${signal}. This usually means it ran out of memory.` });
                } else {
                  send({ error: `Remotion render failed (exit code ${code}). Check the log above for details.` });
                }
                res.end();
              });

              req.on("close", () => { try { child.kill(); } catch {} });

            } catch (err) {
              send({ error: `Server error: ${err.message}` });
              res.end();
            }
          });
        });

        // ── GET /api/download — serve rendered file ──
        server.middlewares.use("/api/download", (req, res) => {
          const outPath = resolve("out/reel.mp4");
          if (!existsSync(outPath)) {
            res.statusCode = 404;
            res.end("Rendered file not found. Export first.");
            return;
          }
          res.setHeader("Content-Disposition", 'attachment; filename="reel.mp4"');
          res.setHeader("Content-Type", "video/mp4");
          createReadStream(outPath).pipe(res);
        });
      },
    },
  ],
});
