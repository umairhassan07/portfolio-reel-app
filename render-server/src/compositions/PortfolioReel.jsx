import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Sequence, Audio, Video,
} from "remotion";
import { getTransitionStyle, getOutgoingStyle } from "./transitions";

const INTRO = 40;
const OUTRO = 30;

const DEFAULT_TEXT_STYLE = {
  projectName:  { fontSize: 58,  color: "#ffffff",               fontFamily: "Inter",  fontWeight: 800, align: "center", yOffset: 0 },
  tagline:      { fontSize: 32,  color: null,                    fontFamily: "Inter",  fontWeight: 500, align: "center", yOffset: 0 },
  description:  { fontSize: 26,  color: "rgba(255,255,255,0.65)",fontFamily: "Inter",  fontWeight: 400, align: "center", yOffset: 0 },
  handle:       { fontSize: 28,  color: "rgba(255,255,255,0.9)", fontFamily: "Inter",  fontWeight: 700, align: "center", yOffset: 0 },
};

function buildTimeline(slides, transitions) {
  const timeline = [];
  let cursor = INTRO;
  slides.forEach((slide, i) => {
    const trans = transitions.find(t => t.afterSlideIndex === i - 1);
    if (trans && i > 0) {
      timeline.push({ type: "transition", ...trans, from: cursor });
      cursor += trans.duration;
    }
    timeline.push({ ...slide, type: "slide", index: i, from: cursor });
    cursor += slide.duration;
  });
  return { timeline, totalFrames: cursor + OUTRO };
}

function SlideUp({ children, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px)` }}>
      {children}
    </div>
  );
}

function SlideLayer({ slide, transitionIn, transitionOut, layout, kenBurns }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let outerStyle = { width: "100%", height: "100%" };

  if (transitionIn) {
    const p = interpolate(frame, [0, transitionIn.duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    outerStyle = { ...outerStyle, ...getTransitionStyle(p, transitionIn.type) };
  }
  if (transitionOut) {
    const localFrame = frame - (slide.duration - transitionOut.duration);
    const p = interpolate(localFrame, [0, transitionOut.duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    outerStyle = { ...outerStyle, ...getOutgoingStyle(p, transitionOut.type) };
  }

  // Ken Burns pan/zoom
  const dur = slide.duration || 90;
  const kbScale = kenBurns ? interpolate(frame, [0, dur], [1, 1.09], { extrapolateRight: "clamp" }) : 1;
  const kbX     = kenBurns ? interpolate(frame, [0, dur], [0, -18],  { extrapolateRight: "clamp" }) : 0;
  const kbY     = kenBurns ? interpolate(frame, [0, dur], [0, -8],   { extrapolateRight: "clamp" }) : 0;
  const kbStyle = { transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`, transformOrigin: "center center" };

  const floatY = Math.sin(frame / 30) * 6;
  const isVideo = slide.type === "video";

  if (layout === "fullscreen") {
    return (
      <div style={{ ...outerStyle, position: "absolute", inset: 0, overflow: "hidden" }}>
        {isVideo
          ? <Video src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <img src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }} />
        }
        {slide.caption && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", padding: "16px 40px", textAlign: "center", fontSize: 32, color: "#fff", fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
            {slide.caption}
          </div>
        )}
      </div>
    );
  }

  // phone_mockup
  const phoneIn = spring({ frame, fps, config: { damping: 16, stiffness: 100, mass: 1 } });
  const phoneScale = interpolate(phoneIn, [0, 1], [0.7, 1]);

  return (
    <div style={{ ...outerStyle, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        transform: `scale(${phoneScale}) translateY(${floatY}px)`,
        width: 380, height: 720, borderRadius: 44,
        border: "10px solid rgba(255,255,255,0.15)", background: "#111",
        boxShadow: "0 40px 120px rgba(0,0,0,0.7)", overflow: "hidden", position: "relative",
      }}>
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 90, height: 22, background: "#111", borderRadius: 20, zIndex: 10 }} />
        {isVideo
          ? <Video src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          : <img src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", ...kbStyle }} />
        }
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)" }} />
        {slide.caption && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", padding: "12px 20px", textAlign: "center", fontSize: 22, color: "#fff", fontFamily: "'Inter', sans-serif", lineHeight: 1.4, zIndex: 5 }}>
            {slide.caption}
          </div>
        )}
      </div>
    </div>
  );
}

