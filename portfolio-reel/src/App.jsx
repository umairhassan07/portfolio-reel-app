import React, { useState, useRef, useCallback, useEffect } from "react";
import ExportModal from "./ExportModal";
import { searchPexels } from "./ai/pexels";
import { Player } from "@remotion/player";
import { useVideo, calcDuration } from "./store/videoStore.jsx";
import { PortfolioReel } from "./compositions/PortfolioReel";
import { sendMessage } from "./ai/deepseek";
import { TRENDING_CATEGORIES } from "./ai/trendingAudio.js";
import { getTrendingNames } from "./ai/spotify.js";

const ACC = "#6C63FF";

// ── Chat Panel ─────────────────────────────────────────────────
const STARTERS = [
  { emoji: "⚡", label: "Dev Portfolio",   prompt: "Build me a 15s developer portfolio reel using internet images. Make it dark, techy, professional." },
  { emoji: "💪", label: "Fitness Reel",    prompt: "Create a 20s fitness motivation reel. Energy, bold fonts, fire colors. Add music." },
  { emoji: "✨", label: "Fashion Drop",    prompt: "Make a 12s fashion reel, elegant style, pastel tones, Playfair Display font." },
  { emoji: "🌍", label: "Travel Vlog",     prompt: "Build a 20s travel vlog reel. Cinematic, fullscreen layout, adventure vibes." },
  { emoji: "🎵", label: "Music Release",   prompt: "Create a 10s new music release reel. Purple/neon theme, Bebas Neue, add stickers." },
  { emoji: "🍜", label: "Food Blog",       prompt: "Make a 15s food blog reel. Warm colors, Playfair Display, cinematic shots." },
  { emoji: "💎", label: "Luxury Brand",    prompt: "Apply the luxury template, add 4 slides with premium imagery, gold theme." },
  { emoji: "🔥", label: "Surprise Me",     prompt: "Surprise me — build something creative and impressive, 15 seconds." },
];

function ChatPanel({ actions, state }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! What kind of reel do you want to make? Tell me the topic, duration, and I'll build it.", type: "text" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const bottomRef = useRef(null);

  const isFirstMessage = messages.length === 1; // only the welcome message

  const scroll = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

  const sendText = useCallback(async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (!text) setInput(""); // clear input when called from send button
    const userMsg = { role: "user", content: msg, type: "text" };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Progress bubble
    const pid = `p-${Date.now()}`;
    setMessages(prev => [...prev, { role: "assistant", content: "⟳ Thinking…", id: pid, type: "progress" }]);
    scroll();

    // Final reply bubble (streams into)
    const rid = `r-${Date.now()}`;

    const onProgress = (text) => {
      setMessages(prev => prev.map(m => m.id === pid ? { ...m, content: text } : m));
      scroll();
    };

    const onStream = (text, done) => {
      setMessages(prev => {
        const hasReply = prev.some(m => m.id === rid);
        if (!hasReply) return [...prev, { role: "assistant", content: text, id: rid, type: "stream", streaming: !done }];
        return prev.map(m => m.id === rid ? { ...m, content: text, streaming: !done } : m);
      });
      setStreamingId(done ? null : rid);
      scroll();
    };

    try {
      await sendMessage(history, actions, state, onProgress, onStream);
      // Remove progress bubble once reply is in
      setMessages(prev => prev.filter(m => m.id !== pid));
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === pid ? { role: "assistant", content: `⚠ ${e.message}`, id: pid, type: "error" } : m
      ));
    }
    setLoading(false);
    scroll();
  }, [input, loading, messages, actions, state]);

  const send = useCallback(() => sendText(), [sendText]);
  const sendStarter = useCallback((prompt) => sendText(prompt), [sendText]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0, scrollbarWidth: "thin", scrollbarColor: "rgba(108,99,255,0.4) transparent" }}>
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isProgress = m.type === "progress";
          const isStream = m.type === "stream";
          const isError = m.type === "error";
          return (
            <div key={m.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
              {!isUser && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${ACC}33`, border: `1px solid ${ACC}55`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, marginBottom: 2 }}>✦</div>
              )}
              <div style={{
                maxWidth: "85%", padding: "9px 13px",
                borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                background: isUser
                  ? `linear-gradient(135deg, ${ACC}, ${ACC}cc)`
                  : isProgress ? "rgba(108,99,255,0.1)"
                  : isError   ? "rgba(239,68,68,0.1)"
                  : "rgba(255,255,255,0.06)",
                border: isUser ? "none"
                  : isProgress ? `1px solid ${ACC}33`
                  : isError    ? "1px solid rgba(239,68,68,0.25)"
                  : "1px solid rgba(255,255,255,0.06)",
                fontSize: 12, color: isError ? "#fca5a5" : "#fff",
                lineHeight: 1.65, whiteSpace: "pre-wrap",
                boxShadow: isUser ? `0 4px 20px ${ACC}44` : "none",
              }}>
                {m.content}
                {m.streaming && (
                  <span style={{ display: "inline-block", width: 2, height: 14, background: ACC, marginLeft: 2, borderRadius: 1, animation: "blink 0.8s step-end infinite", verticalAlign: "middle" }} />
                )}
              </div>
            </div>
          );
        })}
        {/* Starter prompts — shown only before first user message */}
        {isFirstMessage && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", textAlign: "center", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Quick Start</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendStarter(s.prompt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 10px", borderRadius: 20,
                    background: "rgba(108,99,255,0.1)",
                    border: "1px solid rgba(108,99,255,0.25)",
                    color: "rgba(255,255,255,0.75)",
                    cursor: "pointer", fontSize: 11, fontWeight: 500,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,99,255,0.22)"; e.currentTarget.style.borderColor = "rgba(108,99,255,0.5)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(108,99,255,0.1)"; e.currentTarget.style.borderColor = "rgba(108,99,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.75)"; }}
                >
                  <span style={{ fontSize: 13 }}>{s.emoji}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* Input — premium bar */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{
          display: "flex", gap: 0, alignItems: "flex-end",
          background: "rgba(255,255,255,0.06)",
          border: `1px solid ${input ? `${ACC}55` : "rgba(255,255,255,0.1)"}`,
          borderRadius: 12, overflow: "hidden",
          transition: "border-color 0.2s",
          boxShadow: input ? `0 0 0 3px ${ACC}18` : "none",
        }}>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask AI to build your reel…"
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", padding: "11px 14px", color: "#fff", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "none", overflowY: "auto", lineHeight: 1.5, scrollbarWidth: "none" }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "transparent" : `linear-gradient(135deg, ${ACC}, #9c56ff)`,
              border: "none", margin: 6,
              borderRadius: 8, color: loading || !input.trim() ? "rgba(255,255,255,0.2)" : "#fff",
              cursor: loading || !input.trim() ? "default" : "pointer",
              width: 34, height: 34, flexShrink: 0, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: (!loading && input.trim()) ? `0 4px 14px ${ACC}55` : "none",
            }}
          >
            {loading ? (
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${ACC}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
            ) : "↑"}
          </button>
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 5, textAlign: "center", letterSpacing: 0.5 }}>
          Enter to send · Shift+Enter new line
        </div>
      </div>
    </div>
  );
}

// ── SVG Icons ──────────────────────────────────────────────────
const SvgIcon = ({ d, d2, viewBox = "0 0 24 24", size = 20, children }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {d && <path d={d} />}
    {d2 && <path d={d2} />}
    {children}
  </svg>
);

