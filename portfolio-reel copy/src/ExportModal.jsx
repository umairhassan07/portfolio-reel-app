import React, { useState, useRef, useEffect, useCallback } from "react";
import { Player } from "@remotion/player";
import { PortfolioReel } from "./compositions/PortfolioReel";

const ACC = "#6C63FF";

const RESOLUTIONS = [
  { label: "1080p", sublabel: "Full HD · 1080×1920", scale: 1, sizeMb: "~25 MB" },
  { label: "720p",  sublabel: "HD · 720×1280",       scale: 0.667, sizeMb: "~12 MB" },
  { label: "480p",  sublabel: "SD · 480×854",         scale: 0.444, sizeMb: "~6 MB"  },
];

function CircularProgress({ value }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ - (value / 100) * circ;
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
      <circle
        cx={45} cy={45} r={r} fill="none"
        stroke={ACC} strokeWidth={7}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x={45} y={49} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={700} fontFamily="Inter, sans-serif">
        {value}%
      </text>
    </svg>
  );
}

export default function ExportModal({ onClose, inputProps, totalDuration }) {
  const [resolution, setResolution] = useState(0); // index into RESOLUTIONS
  const [phase, setPhase] = useState("settings"); // "settings" | "rendering" | "done" | "error"
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const logsEndRef = useRef(null);

  const selectedRes = RESOLUTIONS[resolution];

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const startExport = useCallback(async () => {
    setPhase("rendering");
    setProgress(0);
    setLogs([]);
    setErrorMsg("");

    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          props: inputProps,
          scale: selectedRes.scale,
          codec: "h264",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.log)      setLogs((prev) => [...prev.slice(-80), msg.log]);
            if (msg.progress !== undefined) setProgress(msg.progress);
            if (msg.done)     setPhase("done");
            if (msg.error)  { setErrorMsg(msg.error); setPhase("error"); }
          } catch {}
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
      setPhase("error");
    }
  }, [inputProps, selectedRes]);

  const downloadFile = () => {
    const a = document.createElement("a");
    a.href = "/api/download";
    a.download = "reel.mp4";
    a.click();
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(6px)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{
        width: 760, maxWidth: "96vw", maxHeight: "92vh",
        background: "#13131f",
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${ACC}22`, border: `1px solid ${ACC}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
              ↗
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Export Video</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                {(totalDuration / 30).toFixed(1)}s · {totalDuration} frames · MP4
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* Left: Preview */}
          <div style={{
            width: 220, flexShrink: 0,
            background: "#0a0a14",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 20, gap: 12,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, textTransform: "uppercase" }}>Preview</div>
            <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
              <Player
                component={PortfolioReel}
                inputProps={inputProps}
                durationInFrames={totalDuration}
                fps={30}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: 140, height: 248 }}
                controls={false}
                loop
                autoPlay
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                {selectedRes.label} · {(totalDuration / 30).toFixed(1)}s
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                Est. {selectedRes.sizeMb}
              </div>
            </div>
          </div>

          {/* Right: Settings / Progress */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {phase === "settings" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Resolution */}
                <div>
                  <div style={sectionLabel}>Resolution</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {RESOLUTIONS.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => setResolution(i)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                          border: `1.5px solid ${resolution === i ? ACC : "rgba(255,255,255,0.08)"}`,
                          background: resolution === i ? `${ACC}12` : "rgba(255,255,255,0.03)",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${resolution === i ? ACC : "rgba(255,255,255,0.25)"}`,
                          background: resolution === i ? ACC : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {resolution === i && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: resolution === i ? "#fff" : "rgba(255,255,255,0.6)" }}>{r.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{r.sublabel}</div>
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{r.sizeMb}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Format (fixed MP4 for now) */}
                <div>
                  <div style={sectionLabel}>Format</div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 16px", borderRadius: 12,
                    border: `1.5px solid ${ACC}`,
                    background: `${ACC}12`,
                  }}>
                    <div style={{ fontSize: 22 }}>🎬</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>MP4 (H.264)</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Best compatibility · browser + mobile</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 5, background: `${ACC}33`, color: ACC, fontWeight: 700 }}>DEFAULT</div>
                  </div>
                </div>

                {/* Info note */}
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(255,200,0,0.05)",
                  border: "1px solid rgba(255,200,0,0.15)",
                  fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7,
                }}>
                  ⚡ Rendering uses your local machine via Remotion CLI. Make sure <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, color: "#fff" }}>npm run dev</code> is running.
                </div>

              </div>
            )}

            {(phase === "rendering" || phase === "done" || phase === "error") && (
              <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Progress indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 12 }}>
                  <CircularProgress value={progress} />
                  <div style={{ textAlign: "center" }}>
                    {phase === "rendering" && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Rendering…</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                          {selectedRes.label} · {(totalDuration / 30).toFixed(1)}s · MP4
                        </div>
                      </>
                    )}
                    {phase === "done" && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>✅ Done!</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Your reel is ready to download</div>
                      </>
                    )}
                    {phase === "error" && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>❌ Error</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, maxWidth: 240, textAlign: "center" }}>{errorMsg}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Linear progress bar */}
                {phase === "rendering" && (
                  <div style={{ width: "100%", height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: ACC, borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                )}

                {/* Log output */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Render Log</div>
                  <div style={{
                    background: "#07070f", borderRadius: 10, padding: "10px 14px",
                    height: 180, overflowY: "auto",
                    border: "1px solid rgba(255,255,255,0.06)",
                    scrollbarWidth: "thin", scrollbarColor: "rgba(108,99,255,0.3) transparent",
                  }}>
                    {logs.map((line, i) => (
                      <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, fontFamily: "monospace" }}>
                        {line}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>

              </div>
            )}

            {/* ── Footer Buttons ── */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex", gap: 10, justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              {phase === "settings" && (
                <>
                  <button onClick={onClose} style={btnSecondary}>Cancel</button>
                  <button onClick={startExport} style={btnPrimary}>
                    Export ↗
                  </button>
                </>
              )}
              {phase === "rendering" && (
                <button onClick={onClose} style={btnSecondary}>Cancel</button>
              )}
              {phase === "done" && (
                <>
                  <button onClick={() => setPhase("settings")} style={btnSecondary}>Export Again</button>
                  <button onClick={downloadFile} style={{ ...btnPrimary, background: "#22c55e", borderColor: "#22c55e" }}>
                    ⬇ Download MP4
                  </button>
                </>
              )}
              {phase === "error" && (
                <>
                  <button onClick={onClose} style={btnSecondary}>Close</button>
                  <button onClick={() => setPhase("settings")} style={btnPrimary}>Try Again</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)",
  letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10,
};

const btnPrimary = {
  background: ACC, border: `1px solid ${ACC}`,
  borderRadius: 10, color: "#fff",
  cursor: "pointer", fontSize: 13, fontWeight: 700,
  padding: "10px 24px",
};

const btnSecondary = {
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, color: "rgba(255,255,255,0.6)",
  cursor: "pointer", fontSize: 13, fontWeight: 600,
  padding: "10px 20px",
};