export function PortfolioReel({
  slides = [],
  transitions = [],
  theme = { accent: "#6C63FF", bgFrom: "#0f0c29", bgTo: "#302b63" },
  text = { projectName: "My Portfolio Project", tagline: "Built with React", description: "A modern web app.", handle: "@umair.dev" },
  textStyle = DEFAULT_TEXT_STYLE,
  textLayers = [],
  stickers = [],
  voiceovers = [],
  audioVolume = 0.4,
  kenBurns = true,
  layout = "phone_mockup",
  audio = null,
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { timeline } = buildTimeline(slides, transitions);

  const ts = {
    projectName:  { ...DEFAULT_TEXT_STYLE.projectName,  ...(textStyle?.projectName  || {}) },
    tagline:      { ...DEFAULT_TEXT_STYLE.tagline,      ...(textStyle?.tagline      || {}) },
    description:  { ...DEFAULT_TEXT_STYLE.description,  ...(textStyle?.description  || {}) },
    handle:       { ...DEFAULT_TEXT_STYLE.handle,       ...(textStyle?.handle       || {}) },
  };

  const fadeOut = interpolate(frame, [durationInFrames - OUTRO, durationInFrames - 5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shimmer = interpolate(frame, [0, durationInFrames], [135, 270]);

  const alignStyle = (a) => a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${shimmer}deg, ${theme.bgFrom}, ${theme.bgTo})`,
      opacity: fadeOut,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: "hidden",
    }}>
      {/* Background music */}
      {audio && <Audio src={audio} volume={audioVolume} />}

      {/* Per-slide voiceovers — each synced to its slide's timeline position */}
      {voiceovers.filter(v => v.audioUrl).map(vo => {
        const slideEntry = timeline.find(t => t.type === "slide" && t.index === vo.slideIndex);
        if (!slideEntry) return null;
        return (
          <Sequence key={vo.id} from={slideEntry.from} durationInFrames={slideEntry.duration}>
            <Audio src={vo.audioUrl} volume={vo.volume ?? 0.9} />
          </Sequence>
        );
      })}

      {/* Glow blobs */}
      <div style={{ position: "absolute", top: -200, left: -200, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${theme.accent}33 0%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #ff6b6b22 0%, transparent 70%)", filter: "blur(80px)", pointerEvents: "none" }} />

      {/* Top badge */}
      <Sequence from={10}>
        <div style={{ position: "absolute", top: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <SlideUp>
            <div style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}66`, borderRadius: 100, padding: "10px 30px", color: theme.accent, fontSize: 28, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              Portfolio Showcase
            </div>
          </SlideUp>
        </div>
      </Sequence>

      {/* Slides */}
      {slides.length === 0 ? (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.2)", fontSize: 28, textAlign: "center" }}>
          Ask AI to add slides →
        </div>
      ) : (
        timeline.filter(t => t.type === "slide").map(item => {
          const transIn  = transitions.find(t => t.afterSlideIndex === item.index - 1);
          const transOut = transitions.find(t => t.afterSlideIndex === item.index);
          return (
            <Sequence key={item.id} from={item.from} durationInFrames={item.duration + (transOut?.duration || 0)}>
              <SlideLayer slide={item} transitionIn={transIn} transitionOut={transOut} layout={layout} kenBurns={kenBurns} />
            </Sequence>
          );
        })
      )}

      {/* Slide dots */}
      {slides.length > 1 && (() => {
        const activeSlide = timeline.filter(t => t.type === "slide").findIndex(t => frame >= t.from && frame < t.from + t.duration);
        return (
          <div style={{ position: "absolute", bottom: 340, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === activeSlide ? 26 : 10, height: 10, borderRadius: 10, background: i === activeSlide ? theme.accent : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
            ))}
          </div>
        );
      })()}

      {/* ── Text Overlays — only render when slides exist ── */}
      {slides.length > 0 && layout === "fullscreen" && (
        // Fullscreen: cinematic gradient overlay with text on image
        <>
          {/* Dark gradient at bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 700, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, transparent 75%)", pointerEvents: "none" }} />

          <Sequence from={20}>
            <div style={{ position: "absolute", bottom: 290 + (ts.projectName.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.projectName.align), padding: "0 80px" }}>
              <SlideUp><div style={{ fontSize: ts.projectName.fontSize, fontWeight: ts.projectName.fontWeight, fontFamily: `'${ts.projectName.fontFamily}', sans-serif`, color: ts.projectName.color || "#fff", textAlign: ts.projectName.align, lineHeight: 1.05, letterSpacing: -1 }}>{text.projectName}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={30}>
            <div style={{ position: "absolute", bottom: 220 + (ts.tagline.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.tagline.align), padding: "0 80px" }}>
              <SlideUp><div style={{ fontSize: ts.tagline.fontSize, fontWeight: ts.tagline.fontWeight, fontFamily: `'${ts.tagline.fontFamily}', sans-serif`, color: ts.tagline.color || theme.accent, textAlign: ts.tagline.align }}>{text.tagline}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={42}>
            <div style={{ position: "absolute", bottom: 140 + (ts.description.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.description.align), padding: "0 80px" }}>
              <SlideUp><div style={{ fontSize: ts.description.fontSize, fontWeight: ts.description.fontWeight, fontFamily: `'${ts.description.fontFamily}', sans-serif`, color: ts.description.color || "rgba(255,255,255,0.75)", textAlign: ts.description.align, lineHeight: 1.5, whiteSpace: "pre-line" }}>{text.description}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={55}>
            <div style={{ position: "absolute", bottom: 60 + (ts.handle.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.handle.align), padding: "0 80px" }}>
              <SlideUp>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent }} />
                  <div style={{ fontSize: ts.handle.fontSize, fontWeight: ts.handle.fontWeight, fontFamily: `'${ts.handle.fontFamily}', sans-serif`, color: ts.handle.color || "rgba(255,255,255,0.85)" }}>{text.handle}</div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.accent }} />
                </div>
              </SlideUp>
            </div>
          </Sequence>
        </>
      )}

      {slides.length > 0 && layout !== "fullscreen" && (
        // Phone mockup: text below the phone in the composition
        <>
          <Sequence from={20}>
            <div style={{ position: "absolute", bottom: 290 + (ts.projectName.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.projectName.align), padding: "0 60px" }}>
              <SlideUp><div style={{ fontSize: ts.projectName.fontSize, fontWeight: ts.projectName.fontWeight, fontFamily: `'${ts.projectName.fontFamily}', sans-serif`, color: ts.projectName.color || "#fff", textAlign: ts.projectName.align, lineHeight: 1.1, letterSpacing: -1, textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>{text.projectName}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={33}>
            <div style={{ position: "absolute", bottom: 230 + (ts.tagline.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.tagline.align), padding: "0 60px" }}>
              <SlideUp><div style={{ fontSize: ts.tagline.fontSize, fontWeight: ts.tagline.fontWeight, fontFamily: `'${ts.tagline.fontFamily}', sans-serif`, color: ts.tagline.color || theme.accent, textAlign: ts.tagline.align }}>{text.tagline}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={46}>
            <div style={{ position: "absolute", bottom: 155 + (ts.description.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.description.align), padding: "0 80px" }}>
              <SlideUp><div style={{ fontSize: ts.description.fontSize, fontWeight: ts.description.fontWeight, fontFamily: `'${ts.description.fontFamily}', sans-serif`, color: ts.description.color, textAlign: ts.description.align, lineHeight: 1.5, whiteSpace: "pre-line" }}>{text.description}</div></SlideUp>
            </div>
          </Sequence>
          <Sequence from={60}>
            <div style={{ position: "absolute", bottom: 75 + (ts.handle.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.handle.align), padding: "0 60px" }}>
              <SlideUp>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent }} />
                  <div style={{ fontSize: ts.handle.fontSize, fontWeight: ts.handle.fontWeight, fontFamily: `'${ts.handle.fontFamily}', sans-serif`, color: ts.handle.color }}>{text.handle}</div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent }} />
                </div>
              </SlideUp>
            </div>
          </Sequence>
        </>
      )}

      {/* ── Custom Text Layers ── */}
      {textLayers.map(layer => {
        const currentSlide = timeline.filter(t => t.type === "slide").findIndex(t => frame >= t.from && frame < t.from + t.duration);
        if (layer.slideIndex !== -1 && layer.slideIndex !== currentSlide) return null;
        return (
          <div key={layer.id} style={{
            position: "absolute",
            left: `${layer.x}%`, top: `${layer.y}%`,
            transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
            fontSize: layer.fontSize, fontWeight: layer.fontWeight || 700,
            fontFamily: `'${layer.fontFamily || "Inter"}', sans-serif`,
            color: layer.color || "#ffffff",
            textAlign: "center",
            whiteSpace: "nowrap",
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}>
            {layer.content}
          </div>
        );
      })}

      {/* ── Stickers ── */}
      {stickers.map(sticker => (
        <div key={sticker.id} style={{
          position: "absolute",
          left: `${sticker.x}%`, top: `${sticker.y}%`,
          transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg)`,
          fontSize: sticker.size || 80,
          lineHeight: 1,
          pointerEvents: "none",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        }}>
          {sticker.emoji}
        </div>
      ))}
    </AbsoluteFill>
  );
}