const SIDEBAR_ITEMS = [
  { id: "generate", label: "Generate", icon: <SvgIcon><path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.1l-3.75 2.6 1.5-4.5L6 6.5h4.5z"/><path d="M5 19h14M8 22h8" strokeWidth="1.5"/></SvgIcon> },
  { id: "media",    label: "Media",    icon: <SvgIcon><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></SvgIcon> },
  { id: "audio",    label: "Audio",    icon: <SvgIcon d="M9 18V5l12-2v13"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></SvgIcon> },
  { id: "text",     label: "Text",     icon: <SvgIcon><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></SvgIcon> },
  { id: "transitions", label: "Cuts",  icon: <SvgIcon><rect x="2" y="4" width="8" height="16" rx="1.5"/><path d="M14 8l6 4-6 4V8z"/></SvgIcon> },
  { id: "effects",  label: "Effects",  icon: <SvgIcon d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /> },
  { id: "voice",    label: "Voice",    icon: <SvgIcon><path d="M12 1a3 3 0 0 1 3 3v8a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></SvgIcon> },
  { id: "stickers", label: "Stickers", icon: <SvgIcon><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 6-6"/><path d="M18 14l2 2-4 4-2-2"/></SvgIcon> },
  { id: "templates",label: "Templates",icon: <SvgIcon><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></SvgIcon> },
  { id: "filters",  label: "Filters",  icon: <SvgIcon><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/><circle cx="7" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="17" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="18" r="2" fill="currentColor" stroke="none"/></SvgIcon> },
];

// ── AI Image Generate Panel ────────────────────────────────────
function GeneratePanel({ onAddSlide }) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [refImage, setRefImage] = useState(null);
  const [refDesc, setRefDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const refInputRef = useRef(null);

  const STYLES = [
    { id: "cinematic", label: "🎬 Cinematic", color: "#00C9FF" },
    { id: "fashion",   label: "👗 Fashion",   color: "#E8C4A0" },
    { id: "tech",      label: "💻 Tech",       color: "#5B8DEF" },
    { id: "fitness",   label: "💪 Fitness",    color: "#FF3D00" },
    { id: "travel",    label: "✈️ Travel",     color: "#00FF94" },
    { id: "luxury",    label: "👑 Luxury",     color: "#D4AF37" },
    { id: "food",      label: "🍽️ Food",       color: "#FF8C42" },
    { id: "abstract",  label: "🎨 Abstract",   color: "#C77DFF" },
    { id: "portrait",  label: "👤 Portrait",   color: "#FF6B9D" },
    { id: "minimal",   label: "◻️ Minimal",    color: "#E8E8E8" },
  ];

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const { generateImage, buildReferencePrompt } = await import("./ai/imageGen.js");
      const fullPrompt = buildReferencePrompt(prompt, refDesc);
      // Build 2 URL entries immediately — images load in background
      const variations = [
        await generateImage({ prompt: fullPrompt, style, width: 768, height: 1344 }),
        await generateImage({ prompt: fullPrompt, style, width: 768, height: 1344 }),
      ];
      // Add as "loading" entries so skeleton shows immediately
      const entries = variations.map(v => ({ ...v, loaded: false, error: false }));
      setResults(prev => [...entries, ...prev].slice(0, 12));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markLoaded = (url) => setResults(prev => prev.map(r => r.url === url ? { ...r, loaded: true } : r));
  const markError  = (url) => setResults(prev => prev.map(r => r.url === url ? { ...r, error: true } : r));

  const handleRef = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRefImage(url);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#161622" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 6px", scrollbarWidth: "thin", scrollbarColor: `${ACC}44 transparent` }}>

        {/* Prompt */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Describe your image</div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. woman in luxury penthouse, golden hour, cinematic..."
            rows={3}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11, padding: "8px 10px", resize: "none", fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }}
            onKeyDown={e => e.key === "Enter" && e.metaKey && generate()}
          />
        </div>

        {/* Style grid */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Style</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)} style={{
                background: style === s.id ? `${s.color}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${style === s.id ? s.color : "rgba(255,255,255,0.08)"}`,
                borderRadius: 7, color: style === s.id ? s.color : "rgba(255,255,255,0.5)",
                fontSize: 10, fontWeight: 600, padding: "6px 6px", cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference image */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Reference image (optional)</div>
          <input ref={refInputRef} type="file" accept="image/*" onChange={handleRef} style={{ display: "none" }} />
          {refImage ? (
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
              <img src={refImage} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
              <button onClick={() => { setRefImage(null); setRefDesc(""); }} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => refInputRef.current?.click()} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.3)", fontSize: 10, padding: "10px", cursor: "pointer" }}>
              + Upload reference image
            </button>
          )}
          {refImage && (
            <input
              value={refDesc}
              onChange={e => setRefDesc(e.target.value)}
              placeholder="Describe reference style (e.g. dark moody tones, neon lights)..."
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#fff", fontSize: 10, padding: "7px 8px", fontFamily: "Inter", boxSizing: "border-box", marginTop: 4, outline: "none" }}
            />
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading || !prompt.trim()}
          style={{
            width: "100%", padding: "10px", borderRadius: 10, border: "none", cursor: loading || !prompt.trim() ? "default" : "pointer",
            background: loading || !prompt.trim() ? "rgba(108,99,255,0.3)" : `linear-gradient(135deg, ${ACC}, #9c56ff)`,
            color: "#fff", fontSize: 12, fontWeight: 700, marginBottom: 12,
            boxShadow: loading ? "none" : `0 4px 20px ${ACC}44`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Generating…</>
          ) : (
            <><span>✦</span> Generate Images</>
          )}
        </button>

        {/* Results grid */}
        {results.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              Generated ({results.filter(r => r.loaded).length}/{results.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {results.map((r, i) => (
                <div key={`${r.url}-${i}`} style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#0a0a14", border: `1px solid ${r.loaded ? "rgba(108,99,255,0.3)" : "rgba(255,255,255,0.07)"}`, aspectRatio: "9/16" }}>

                  {/* Loading skeleton */}
                  {!r.loaded && !r.error && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, border: `2px solid ${ACC}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "0 8px", lineHeight: 1.5 }}>Generating…<br/>~15-30s</span>
                    </div>
                  )}

                  {/* Error state */}
                  {r.error && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: 18 }}>⚠️</span>
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>Failed to load</span>
                      <button onClick={() => markError(r.url)} style={{ fontSize: 8, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>Retry</button>
                    </div>
                  )}

                  {/* Actual image — always in DOM to trigger load */}
                  <img
                    src={r.url}
                    alt={`Generated ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: r.loaded ? 1 : 0, transition: "opacity 0.4s" }}
                    onLoad={() => markLoaded(r.url)}
                    onError={() => markError(r.url)}
                  />

                  {/* Add to reel overlay — only when loaded */}
                  {r.loaded && (
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 8px", opacity: 0, transition: "opacity 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <button
                        onClick={async () => { setAdding(i); await onAddSlide(r.url); setAdding(null); }}
                        style={{ background: ACC, border: "none", borderRadius: 6, color: "#fff", fontSize: 9, fontWeight: 700, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: `0 2px 12px ${ACC}66` }}
                      >
                        {adding === i ? "Adding…" : "+ Add to Reel"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "20px 10px", color: "rgba(255,255,255,0.2)", fontSize: 11, lineHeight: 1.7 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            <div>Describe your image and pick a style.</div>
            <div style={{ fontSize: 9, marginTop: 4 }}>Powered by Pollinations AI · Free · No API key</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CapCutSidebar({ slides, audio, selectedSlide, setSelectedSlide, addSlide, setAudio, addTransition, setText, setTextStyle, setTheme, resolveImage, fileInputRef, addLocalFiles, state, onAddPexelsSlide, onAddSticker, onAddTextLayer, onApplyTemplate, onSetAudioVolume, onSetKenBurns, onRemoveSticker, onUpdateSticker, onRemoveTextLayer, onUpdateTextLayer, setCaption, reorderSlides, addVoiceover, removeVoiceover, updateVoiceover }) {
  const [activePanel, setActivePanel] = useState("media");
  const audioElRef = useRef(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioFiles, setAudioFiles] = useState([]);
  const audioInputRef = useRef(null);

  const togglePanel = (id) => setActivePanel(activePanel === id ? null : id);

  const addAudioFiles = (files) => {
    Array.from(files).filter((f) => f.type.startsWith("audio/")).forEach((file) => {
      setAudioFiles((prev) => [...prev, { name: file.name, url: URL.createObjectURL(file) }]);
    });
  };

  const togglePlay = (url, name) => {
    if (playingAudio === name) { audioElRef.current?.pause(); setPlayingAudio(null); }
    else { if (audioElRef.current) { audioElRef.current.src = url; audioElRef.current.play(); } setPlayingAudio(name); }
  };

  const allAudioFiles = [
    ...audioFiles,
    ...(audio && !audioFiles.find((f) => f.url === audio) ? [{ name: "AI Music", url: audio }] : []),
  ];

  return (
    <div style={{ display: "flex", flexShrink: 0 }}>
      <audio ref={audioElRef} onEnded={() => setPlayingAudio(null)} style={{ display: "none" }} />

      {/* Icon bar */}
      <div style={{ width: 68, background: "#0e0e18", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 2 }}>
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => togglePanel(item.id)}
            style={{
              width: 56, paddingTop: 10, paddingBottom: 8,
              background: activePanel === item.id ? "rgba(108,99,255,0.2)" : "transparent",
              border: "none", borderRadius: 10, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: activePanel === item.id ? ACC : "rgba(255,255,255,0.45)",
              transition: "all 0.15s",
            }}
          >
            <span style={{ lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{item.label}</span>
            {/* Active indicator */}
            {activePanel === item.id && (
              <div style={{ position: "absolute", left: 0, width: 3, height: 36, background: ACC, borderRadius: "0 3px 3px 0" }} />
            )}
          </button>
        ))}
      </div>

      {/* Sliding panel */}
      {activePanel && (
        <div style={{ width: 220, background: "#161622", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Panel header */}
          <div style={{ padding: "12px 14px 8px", fontSize: 12, fontWeight: 700, color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {SIDEBAR_ITEMS.find((i) => i.id === activePanel)?.label}
            <button onClick={() => setActivePanel(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {activePanel === "generate" && (
              <GeneratePanel onAddSlide={(url) => onAddPexelsSlide(url)} />
            )}

            {activePanel === "media" && (
              <MediaPanel slides={slides} selectedSlide={selectedSlide} setSelectedSlide={setSelectedSlide} resolveImage={resolveImage} fileInputRef={fileInputRef} addLocalFiles={addLocalFiles} onAddPexelsSlide={onAddPexelsSlide} onReorderSlides={(from, to) => reorderSlides?.(from, to)} />
            )}

            {activePanel === "audio" && (
              <AudioTab audio={audio} setAudio={setAudio} audioInputRef={audioInputRef} addAudioFiles={addAudioFiles} allAudioFiles={allAudioFiles} playingAudio={playingAudio} togglePlay={togglePlay} audioVolume={state.audioVolume} onSetAudioVolume={onSetAudioVolume} />
            )}

            {activePanel === "text" && (
              <TextPanel state={state} setText={setText} setTextStyle={setTextStyle} />
            )}

            {activePanel === "transitions" && (
              <TransitionsPanel slides={slides} addTransition={addTransition} />
            )}

            {activePanel === "effects" && (
              <EffectsPanel setTheme={setTheme} state={state} onSetKenBurns={onSetKenBurns} />
            )}

            {activePanel === "filters" && (
              <FiltersPanel setTheme={setTheme} state={state} />
            )}

            {activePanel === "voice" && (
              <VoicePanel slides={slides} voiceovers={state.voiceovers || []} onAddVoiceover={addVoiceover} onRemoveVoiceover={removeVoiceover} onUpdateVoiceover={updateVoiceover} />
            )}

            {activePanel === "stickers" && (
              <StickersPanel onAddSticker={onAddSticker} stickers={state.stickers || []} onRemoveSticker={onRemoveSticker} onUpdateSticker={onUpdateSticker} textLayers={state.textLayers || []} onAddTextLayer={onAddTextLayer} onRemoveTextLayer={onRemoveTextLayer} onUpdateTextLayer={onUpdateTextLayer} />
            )}

            {activePanel === "templates" && (
              <TemplatesPanel onApplyTemplate={onApplyTemplate} />
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ── Media Panel ────────────────────────────────────────────────
function MediaPanel({ slides, selectedSlide, setSelectedSlide, resolveImage, fileInputRef, addLocalFiles, onAddPexelsSlide, onReorderSlides }) {
  const [dragging, setDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pexelsImages, setPexelsImages] = useState([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsError, setPexelsError] = useState(null);
  const [addingUrl, setAddingUrl] = useState(null);
  const debounceRef = useRef(null);

  const loadPexels = useCallback(async (q) => {
    setPexelsLoading(true);
    setPexelsError(null);
    try {
      const results = await searchPexels(q || "professional portrait creative", 18);
      setPexelsImages(results);
    } catch (e) {
      setPexelsError(e.message);
    }
    setPexelsLoading(false);
  }, []);

  // Load on mount
  useEffect(() => { loadPexels("professional creative portrait"); }, [loadPexels]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadPexels(val.trim() || "professional creative portrait"), 600);
  };

  const handleAddPexels = (img) => {
    if (!onAddPexelsSlide) return;
    setAddingUrl(img.url);
    onAddPexelsSlide(img.url);
    setTimeout(() => setAddingUrl(null), 800);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Search + Upload row */}
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "0 8px", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search Pexels…"
              style={{ flex: 1, background: "none", border: "none", color: "#fff", fontSize: 11, outline: "none", padding: "7px 0" }}
            />
            {pexelsLoading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${ACC}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload local image"
            style={{ width: 32, height: 32, background: `${ACC}18`, border: `1px solid ${ACC}44`, borderRadius: 7, color: ACC, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ↑
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => addLocalFiles(e.target.files)} style={{ display: "none" }} />
      </div>

      <div
        style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px", scrollbarWidth: "thin", scrollbarColor: `${ACC}44 transparent` }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addLocalFiles(e.dataTransfer.files); }}
      >

        {/* Timeline clips */}
        {slides.length > 0 && (
          <>
            <div style={mediaSectionLabel}>Timeline Clips</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 10 }}>
              {slides.map((slide, i) => (
                <SlideThumb key={slide.id} slide={slide} index={i} selected={selectedSlide === i} onSelect={setSelectedSlide} resolveImage={resolveImage} onReorder={onReorderSlides} totalSlides={slides.length} />
              ))}
            </div>
          </>
        )}

        {dragging && (
          <div style={{ border: `2px dashed ${ACC}`, borderRadius: 8, padding: 16, textAlign: "center", color: ACC, fontSize: 11, marginBottom: 8 }}>
            Drop to add
          </div>
        )}

        {/* Pexels grid */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={mediaSectionLabel}>Pexels Stock</div>
          {pexelsError && <div style={{ fontSize: 9, color: "#ef4444" }}>API error</div>}
        </div>

        {pexelsLoading && pexelsImages.length === 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ aspectRatio: "9/16", borderRadius: 7, background: "rgba(255,255,255,0.05)", animation: "pulse 1.5s ease infinite" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {pexelsImages.map((img, i) => (
              <div
                key={i}
                onClick={() => handleAddPexels(img)}
                title={`${img.alt} — ${img.photographer}`}
                style={{
                  aspectRatio: "9/16", borderRadius: 7, overflow: "hidden", cursor: "pointer", position: "relative",
                  border: addingUrl === img.url ? `2px solid ${ACC}` : "2px solid transparent",
                  transition: "border-color 0.2s, transform 0.15s",
                  transform: addingUrl === img.url ? "scale(0.96)" : "scale(1)",
                }}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                  onError={(e) => { e.target.style.opacity = 0.2; }}
                />
                {/* Hover overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)", opacity: 0, transition: "opacity 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <div style={{ position: "absolute", bottom: 5, left: 5, right: 5, fontSize: 8, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    + Add · {img.photographer}
                  </div>
                </div>
                {addingUrl === img.url && (
                  <div style={{ position: "absolute", inset: 0, background: `${ACC}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✓</div>
                )}
              </div>
            ))}
          </div>
        )}

        {!pexelsLoading && pexelsImages.length === 0 && !pexelsError && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, padding: 20 }}>No images found</div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>
    </div>
  );
}

const mediaSectionLabel = { fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 };

function SlideThumb({ slide, index, selected, onSelect, resolveImage, onReorder, totalSlides }) {
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData("slideIndex", index)}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        const from = parseInt(e.dataTransfer.getData("slideIndex"));
        if (from !== index) onReorder?.(from, index);
      }}
      onClick={() => onSelect(selected ? null : index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden", cursor: "grab",
        border: `2px solid ${dragOver ? "#22c55e" : selected ? ACC : "transparent"}`,
        background: "#1a1a2a", aspectRatio: "9/16",
        transform: dragOver ? "scale(1.04)" : "scale(1)", transition: "transform 0.15s",
      }}
    >
      {slide.type === "video"
        ? <video src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} muted />
        : <img src={resolveImage(slide.image)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={e => e.target.style.opacity = 0.2} />
      }
      {slide.type === "video" && <div style={{ position: "absolute", top: 4, left: 4, fontSize: 10 }}>🎬</div>}
      {hovered && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, color: ACC, fontWeight: 700 }}>{(slide.duration / 30).toFixed(1)}s</span></div>}
      {selected && <div style={{ position: "absolute", top: 4, right: 4, background: ACC, borderRadius: 4, fontSize: 8, color: "#fff", padding: "2px 5px", fontWeight: 700 }}>✓</div>}
      <div style={{ position: "absolute", bottom: 3, left: 4, background: "rgba(0,0,0,0.6)", borderRadius: 3, fontSize: 9, color: "rgba(255,255,255,0.7)", padding: "1px 5px" }}>{index + 1}</div>
    </div>
  );
}

// ── Text Panel ─────────────────────────────────────────────────
const FONTS = ["Inter","Playfair Display","Space Grotesk","Montserrat","Bebas Neue","Poppins","DM Sans","Roboto Mono"];
const TEXT_FIELDS = [
  { key: "projectName", label: "Title",       setFn: (setText) => (v) => setText(v, null, null, null) },
  { key: "tagline",     label: "Tagline",     setFn: (setText) => (v) => setText(null, v, null, null) },
  { key: "description", label: "Description", setFn: (setText) => (v) => setText(null, null, v, null) },
  { key: "handle",      label: "Handle",      setFn: (setText) => (v) => setText(null, null, null, v) },
];

function TextPanel({ state, setText, setTextStyle }) {
  const [expanded, setExpanded] = useState("projectName");
  const ts = state.textStyle || {};

  return (
    <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "thin", display: "flex", flexDirection: "column" }}>
      {TEXT_FIELDS.map(({ key, label, setFn }) => {
        const style = ts[key] || {};
        const isOpen = expanded === key;
        return (
          <div key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Field header */}
            <div
              onClick={() => setExpanded(isOpen ? null : key)}
              style={{ display: "flex", alignItems: "center", padding: "9px 12px", cursor: "pointer", gap: 8, background: isOpen ? "rgba(108,99,255,0.08)" : "transparent" }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: isOpen ? ACC : "rgba(255,255,255,0.4)", letterSpacing: 0.8, textTransform: "uppercase", flex: 1 }}>{label}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: `'${style.fontFamily || "Inter"}', sans-serif`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>{state.text[key]}</span>
              <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Content */}
                {key === "description"
                  ? <textarea value={state.text[key] || ""} onChange={(e) => setFn(setText)(e.target.value)} rows={3} style={{ ...capInputStyle, resize: "vertical", fontFamily: `'${style.fontFamily || "Inter"}', sans-serif` }} />
                  : <input value={state.text[key] || ""} onChange={(e) => setFn(setText)(e.target.value)} style={{ ...capInputStyle, fontFamily: `'${style.fontFamily || "Inter"}', sans-serif` }} />
                }

                {/* Font */}
                <div>
                  <div style={capLabelStyle}>Font</div>
                  <select
                    value={style.fontFamily || "Inter"}
                    onChange={(e) => setTextStyle(key, { fontFamily: e.target.value })}
                    style={{ ...capInputStyle, cursor: "pointer", fontFamily: `'${style.fontFamily || "Inter"}', sans-serif` }}
                  >
                    {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>{f}</option>)}
                  </select>
                </div>

                {/* Size + Weight row */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={capLabelStyle}>Size</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="range" min={14} max={120} value={style.fontSize || 40}
                        onChange={(e) => setTextStyle(key, { fontSize: +e.target.value })}
                        style={{ flex: 1, accentColor: ACC }}
                      />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", minWidth: 24 }}>{style.fontSize || 40}</span>
                    </div>
                  </div>
                </div>

                {/* Color + Align row */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div>
                    <div style={capLabelStyle}>Color</div>
                    <input
                      type="color"
                      value={(style.color && style.color.startsWith("#") ? style.color : "#ffffff")}
                      onChange={(e) => setTextStyle(key, { color: e.target.value })}
                      style={{ width: 32, height: 28, border: "none", borderRadius: 5, cursor: "pointer", background: "none" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={capLabelStyle}>Align</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["left","center","right"].map(a => (
                        <button key={a} onClick={() => setTextStyle(key, { align: a })}
                          style={{ flex: 1, padding: "5px 0", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, background: (style.align || "center") === a ? ACC : "rgba(255,255,255,0.07)", color: (style.align || "center") === a ? "#fff" : "rgba(255,255,255,0.4)" }}>
                          {a === "left" ? "⇐" : a === "center" ? "⇔" : "⇒"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Y Offset */}
                <div>
                  <div style={capLabelStyle}>Vertical Position</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="range" min={-400} max={400} value={style.yOffset || 0}
                      onChange={(e) => setTextStyle(key, { yOffset: +e.target.value })}
                      style={{ flex: 1, accentColor: ACC }}
                    />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", minWidth: 28 }}>{style.yOffset || 0}px</span>
                  </div>
                </div>

                {/* Reset style */}
                <button onClick={() => setTextStyle(key, { fontSize: null, color: null, fontFamily: "Inter", fontWeight: 700, align: "center", yOffset: 0 })}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 10, padding: "5px" }}>
                  Reset style
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Transitions Panel ──────────────────────────────────────────
function TransitionsPanel({ slides, addTransition }) {
  const TRANS = [
    { type: "fade", icon: "⟡", label: "Fade", desc: "Smooth opacity blend" },
    { type: "slide_left", icon: "←", label: "Slide Left", desc: "Push from right" },
    { type: "slide_right", icon: "→", label: "Slide Right", desc: "Push from left" },
    { type: "zoom_in", icon: "⊕", label: "Zoom In", desc: "Scale up entrance" },
    { type: "zoom_out", icon: "⊖", label: "Zoom Out", desc: "Scale down entrance" },
    { type: "wipe", icon: "▷", label: "Wipe", desc: "Horizontal reveal" },
  ];
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", scrollbarWidth: "thin" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
        Select a transition, then choose which slide to apply it after.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {TRANS.map((t) => (
          <div key={t.type} onClick={() => setSelected(selected === t.type ? null : t.type)}
            style={{ borderRadius: 8, padding: "10px 8px", textAlign: "center", cursor: "pointer", border: `1.5px solid ${selected === t.type ? ACC : "rgba(255,255,255,0.08)"}`, background: selected === t.type ? `${ACC}18` : "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{t.label}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{t.desc}</div>
          </div>
        ))}
      </div>
      {selected && slides.length > 1 && (
        <div>
          <div style={capLabelStyle}>Apply after slide:</div>
          {slides.slice(0, -1).map((_, i) => (
            <button key={i} onClick={() => addTransition(selected, i)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(255,255,255,0.04)", border: "none", borderRadius: 6, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 11, padding: "7px 10px", marginBottom: 3 }}>
              After Slide {i + 1} →
            </button>
          ))}
        </div>
      )}
      {selected && slides.length <= 1 && (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 10 }}>Add more slides first</div>
      )}
    </div>
  );
}

// ── Effects Panel ──────────────────────────────────────────────
function EffectsPanel({ setTheme, state, onSetKenBurns }) {
  const EFFECTS = [
    { label: "Neon Purple", accent: "#b44fff", bgFrom: "#0d001a", bgTo: "#1a003a" },
    { label: "Cyber Blue", accent: "#00d4ff", bgFrom: "#000d1a", bgTo: "#001a33" },
    { label: "Sunset", accent: "#ff6b35", bgFrom: "#1a0a00", bgTo: "#2e1500" },
    { label: "Matrix", accent: "#00ff88", bgFrom: "#001a0d", bgTo: "#002e1a" },
    { label: "Rose Gold", accent: "#ff9eb5", bgFrom: "#1a0a10", bgTo: "#2e0f1a" },
    { label: "Deep Ocean", accent: "#0088ff", bgFrom: "#000d1a", bgTo: "#001833" },
  ];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", scrollbarWidth: "thin" }}>
      {/* Ken Burns toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>Ken Burns</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Subtle zoom/pan on slides</div>
        </div>
        <div onClick={() => onSetKenBurns?.(!state.kenBurns)}
          style={{ width: 36, height: 20, borderRadius: 10, background: state.kenBurns ? ACC : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 2, left: state.kenBurns ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Color themes</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {EFFECTS.map((e) => (
          <div key={e.label} onClick={() => setTheme(e.accent, e.bgFrom, e.bgTo)}
            style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${state.theme.accent === e.accent ? e.accent : "rgba(255,255,255,0.08)"}` }}>
            <div style={{ height: 50, background: `linear-gradient(135deg, ${e.bgFrom}, ${e.bgTo})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: e.accent }} />
            </div>
            <div style={{ padding: "4px 6px", background: "#1a1a2a", fontSize: 9, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{e.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filters Panel ──────────────────────────────────────────────
function FiltersPanel({ setTheme, state }) {
  const FILTERS = [
    { label: "Dark Mode", bgFrom: "#0a0a0f", bgTo: "#13131f" },
    { label: "Midnight", bgFrom: "#0f0c29", bgTo: "#302b63" },
    { label: "Crimson", bgFrom: "#1a0000", bgTo: "#3a0000" },
    { label: "Forest", bgFrom: "#001a0a", bgTo: "#003018" },
    { label: "Sand", bgFrom: "#1a1400", bgTo: "#2e2400" },
    { label: "Storm", bgFrom: "#0a0f1a", bgTo: "#131f2e" },
  ];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px", scrollbarWidth: "thin" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Background filters</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {FILTERS.map((f) => (
          <div key={f.label} onClick={() => setTheme(null, f.bgFrom, f.bgTo)}
            style={{ borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${state.theme.bgFrom === f.bgFrom ? ACC : "rgba(255,255,255,0.08)"}` }}>
            <div style={{ height: 50, background: `linear-gradient(135deg, ${f.bgFrom}, ${f.bgTo})` }} />
            <div style={{ padding: "4px 6px", background: "#1a1a2a", fontSize: 9, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const capLabelStyle = { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 };

// ── Stickers Panel ─────────────────────────────────────────────
const EMOJI_LIST = ["🔥","⚡","✨","💎","🚀","🎯","💪","🌟","❤️","😎","🎵","🎬","📱","💻","🌍","🏆","👑","🦋","🌈","🎨","⚽","🎸","📸","💡","🌙","☀️","⭐","🎉","🍀","🦁"];

function StickersPanel({ onAddSticker, stickers, onRemoveSticker, onUpdateSticker, textLayers, onAddTextLayer, onRemoveTextLayer, onUpdateTextLayer }) {
  const [newText, setNewText] = useState("");
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", scrollbarWidth: "thin", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Emoji Stickers */}
      <div>
        <div style={capLabelStyle}>Emoji Stickers</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {EMOJI_LIST.map(e => (
            <button key={e} onClick={() => onAddSticker(e, 50, 20, 80)}
              style={{ width: 34, height: 34, fontSize: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer" }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Active stickers */}
      {stickers.length > 0 && (
        <div>
          <div style={capLabelStyle}>Active Stickers</div>
          {stickers.map(st => (
            <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 8px" }}>
              <span style={{ fontSize: 18 }}>{st.emoji}</span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>X</span>
                  <input type="range" min={0} max={100} value={st.x} onChange={e => onUpdateSticker(st.id, { x: +e.target.value })} style={{ flex: 1, accentColor: ACC }} />
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Y</span>
                  <input type="range" min={0} max={100} value={st.y} onChange={e => onUpdateSticker(st.id, { y: +e.target.value })} style={{ flex: 1, accentColor: ACC }} />
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Size</span>
                  <input type="range" min={20} max={200} value={st.size} onChange={e => onUpdateSticker(st.id, { size: +e.target.value })} style={{ flex: 1, accentColor: ACC }} />
                </div>
              </div>
              <button onClick={() => onRemoveSticker(st.id)} style={{ background: "rgba(255,50,50,0.15)", border: "none", borderRadius: 5, color: "#ff6b6b", cursor: "pointer", fontSize: 11, padding: "3px 6px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Text Layers */}
      <div>
        <div style={capLabelStyle}>Custom Text</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type text…" style={{ ...capInputStyle, flex: 1 }} />
          <button onClick={() => { if (newText.trim()) { onAddTextLayer(newText.trim()); setNewText(""); } }}
            style={{ background: ACC, border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", fontSize: 12, padding: "0 12px", fontWeight: 700 }}>+</button>
        </div>
        {textLayers.map(layer => (
          <div key={layer.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 8px" }}>
            <span style={{ fontSize: 11, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layer.content}</span>
            <div style={{ display: "flex", gap: 4 }}>
              <input type="range" min={0} max={100} value={layer.x} onChange={e => onUpdateTextLayer(layer.id, { x: +e.target.value })} style={{ width: 50, accentColor: ACC }} title="X position" />
              <input type="range" min={0} max={100} value={layer.y} onChange={e => onUpdateTextLayer(layer.id, { y: +e.target.value })} style={{ width: 50, accentColor: ACC }} title="Y position" />
            </div>
            <button onClick={() => onRemoveTextLayer(layer.id)} style={{ background: "rgba(255,50,50,0.15)", border: "none", borderRadius: 5, color: "#ff6b6b", cursor: "pointer", fontSize: 11, padding: "3px 6px" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Voice Panel ────────────────────────────────────────────────
import { generateVoiceover, VOICES, previewBrowserTTS, stopBrowserTTS, estimateDuration } from "./ai/tts.js";

function VoicePanel({ slides, voiceovers, onAddVoiceover, onRemoveVoiceover, onUpdateVoiceover }) {
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [script, setScript]               = useState("");
  const [voiceId, setVoiceId]             = useState(VOICES[0].id);
  const [generating, setGenerating]       = useState(false);
  const [previewing, setPreviewing]       = useState(false);
  const [error, setError]                 = useState("");
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const hasKey = !!apiKey;

  const slideVo = voiceovers.find(v => v.slideIndex === selectedSlide);

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const url = await generateVoiceover(script, voiceId, apiKey);
      onAddVoiceover(selectedSlide, script, url);
    } catch (e) {
      setError(e.message);
    }
    setGenerating(false);
  };

  const handlePreview = () => {
    if (previewing) { stopBrowserTTS(); setPreviewing(false); return; }
    if (!script.trim()) return;
    setPreviewing(true);
    previewBrowserTTS(script);
    const est = estimateDuration(script) * 1000 + 500;
    setTimeout(() => setPreviewing(false), est);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* API key notice */}
      {!hasKey && (
        <div style={{ margin: "8px 10px 0", padding: "8px 10px", borderRadius: 8, background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.2)", fontSize: 10, color: "rgba(245,200,66,0.8)", lineHeight: 1.6 }}>
          ⚡ Add <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 4px", borderRadius: 3 }}>VITE_ELEVENLABS_API_KEY</code> in <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 4px", borderRadius: 3 }}>.env</code> for AI voice.<br/>
          Browser preview still works (not exportable).
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "thin" }}>

        {/* Slide selector */}
        <div>
          <div style={capLabelStyle}>Slide</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {slides.length === 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>No slides yet</div>}
            {slides.map((_, i) => {
              const hasVo = voiceovers.some(v => v.slideIndex === i);
              return (
                <button key={i} onClick={() => { setSelectedSlide(i); setScript(voiceovers.find(v => v.slideIndex === i)?.text || ""); }}
                  style={{ width: 32, height: 32, borderRadius: 7, border: `1.5px solid ${selectedSlide === i ? ACC : "rgba(255,255,255,0.08)"}`, background: selectedSlide === i ? `${ACC}18` : "rgba(255,255,255,0.04)", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, position: "relative" }}>
                  {i + 1}
                  {hasVo && <div style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#22c55e", border: "1px solid #09091a" }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice selector */}
        <div>
          <div style={capLabelStyle}>Voice</div>
          <select value={voiceId} onChange={e => setVoiceId(e.target.value)} style={{ ...capInputStyle, cursor: "pointer" }}>
            {VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.gender}) — {v.style}</option>
            ))}
          </select>
        </div>

        {/* Script */}
        <div>
          <div style={{ ...capLabelStyle, display: "flex", justifyContent: "space-between" }}>
            <span>Script</span>
            {script && <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0 }}>~{estimateDuration(script)}s</span>}
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            placeholder={`Voiceover for slide ${selectedSlide + 1}…`}
            rows={4}
            style={{ ...capInputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />
        </div>

        {/* Error */}
        {error && <div style={{ fontSize: 10, color: "#fca5a5", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "6px 10px" }}>{error}</div>}

        {/* Active voiceover for this slide */}
        {slideVo && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🎙</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#22c55e" }}>Voiceover ready</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slideVo.text}</div>
            </div>
            <audio src={slideVo.audioUrl} controls style={{ height: 22, width: 70, opacity: 0.8 }} />
            <button onClick={() => onRemoveVoiceover(slideVo.id)} style={{ background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 5, color: "#fca5a5", cursor: "pointer", fontSize: 10, padding: "3px 7px" }}>✕</button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 7 }}>
          {/* Browser preview */}
          <button onClick={handlePreview} disabled={!script.trim()}
            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid rgba(255,255,255,0.12)`, background: previewing ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", cursor: script.trim() ? "pointer" : "default", fontSize: 11, fontWeight: 600, opacity: script.trim() ? 1 : 0.4 }}>
            {previewing ? "⏹ Stop" : "▶ Preview"}
          </button>

          {/* Generate */}
          <button onClick={handleGenerate} disabled={generating || !script.trim() || !hasKey}
            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: (generating || !hasKey) ? "rgba(108,99,255,0.3)" : `linear-gradient(135deg, ${ACC}, #9c56ff)`, color: "#fff", cursor: (generating || !script.trim() || !hasKey) ? "default" : "pointer", fontSize: 11, fontWeight: 700, boxShadow: (!generating && hasKey && script.trim()) ? `0 4px 14px ${ACC}44` : "none" }}>
            {generating ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                Generating…
              </div>
            ) : hasKey ? "🎙 Generate" : "🔑 Need API Key"}
          </button>
        </div>

        {/* Volume control if voiceover exists */}
        {slideVo && (
          <div>
            <div style={capLabelStyle}>Voiceover Volume</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={0} max={1} step={0.05} value={slideVo.volume ?? 0.9} onChange={e => onUpdateVoiceover(slideVo.id, { volume: +e.target.value })} style={{ flex: 1, accentColor: ACC }} />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", minWidth: 28 }}>{Math.round((slideVo.volume ?? 0.9) * 100)}%</span>
            </div>
          </div>
        )}

        {/* All voiceovers summary */}
        {voiceovers.length > 0 && (
          <div>
            <div style={capLabelStyle}>All Voiceovers ({voiceovers.length})</div>
            {voiceovers.map(vo => (
              <div key={vo.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "5px 8px" }}>
                <span style={{ fontSize: 10, color: ACC, fontWeight: 700, minWidth: 16 }}>S{vo.slideIndex + 1}</span>
                <div style={{ flex: 1, fontSize: 10, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vo.text}</div>
                <button onClick={() => onRemoveVoiceover(vo.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Templates Panel ────────────────────────────────────────────
import { TEMPLATES } from "./data/templates.js";

function TemplatesPanel({ onApplyTemplate }) {
  const [applied, setApplied] = useState(null);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px", scrollbarWidth: "thin" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 10, lineHeight: 1.6 }}>
        Apply a template to instantly set theme, fonts & text. Your slides stay.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TEMPLATES.map(t => (
          <div
            key={t.id}
            onClick={() => { onApplyTemplate(t); setApplied(t.id); setTimeout(() => setApplied(null), 1500); }}
            style={{
              borderRadius: 10, overflow: "hidden", cursor: "pointer",
              border: `1.5px solid ${applied === t.id ? t.color : "rgba(255,255,255,0.08)"}`,
              background: applied === t.id ? `${t.color}18` : "rgba(255,255,255,0.03)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ height: 44, background: t.gradient, display: "flex", alignItems: "center", padding: "0 12px", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{t.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{t.name}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>{t.textStyle.projectName.fontFamily} · {t.layout === "phone_mockup" ? "Mockup" : "Fullscreen"}</div>
              </div>
              {applied === t.id && <span style={{ marginLeft: "auto", fontSize: 14, color: t.color }}>✓</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
const capInputStyle = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none", fontFamily: "inherit" };

// ── Audio Tab with Trending Categories ────────────────────────
function AudioTab({ audio, setAudio, audioInputRef, addAudioFiles, allAudioFiles, playingAudio, togglePlay, audioVolume, onSetAudioVolume }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const [catTracks, setCatTracks] = useState({});   // categoryId → track[]
  const [loadingCat, setLoadingCat] = useState(null);

  const expandCategory = async (catId) => {
    const next = expandedCat === catId ? null : catId;
    setExpandedCat(next);
    if (next && !catTracks[next]) {
      setLoadingCat(next);
      const { fetchCategoryTracks } = await import("./ai/trendingAudio.js");
      const tracks = await fetchCategoryTracks(next, 6);
      setCatTracks(prev => ({ ...prev, [next]: tracks }));
      setLoadingCat(null);
    }
  };

  useEffect(() => {}, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Upload local audio */}
      <div style={{ padding: "8px 10px", flexShrink: 0 }}>
        <button onClick={() => audioInputRef.current?.click()} style={{ width: "100%", background: "rgba(34,197,94,0.08)", border: "1px dashed rgba(34,197,94,0.3)", borderRadius: 7, color: "#22c55e", cursor: "pointer", fontSize: 10, fontWeight: 600, padding: "7px" }}>
          + Upload your audio
        </button>
        <input ref={audioInputRef} type="file" accept="audio/*" multiple onChange={(e) => addAudioFiles(e.target.files)} style={{ display: "none" }} />
        {/* Volume */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12 }}>🔊</span>
          <input type="range" min={0} max={1} step={0.05} value={audioVolume ?? 0.4} onChange={e => onSetAudioVolume?.(+e.target.value)} style={{ flex: 1, accentColor: "#22c55e" }} />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", minWidth: 28 }}>{Math.round((audioVolume ?? 0.4) * 100)}%</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 12px", scrollbarWidth: "thin", scrollbarColor: "rgba(108,99,255,0.3) transparent" }}>

        {/* Uploaded files */}
        {allAudioFiles.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", padding: "6px 2px 4px" }}>Your Files</div>
            {allAudioFiles.map((af, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 7, marginBottom: 3, background: audio === af.url ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${audio === af.url ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.06)"}` }}>
                <button onClick={() => togglePlay(af.url, af.name)} style={{ width: 26, height: 26, borderRadius: "50%", background: playingAudio === af.name ? "#22c55e" : "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: 10, flexShrink: 0 }}>
                  {playingAudio === af.name ? "⏸" : "▶"}
                </button>
                <div style={{ flex: 1, fontSize: 10, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{af.name.replace(/\.[^.]+$/, "")}</div>
                <button onClick={() => setAudio(audio === af.url ? null : af.url)} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: 600, background: audio === af.url ? "#22c55e" : "rgba(255,255,255,0.1)", color: audio === af.url ? "#000" : "rgba(255,255,255,0.5)" }}>
                  {audio === af.url ? "✓" : "Use"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Trending Categories */}
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", padding: "4px 2px 8px", display: "flex", alignItems: "center", gap: 6 }}>
          🔥 Trending Vibes
        </div>

        {TRENDING_CATEGORIES.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 6, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Category header */}
            <div
              onClick={() => expandCategory(cat.id)}
              style={{ background: cat.gradient, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{cat.label}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{cat.vibe}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{expandedCat === cat.id ? "▲" : "▼"}</span>
            </div>

            {/* Expanded tracks */}
            {expandedCat === cat.id && (
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px" }}>
                {/* Spotify-style hints */}
                {(cat.spotifyHints || []).slice(0, 3).map((hint, i) => (
                  <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", padding: "2px 0", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: "#1DB954", fontSize: 8 }}>♫</span> {hint}
                  </div>
                ))}
                <div style={{ height: 6 }} />
                {/* Loading state */}
                {loadingCat === cat.id && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "8px 0", textAlign: "center" }}>
                    ⟳ Loading tracks…
                  </div>
                )}
                {/* Live tracks from Jamendo */}
                {(catTracks[cat.id] || []).map((track, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, marginBottom: 3, background: audio === track.url ? `${cat.color}22` : "rgba(255,255,255,0.03)", border: `1px solid ${audio === track.url ? `${cat.color}55` : "rgba(255,255,255,0.05)"}` }}>
                    <button onClick={() => togglePlay(track.url, track.title)} style={{ width: 24, height: 24, borderRadius: "50%", background: playingAudio === track.title ? cat.color : "rgba(255,255,255,0.1)", border: "none", color: "#fff", cursor: "pointer", fontSize: 9, flexShrink: 0 }}>
                      {playingAudio === track.title ? "⏸" : "▶"}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
                      {track.artist && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{track.artist}</div>}
                    </div>
                    <button onClick={() => setAudio(audio === track.url ? null : track.url)} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 4, border: "none", cursor: "pointer", fontWeight: 600, background: audio === track.url ? cat.color : "rgba(255,255,255,0.1)", color: audio === track.url ? "#000" : "rgba(255,255,255,0.5)", flexShrink: 0 }}>
                      {audio === track.url ? "✓ On" : "Use"}
                    </button>
                  </div>
                ))}
                {/* No tracks found */}
                {!loadingCat && catTracks[cat.id]?.length === 0 && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "8px 0", textAlign: "center" }}>
                    No tracks found — try uploading your own audio
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Timeline ───────────────────────────────────────────────────
const BASE_PX = 3;
const LABEL_W = 160;

function Timeline({ slides, transitions, onSelectSlide, selectedSlide, totalDuration, onResizeSlide, audio, zoomLevel = 1, setZoomLevel, currentFrame = 0, onSeek }) {
  const PX_PER_FRAME = BASE_PX * zoomLevel;
  const scrollRef = useRef(null);
  const resizeRef = useRef(null);

  // Ctrl/Cmd + scroll to zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !setZoomLevel) return;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomLevel(z => Math.min(6, Math.max(0.3, +(z + (e.deltaY > 0 ? -0.15 : 0.15)).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoomLevel]);

  const INTRO = 40, OUTRO = 30;
  const tickEvery = zoomLevel >= 3 ? 10 : zoomLevel >= 1.5 ? 15 : zoomLevel >= 0.8 ? 30 : 60;
  const ticks = [];
  for (let f = 0; f <= totalDuration; f += tickEvery) {
    ticks.push({ f, label: `${String(Math.floor(f / 30 / 60)).padStart(2,"0")}:${String(Math.floor(f / 30) % 60).padStart(2,"0")}` });
  }

  // Build slide timeline positions
  let cursor = INTRO;
  const slideItems = slides.map((slide, i) => {
    const trans = transitions.find(t => t.afterSlideIndex === i - 1);
    const transFrames = (trans && i > 0) ? trans.duration : 0;
    if (transFrames) cursor += transFrames;
    const item = { slide, index: i, from: cursor, duration: slide.duration, trans: trans && i > 0 ? trans : null, transFrom: cursor - transFrames, transFrames };
    cursor += slide.duration;
    return item;
  });

  const startResize = (e, index, currentDuration) => {
    e.stopPropagation(); e.preventDefault();
    resizeRef.current = { index, startX: e.clientX, startDuration: currentDuration };
    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const newFrames = Math.max(15, resizeRef.current.startDuration + Math.round((ev.clientX - resizeRef.current.startX) / PX_PER_FRAME));
      onResizeSlide(resizeRef.current.index, newFrames);
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const totalW = Math.max(totalDuration * PX_PER_FRAME + 120, 500);
  const TRACK_H = 56;
  const AUDIO_H = 22;
  const RULER_H = 24;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#09090f", borderTop: "1px solid rgba(255,255,255,0.07)", userSelect: "none" }}>

      {/* Top bar: zoom controls */}
      <div style={{ height: 28, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0c0c16" }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>TIMELINE</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{slides.length} clips · {(totalDuration/30).toFixed(1)}s</span>
        <button onClick={() => setZoomLevel(z => Math.max(0.3, +(z - 0.25).toFixed(2)))} style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", minWidth: 30, textAlign: "center" }}>{Math.round(zoomLevel * 100)}%</span>
        <button onClick={() => setZoomLevel(z => Math.min(6, +(z + 0.25).toFixed(2)))} style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        <button onClick={() => setZoomLevel(1)} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>fit</button>
      </div>

      {/* Scrollable track area */}
      <div ref={scrollRef} style={{ flex: 1, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "thin", scrollbarColor: `${ACC}33 transparent`, position: "relative" }}>
        <div style={{ width: totalW, position: "relative", minHeight: RULER_H + TRACK_H + AUDIO_H + 4 }}>

          {/* Ruler */}
          <div
            style={{ height: RULER_H, position: "relative", background: "linear-gradient(180deg,#0f0f1e,#0c0c16)", borderBottom: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}
            onClick={e => { if (!onSeek) return; const rect = e.currentTarget.getBoundingClientRect(); onSeek(Math.round(Math.max(0, Math.min(totalDuration, (e.clientX - rect.left) / PX_PER_FRAME)))); }}
          >
            {ticks.map(t => (
              <div key={t.f} style={{ position: "absolute", left: t.f * PX_PER_FRAME, top: 0, height: "100%", pointerEvents: "none" }}>
                <div style={{ width: 1, height: t.f % (tickEvery * 2) === 0 ? 10 : 6, background: "rgba(255,255,255,0.15)", marginTop: t.f % (tickEvery * 2) === 0 ? 8 : 10 }} />
                {t.f % (tickEvery * 2) === 0 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", paddingLeft: 3, position: "absolute", top: 6, whiteSpace: "nowrap" }}>{t.label}</span>}
              </div>
            ))}
            {/* Playhead triangle */}
            <div style={{ position: "absolute", left: currentFrame * PX_PER_FRAME, top: 0, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `8px solid ${ACC}`, transform: "translateX(-5px)", pointerEvents: "none", zIndex: 20 }} />
            <div style={{ position: "absolute", left: currentFrame * PX_PER_FRAME, top: 8, width: 2, height: RULER_H - 8, background: ACC, transform: "translateX(-1px)", pointerEvents: "none", zIndex: 20 }} />
          </div>

          {/* Main slide track */}
          <div style={{ height: TRACK_H, position: "relative", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

            {/* Intro block */}
            <div style={{ position: "absolute", left: 0, width: INTRO * PX_PER_FRAME, top: 6, bottom: 6, background: "rgba(255,255,255,0.04)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: 0.5 }}>INTRO</span>
            </div>

            {/* Slide clips */}
            {slideItems.map(item => {
              const isActive = selectedSlide === item.index;
              const clipW = Math.max(item.duration * PX_PER_FRAME - 2, 4);
              const clipColor = isActive ? ACC : `${ACC}66`;
              const hasThumb = item.slide.image?.startsWith("http");

              return (
                <React.Fragment key={item.index}>
                  {/* Transition marker */}
                  {item.trans && (
                    <div style={{ position: "absolute", left: item.transFrom * PX_PER_FRAME, width: Math.max(item.transFrames * PX_PER_FRAME, 3), top: 6, bottom: 6, background: "rgba(168,85,247,0.35)", borderRadius: 4, border: "1px solid rgba(168,85,247,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3 }}>
                      {item.transFrames * PX_PER_FRAME > 20 && <span style={{ fontSize: 7, color: "rgba(168,85,247,0.9)", fontWeight: 700, letterSpacing: 0.5 }}>{item.trans.type?.replace("_"," ").toUpperCase()}</span>}
                    </div>
                  )}

                  {/* Slide clip */}
                  <div
                    onClick={() => onSelectSlide(isActive ? null : item.index)}
                    style={{ position: "absolute", left: item.from * PX_PER_FRAME, width: clipW, top: 6, bottom: 6, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `1.5px solid ${isActive ? ACC : "rgba(108,99,255,0.3)"}`, boxShadow: isActive ? `0 0 12px ${ACC}66` : "none", zIndex: 4, transition: "box-shadow 0.15s" }}
                  >
                    {/* Thumbnail background */}
                    {hasThumb && <img src={item.slide.image} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} loading="lazy" />}
                    {/* Gradient overlay */}
                    <div style={{ position: "absolute", inset: 0, background: isActive ? `linear-gradient(135deg, ${ACC}99, ${ACC}44)` : "linear-gradient(135deg, rgba(108,99,255,0.5), rgba(108,99,255,0.2))" }} />
                    {/* Label */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 7, paddingRight: 6, gap: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                        {clipW > 40 ? `${item.index + 1}` : ""} {clipW > 70 ? `· ${(item.duration/30).toFixed(1)}s` : ""}
                      </span>
                      {/* Number badge */}
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: isActive ? ACC : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{item.index + 1}</div>
                    </div>
                    {/* Resize handle */}
                    {clipW > 24 && (
                      <div onMouseDown={e => startResize(e, item.index, item.duration)}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 8, cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
                        <div style={{ width: 2, height: 12, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Outro block */}
            <div style={{ position: "absolute", left: (totalDuration - OUTRO) * PX_PER_FRAME, width: OUTRO * PX_PER_FRAME, top: 6, bottom: 6, background: "rgba(255,255,255,0.04)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontWeight: 600, letterSpacing: 0.5 }}>OUTRO</span>
            </div>

            {/* Playhead line */}
            <div style={{ position: "absolute", left: currentFrame * PX_PER_FRAME, top: 0, bottom: 0, width: 2, background: ACC, opacity: 0.9, transform: "translateX(-1px)", pointerEvents: "none", zIndex: 10 }} />
          </div>

          {/* Audio track */}
          <div style={{ height: AUDIO_H, position: "relative", background: "rgba(34,197,94,0.03)" }}>
            {audio && (
              <div style={{ position: "absolute", left: 0, width: totalDuration * PX_PER_FRAME, top: 4, bottom: 4, background: "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(34,197,94,0.15))", borderRadius: 5, border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", paddingLeft: 10, gap: 5 }}>
                <span style={{ fontSize: 9, color: "rgba(34,197,94,0.9)" }}>🎵</span>
                <span style={{ fontSize: 8, color: "rgba(34,197,94,0.7)", fontWeight: 600 }}>AUDIO TRACK</span>
              </div>
            )}
            {/* Playhead line on audio row */}
            <div style={{ position: "absolute", left: currentFrame * PX_PER_FRAME, top: 0, bottom: 0, width: 2, background: ACC, opacity: 0.7, transform: "translateX(-1px)", pointerEvents: "none", zIndex: 10 }} />
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const {
    state, addSlide, updateSlideDuration, removeSlide, reorderSlides, clearTimeline, setCaption,
    addTransition, removeTransition, setTheme, setText, setTextStyle,
    setLayout, setAudio, setAudioVolume, setKenBurns,
    addSticker, removeSticker, updateSticker,
    addTextLayer, removeTextLayer, updateTextLayer,
    addVoiceover, removeVoiceover, updateVoiceover,
    applyTemplate, saveProject, loadProject,
    undo, redo, canUndo, canRedo, reset,
  } = useVideo();
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => localStorage.getItem("chatOpen") === "true");
  const [chatWidth, setChatWidth] = useState(320);
  const [exportOpen, setExportOpen] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Chat panel drag-to-resize
  const dragRef = useRef(null);
  const startChatDrag = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    const onMove = (ev) => {
      const delta = startX - ev.clientX; // dragging left = wider, right = narrower
      setChatWidth(Math.max(220, Math.min(600, startW + delta)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chatWidth]);

  // Player state — RAF polling (more reliable than event listeners)
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      if (playerRef.current) {
        try {
          setCurrentFrame(playerRef.current.getCurrentFrame() ?? 0);
          setIsPlaying(playerRef.current.isPlaying() ?? false);
        } catch {}
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    try { playerRef.current.toggle(); } catch {}
  }, []);

  const totalDuration = calcDuration(state);
  const loadInputRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (!typing && e.key === "f") { e.preventDefault(); setFullscreenPreview(v => !v); }
      if (e.key === "Escape") { setFullscreenPreview(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const seekTo = useCallback((frame) => {
    if (!playerRef.current) return;
    try {
      const f = Math.max(0, Math.round(frame));
      playerRef.current.seekTo(f);
      setCurrentFrame(f);
    } catch {}
  }, []);

  const toggleChat = (val) => {
    const next = val !== undefined ? val : !chatOpen;
    setChatOpen(next);
    localStorage.setItem("chatOpen", next);
  };
  const fileInputRef = useRef(null);

  const actions = { addSlide, updateSlideDuration, removeSlide, reorderSlides, clearTimeline, addTransition, removeTransition, setTheme, setText, setTextStyle, setLayout, setAudio, setAudioVolume, setKenBurns, addSticker, addTextLayer, applyTemplate, setCaption, addVoiceover };

  const resolveImage = (img) => {
    if (!img) return img;
    // blob (local upload), data URI, full URL, or absolute path — pass through as-is
    if (img.startsWith("blob:") || img.startsWith("data:") || img.startsWith("http") || img.startsWith("/")) return img;
    // bare filename → serve from public/assets/
    return `/assets/${img}`;
  };

  const inputProps = {
    slides: state.slides.map((s) => ({ ...s, image: resolveImage(s.image) })),
    transitions: state.transitions,
    theme: { accent: state.theme.accent, bgFrom: state.theme.bgFrom, bgTo: state.theme.bgTo },
    text: { projectName: state.text.projectName, tagline: state.text.tagline, description: state.text.description, handle: state.text.handle },
    textStyle: state.textStyle,
    textLayers: state.textLayers || [],
    stickers: state.stickers || [],
    audioVolume: state.audioVolume ?? 0.4,
    voiceovers: state.voiceovers || [],
    kenBurns: state.kenBurns ?? true,
    layout: state.layout,
    audio: state.audio || null,
  };

  const addLocalFiles = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        const dur = file.type.startsWith("video/") ? 6 : 3;
        addSlide(url, dur);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0c0c14", color: "#fff", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* ── Top Bar ── */}
      <input ref={loadInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && loadProject(e.target.files[0])} />

      <div style={{ height: 48, flexShrink: 0, background: "#0a0a12", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>🎬 <span style={{ color: ACC }}>Reel</span>Studio <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>AI</span></div>
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        {/* Undo / Redo */}
        <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" style={{ ...topBarBtn, opacity: canUndo ? 1 : 0.3 }}>↩</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" style={{ ...topBarBtn, opacity: canRedo ? 1 : 0.3 }}>↪</button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        {/* Save / Load */}
        <button onClick={saveProject} title="Save project" style={topBarBtn}>💾</button>
        <button onClick={() => loadInputRef.current?.click()} title="Load project" style={topBarBtn}>📂</button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{state.slides.length} slides · {(totalDuration / 30).toFixed(1)}s</div>
        <div style={{ flex: 1 }} />
        <select value={state.layout} onChange={(e) => setLayout(e.target.value)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#fff", fontSize: 12, padding: "5px 10px", cursor: "pointer" }}>
          <option value="phone_mockup">📱 Phone Mockup</option>
          <option value="fullscreen">⬛ Fullscreen</option>
        </select>
        <button onClick={() => toggleChat()} style={{
          background: chatOpen ? ACC : `${ACC}22`,
          border: `1px solid ${chatOpen ? ACC : `${ACC}55`}`,
          borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
          padding: "7px 16px", display: "flex", alignItems: "center", gap: 6,
          transition: "all 0.2s",
        }}>
          <span>✦</span> AI {chatOpen ? "▸" : "◂"}
        </button>
        <button onClick={() => setExportOpen(true)} style={{ background: ACC, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "7px 16px" }}>
          Export ↗
        </button>
      </div>

      {/* ── Middle ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* CapCut-style icon sidebar + sliding panel */}
        <CapCutSidebar
          slides={state.slides}
          audio={state.audio}
          selectedSlide={selectedSlide}
          setSelectedSlide={setSelectedSlide}
          addSlide={addSlide}
          setAudio={setAudio}
          addTransition={addTransition}
          setText={setText}
          setTextStyle={setTextStyle}
          setTheme={setTheme}
          resolveImage={resolveImage}
          fileInputRef={fileInputRef}
          addLocalFiles={addLocalFiles}
          state={state}
          onAddPexelsSlide={(url) => addSlide(url, 3)}
          onAddSticker={addSticker}
          onRemoveSticker={removeSticker}
          onUpdateSticker={updateSticker}
          onAddTextLayer={addTextLayer}
          onRemoveTextLayer={removeTextLayer}
          onUpdateTextLayer={updateTextLayer}
          onApplyTemplate={applyTemplate}
          onSetAudioVolume={setAudioVolume}
          onSetKenBurns={setKenBurns}
          setCaption={setCaption}
          reorderSlides={reorderSlides}
          addVoiceover={addVoiceover}
          removeVoiceover={removeVoiceover}
          updateVoiceover={updateVoiceover}
        />

        {/* ── Premium Preview ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#06060e", overflow: "hidden", minHeight: 0, position: "relative" }}>

          {/* Canvas stage */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

            {/* Ambient glow bg */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, rgba(108,99,255,0.08) 0%, transparent 65%)" }} />
            {/* Subtle grid pattern */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

            {/* Top-right actions */}
            <div style={{ position: "absolute", top: 10, right: 10, zIndex: 20, display: "flex", gap: 6 }}>
              {state.audio && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "4px 8px", fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  Audio
                </div>
              )}
              <button onClick={() => setFullscreenPreview(true)} title="Fullscreen (F)"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "rgba(255,255,255,0.5)", cursor: "pointer", width: 28, height: 28, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ⛶
              </button>
            </div>

            {/* Slide counter badge */}
            {state.slides.length > 0 && (
              <div style={{ position: "absolute", top: 10, left: 10, zIndex: 20, fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 9px", letterSpacing: 0.5 }}>
                {state.slides.length} SLIDES · {(totalDuration/30).toFixed(1)}s
              </div>
            )}

            {/* Player with premium shadow */}
            <div style={{ position: "relative", zIndex: 1, filter: `drop-shadow(0 32px 80px rgba(0,0,0,0.95)) drop-shadow(0 0 40px ${ACC}1a)` }}>
              <div style={{ borderRadius: 16, overflow: "hidden", width: 262, height: 465 }}>
                <Player
                  ref={playerRef}
                  key={`${state.layout}-${state.theme.accent}-${state.slides.length}`}
                  component={PortfolioReel}
                  inputProps={inputProps}
                  durationInFrames={totalDuration}
                  fps={30}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  style={{ width: 262, height: 465, display: "block" }}
                  initialFrame={state.slides.length > 0 ? 40 : 0}
                  loop
                  autoPlay
                />
              </div>
              <CanvasOverlay state={state} setTextStyle={setTextStyle} updateSticker={updateSticker} updateTextLayer={updateTextLayer} />
            </div>

            {/* Slide dot indicators below player */}
            {state.slides.length > 1 && (
              <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, zIndex: 10 }}>
                {state.slides.map((_, i) => {
                  const INTRO = 40;
                  let from = INTRO;
                  for (let j = 0; j < i; j++) from += state.slides[j].duration + (state.transitions.find(t => t.afterSlideIndex === j)?.duration || 0);
                  const isActive = currentFrame >= from && currentFrame < from + state.slides[i].duration;
                  return <div key={i} onClick={() => seekTo(from)} style={{ width: isActive ? 20 : 5, height: 5, borderRadius: 5, background: isActive ? ACC : "rgba(255,255,255,0.2)", cursor: "pointer", transition: "all 0.25s", boxShadow: isActive ? `0 0 8px ${ACC}` : "none" }} />;
                })}
              </div>
            )}
          </div>

          {/* ── Premium Controls Bar ── */}
          <div style={{ flexShrink: 0, background: "linear-gradient(180deg, #0a0a16 0%, #0c0c1a 100%)", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "8px 14px 12px" }}>

            {/* Custom seek bar */}
            <div style={{ position: "relative", height: 20, marginBottom: 6, cursor: "pointer" }}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); seekTo(Math.round((e.clientX - r.left) / r.width * totalDuration)); }}
            >
              {/* Track */}
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 3, transform: "translateY(-50%)" }}>
                {/* Progress fill */}
                <div style={{ height: "100%", width: `${(currentFrame / totalDuration) * 100}%`, background: `linear-gradient(90deg, ${ACC}, #9c56ff)`, borderRadius: 3, transition: "width 0.05s" }} />
                {/* Slide markers */}
                {state.slides.map((slide, i) => {
                  let pos = 40;
                  for (let j = 0; j < i; j++) pos += state.slides[j].duration + (state.transitions.find(t => t.afterSlideIndex === j)?.duration || 0);
                  return <div key={i} style={{ position: "absolute", left: `${(pos / totalDuration) * 100}%`, top: -3, width: 1, height: 9, background: `${ACC}80`, borderRadius: 1 }} />;
                })}
              </div>
              {/* Thumb */}
              <div style={{ position: "absolute", top: "50%", left: `${(currentFrame / totalDuration) * 100}%`, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `2px solid ${ACC}`, transform: "translate(-50%, -50%)", boxShadow: `0 0 8px ${ACC}88`, transition: "left 0.05s", pointerEvents: "none" }} />
            </div>

            {/* Controls row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => seekTo(0)} style={ctrlBtn} title="Rewind">⏮</button>
              <button onClick={() => seekTo(Math.max(0, currentFrame - 30))} style={ctrlBtn} title="-1s">−1s</button>

              {/* Play button */}
              <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${ACC}, #9c56ff)`, border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px ${ACC}55`, flexShrink: 0 }}>
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button onClick={() => seekTo(Math.min(totalDuration - 1, currentFrame + 30))} style={ctrlBtn} title="+1s">+1s</button>

              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", letterSpacing: 0.5, marginLeft: 4 }}>
                {formatTime(currentFrame)}<span style={{ color: "rgba(255,255,255,0.2)" }}> / </span>{formatTime(totalDuration)}
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", borderRadius: 5, padding: "3px 7px", letterSpacing: 0.5, textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.07)" }}>
                {state.layout === "phone_mockup" ? "📱" : "⬛"} {state.layout === "phone_mockup" ? "Mockup" : "Full"}
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Panel with drag-to-resize */}
        {chatOpen && (
          <>
            {/* Drag handle */}
            <div
              ref={dragRef}
              onMouseDown={startChatDrag}
              style={{
                width: 5, flexShrink: 0, cursor: "col-resize",
                background: "transparent",
                borderLeft: "1px solid rgba(108,99,255,0.2)",
                position: "relative",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${ACC}44`}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Grip dots */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(108,99,255,0.5)" }} />)}
              </div>
            </div>

            <div style={{ width: chatWidth, flexShrink: 0, background: "#09091a", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
              {/* Premium AI header */}
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(108,99,255,0.15)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(180deg, rgba(108,99,255,0.08) 0%, transparent 100%)" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${ACC}, #9c56ff)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, boxShadow: `0 4px 14px ${ACC}44` }}>✦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>AI Director</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    DeepSeek · Ready
                  </div>
                </div>
                <button onClick={() => toggleChat(false)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.4)", cursor: "pointer", width: 26, height: 26, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <ChatPanel actions={actions} state={state} />
            </div>
          </>
        )}

      </div>

      {/* ── Fullscreen Preview ── */}
      {fullscreenPreview && (
        <div
          onClick={() => setFullscreenPreview(false)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", borderRadius: 20, overflow: "hidden", boxShadow: `0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)` }}>
            <Player
              component={PortfolioReel}
              inputProps={inputProps}
              durationInFrames={totalDuration}
              fps={30}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: 360, height: 640 }}
              initialFrame={state.slides.length > 0 ? 40 : 0}
              controls
              loop
              autoPlay
            />
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 1 }}>Click anywhere to close · {(totalDuration / 30).toFixed(1)}s · {state.slides.length} slides</div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {exportOpen && (
        <ExportModal
          onClose={() => setExportOpen(false)}
          inputProps={inputProps}
          totalDuration={totalDuration}
        />
      )}

      {/* ── Timeline ── */}
      <div style={{ height: 240, flexShrink: 0, background: "#13131f", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column" }}>

        {/* Timeline header with zoom controls */}
        <div style={{ padding: "5px 12px 4px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Timeline</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{(totalDuration / 30).toFixed(1)}s · {state.slides.length} slides</span>
          <div style={{ flex: 1 }} />

          {/* Zoom controls */}
          <button onClick={() => setZoomLevel(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} style={tlBtn} title="Zoom out">－</button>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="range" min={0.25} max={4} step={0.05}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(+e.target.value)}
              style={{ width: 80, accentColor: ACC, cursor: "pointer" }}
            />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", minWidth: 34 }}>{Math.round(zoomLevel * 100)}%</span>
          </div>
          <button onClick={() => setZoomLevel(z => Math.min(4, +(z + 0.25).toFixed(2)))} style={tlBtn} title="Zoom in">＋</button>
          <button onClick={() => setZoomLevel(1)} style={{ ...tlBtn, color: "rgba(255,255,255,0.3)" }} title="Reset zoom">⊙</button>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          <Timeline
            slides={state.slides}
            transitions={state.transitions}
            onSelectSlide={setSelectedSlide}
            selectedSlide={selectedSlide}
            totalDuration={totalDuration}
            onResizeSlide={updateSlideDuration}
            audio={state.audio}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            currentFrame={currentFrame}
            onSeek={seekTo}
          />
        </div>
      </div>

    </div>
  );
}

const panelHeader = { padding: "10px 14px 8px", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 };
const labelStyle = { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 };
const fieldInput = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" };
// ── Canvas Interactive Overlay ─────────────────────────────────
const PREVIEW_W = 248;
const PREVIEW_H = 440;
const COMP_W = 1080;
const COMP_H = 1920;
const SX = PREVIEW_W / COMP_W;
const SY = PREVIEW_H / COMP_H;

// Default bottom-of-composition positions for main text fields
const TEXT_DEFAULTS = {
  projectName: { bottom: 290, label: "Title" },
  tagline:     { bottom: 230, label: "Tagline" },
  description: { bottom: 155, label: "Description" },
  handle:      { bottom: 75,  label: "Handle" },
};

function CanvasOverlay({ state, setTextStyle, updateSticker, updateTextLayer }) {
  const [selected, setSelected] = useState(null); // { type, id }
  const [drag, setDrag]         = useState(null);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;

      if (drag.type === "text") {
        // Drag up (negative screen dy) → increase yOffset (higher in comp)
        const dyComp = Math.round(-dy / SY);
        setTextStyle(drag.id, { yOffset: drag.startYOffset + dyComp });

      } else if (drag.type === "sticker") {
        updateSticker(drag.id, {
          x: Math.max(2, Math.min(98, drag.startX + (dx / PREVIEW_W) * 100)),
          y: Math.max(2, Math.min(98, drag.startY + (dy / PREVIEW_H) * 100)),
        });

      } else if (drag.type === "textLayer") {
        updateTextLayer(drag.id, {
          x: Math.max(2, Math.min(98, drag.startX + (dx / PREVIEW_W) * 100)),
          y: Math.max(2, Math.min(98, drag.startY + (dy / PREVIEW_H) * 100)),
        });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [drag, setTextStyle, updateSticker, updateTextLayer]);

  const startDrag = (e, type, id, initial) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected({ type, id });
    setDrag({ type, id, startMouseX: e.clientX, startMouseY: e.clientY, ...initial });
  };

  const isSel = (type, id) => selected?.type === type && selected?.id === id;
  const ts = state.textStyle || {};
  const isDragging = !!drag;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
      style={{
        position: "absolute", inset: 0, zIndex: 10,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* ── Main text element handles ── */}
      {Object.entries(TEXT_DEFAULTS).map(([field, { bottom: defBottom, label }]) => {
        const yOffset    = ts[field]?.yOffset || 0;
        const bottomComp = defBottom + yOffset;
        const previewBot = bottomComp * SY;
        const sel        = isSel("text", field);

        return (
          <div
            key={field}
            title={`Drag to move ${label}`}
            onMouseDown={(e) => startDrag(e, "text", field, { startYOffset: yOffset })}
            style={{
              position:  "absolute",
              bottom:    previewBot - 12,
              left:      8, right: 8,
              height:    24,
              cursor:    "ns-resize",
              borderRadius: 5,
              border:    `1.5px solid ${sel ? ACC : "transparent"}`,
              background: sel ? `${ACC}18` : "transparent",
              display:   "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.12s, background 0.12s",
            }}
            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = `${ACC}88`; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = "transparent"; }}
          >
            {sel && (
              <div style={{ fontSize: 8, color: ACC, background: "#09091a", padding: "1px 7px", borderRadius: 3, pointerEvents: "none", letterSpacing: 0.5 }}>
                {label} · ↕ {yOffset > 0 ? `+${yOffset}` : yOffset}px
              </div>
            )}
          </div>
        );
      })}

      {/* ── Sticker handles ── */}
      {(state.stickers || []).map(sticker => {
        const px  = (sticker.x / 100) * PREVIEW_W;
        const py  = (sticker.y / 100) * PREVIEW_H;
        const sel = isSel("sticker", sticker.id);
        const sz  = Math.max(16, sticker.size * SY);

        return (
          <div
            key={sticker.id}
            title="Drag to move sticker"
            onMouseDown={(e) => startDrag(e, "sticker", sticker.id, { startX: sticker.x, startY: sticker.y })}
            style={{
              position:  "absolute",
              left:      px, top: py,
              transform: "translate(-50%, -50%)",
              cursor:    sel ? "grabbing" : "grab",
              fontSize:  sz,
              lineHeight: 1,
              userSelect: "none",
              padding:   4,
              borderRadius: 8,
              border:    `2px solid ${sel ? ACC : "rgba(255,255,255,0.0)"}`,
              background: sel ? `${ACC}22` : "transparent",
              transition: "border-color 0.12s",
              zIndex:    2,
            }}
            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = "rgba(255,255,255,0)"; }}
          >
            {sticker.emoji}
            {sel && (
              <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: ACC, background: "#09091a", padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap" }}>
                {Math.round(sticker.x)}%, {Math.round(sticker.y)}%
              </div>
            )}
          </div>
        );
      })}

      {/* ── Text layer handles ── */}
      {(state.textLayers || []).map(layer => {
        const px  = (layer.x / 100) * PREVIEW_W;
        const py  = (layer.y / 100) * PREVIEW_H;
        const sel = isSel("textLayer", layer.id);
        const fs  = Math.max(9, layer.fontSize * SY);

        return (
          <div
            key={layer.id}
            title="Drag to move text"
            onMouseDown={(e) => startDrag(e, "textLayer", layer.id, { startX: layer.x, startY: layer.y })}
            style={{
              position:   "absolute",
              left:       px, top: py,
              transform:  `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
              cursor:     sel ? "grabbing" : "grab",
              fontSize:   fs,
              fontWeight: layer.fontWeight || 700,
              fontFamily: `'${layer.fontFamily || "Inter"}', sans-serif`,
              color:      layer.color || "#fff",
              whiteSpace: "nowrap",
              userSelect: "none",
              padding:    "3px 7px",
              borderRadius: 5,
              border:     `1.5px solid ${sel ? ACC : "rgba(255,255,255,0)"}`,
              background: sel ? `${ACC}22` : "rgba(0,0,0,0.25)",
              zIndex:     2,
            }}
            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor = "rgba(255,255,255,0)"; }}
          >
            {layer.content}
            {sel && (
              <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: ACC, background: "#09091a", padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap" }}>
                {Math.round(layer.x)}%, {Math.round(layer.y)}%
              </div>
            )}
          </div>
        );
      })}

      {/* Deselect hint when nothing selected */}
      {!selected && (
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.2)", pointerEvents: "none", letterSpacing: 0.5 }}>
          Click text · stickers · layers to select & drag
        </div>
      )}
    </div>
  );
}

const topBarBtn = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.7)", cursor: "pointer", width: 30, height: 30, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" };
const ctrlBtn = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.6)", cursor: "pointer", width: 32, height: 32, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" };
const tlBtn = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer", width: 26, height: 22, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };

function formatTime(frames) {
  const secs = frames / 30;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const f = Math.floor((secs % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${f}`;
}
