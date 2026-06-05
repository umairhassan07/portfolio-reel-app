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

// ── Animation primitives ────────────────────────────────────────

function BlurReveal({ children, delay = 0, from = "bottom" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const p = spring({ frame: f, fps, config: { damping: 18, stiffness: 100, mass: 0.6 } });
  const opacity = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = interpolate(f, [0, 18], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dy = from === "bottom" ? interpolate(p, [0, 1], [40, 0]) : interpolate(p, [0, 1], [-30, 0]);
  const scale = interpolate(p, [0, 1], [0.94, 1]);
  return (
    <div style={{ opacity, transform: `translateY(${dy}px) scale(${scale})`, filter: `blur(${blur}px)` }}>
      {children}
    </div>
  );
}

function WordReveal({ text, delay = 0, style = {} }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = (text || "").split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: style.textAlign === "left" ? "flex-start" : style.textAlign === "right" ? "flex-end" : "center", gap: "0 10px", ...style }}>
      {words.map((word, i) => {
        const f = frame - delay - i * 4;
        const p = spring({ frame: f, fps, config: { damping: 16, stiffness: 130, mass: 0.5 } });
        const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const dy = interpolate(p, [0, 1], [30, 0]);
        return (
          <span key={i} style={{ display: "inline-block", opacity, transform: `translateY(${dy}px)` }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

// ── Background layers ───────────────────────────────────────────

function AnimatedBackground({ accent, bgFrom, bgTo, frame, durationInFrames }) {
  const shimmer = interpolate(frame, [0, durationInFrames], [135, 290]);
  // Pulsing orbs
  const pulse1 = 0.7 + 0.3 * Math.sin(frame / 45);
  const pulse2 = 0.6 + 0.4 * Math.cos(frame / 60);
  const drift1X = Math.sin(frame / 80) * 60;
  const drift1Y = Math.cos(frame / 100) * 40;
  const drift2X = Math.cos(frame / 70) * 50;
  const drift2Y = Math.sin(frame / 90) * 35;

  return (
    <>
      {/* Base gradient */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${shimmer}deg, ${bgFrom}, ${bgTo})` }} />

      {/* Primary accent orb */}
      <div style={{
        position: "absolute",
        top: `calc(-15% + ${drift1Y}px)`, left: `calc(-15% + ${drift1X}px)`,
        width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}55 0%, ${accent}11 50%, transparent 75%)`,
        filter: "blur(80px)",
        opacity: pulse1,
        pointerEvents: "none",
      }} />

      {/* Secondary warm orb */}
      <div style={{
        position: "absolute",
        bottom: `calc(-20% + ${drift2Y}px)`, right: `calc(-20% + ${drift2X}px)`,
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,100,150,0.25) 0%, transparent 70%)",
        filter: "blur(100px)",
        opacity: pulse2,
        pointerEvents: "none",
      }} />

      {/* Mid accent highlight */}
      <div style={{
        position: "absolute",
        top: "30%", left: "50%",
        transform: `translateX(-50%) translateY(${Math.sin(frame / 55) * 20}px)`,
        width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />

      {/* Noise grain overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        opacity: 0.04,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }} />

      {/* Subtle vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        pointerEvents: "none",
      }} />

      {/* Light leak — diagonal streak */}
      <div style={{
        position: "absolute",
        top: -200, left: -100,
        width: 300, height: 1800,
        background: `linear-gradient(to bottom, transparent, ${accent}12, transparent)`,
        transform: `rotate(${25 + Math.sin(frame / 120) * 3}deg)`,
        opacity: 0.6,
        pointerEvents: "none",
      }} />
    </>
  );
}

function Particles({ accent, frame }) {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const speed = 0.3 + (i % 4) * 0.15;
    const x = ((i * 137.5 + frame * speed) % 110) - 5;
    const y = ((i * 97.3 + frame * speed * 0.7) % 110) - 5;
    const opacity = 0.15 + 0.15 * Math.sin(frame / 20 + i);
    const size = 2 + (i % 3);
    return { x, y, opacity, size };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: accent,
          opacity: p.opacity,
          filter: "blur(1px)",
        }} />
      ))}
    </div>
  );
}

// ── Cinematic intro flash ───────────────────────────────────────

function IntroFlash({ frame }) {
  const opacity = interpolate(frame, [0, 8, 20], [1, 0.3, 0], { extrapolateRight: "clamp" });
  if (opacity <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: "#000", opacity, pointerEvents: "none", zIndex: 50 }} />;
}

// ── Phone mockup ────────────────────────────────────────────────

function PhoneMockup({ frame, fps, slide, kenBurns, accent }) {
  const entryP = spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1.1 } });
  const scale = interpolate(entryP, [0, 1], [0.65, 1]);
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const floatY = Math.sin(frame / 35) * 7;
  const floatRotate = Math.sin(frame / 55) * 0.8;

  const dur = slide?.duration || 90;
  const kbScale = kenBurns ? interpolate(frame, [0, dur], [1, 1.08], { extrapolateRight: "clamp" }) : 1;
  const kbX = kenBurns ? interpolate(frame, [0, dur], [0, -15], { extrapolateRight: "clamp" }) : 0;
  const kbY = kenBurns ? interpolate(frame, [0, dur], [0, -8], { extrapolateRight: "clamp" }) : 0;

  const isVideo = slide?.type === "video";

  return (
    <div style={{
      opacity,
      transform: `scale(${scale}) translateY(${floatY}px) rotate(${floatRotate}deg)`,
      position: "relative",
      width: 370, height: 740,
      filter: `drop-shadow(0 60px 80px rgba(0,0,0,0.8)) drop-shadow(0 0 40px ${accent}33)`,
    }}>
      {/* Outer shell */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: 50,
        background: "linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.2) 100%)",
        border: "1.5px solid rgba(255,255,255,0.18)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.3)",
      }} />

      {/* Screen */}
      <div style={{
        position: "absolute", inset: 8,
        borderRadius: 44, background: "#0a0a0a", overflow: "hidden",
      }}>
        {slide?.image ? (
          isVideo
            ? <Video src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            : <img src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`, transformOrigin: "center center" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: 20, textAlign: "center", padding: 40 }}>
            Add images via AI →
          </div>
        )}

        {/* Screen glare */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 45%)", pointerEvents: "none" }} />

        {/* Bottom gradient for caption */}
        {slide?.caption && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", display: "flex", alignItems: "flex-end", padding: "0 18px 18px" }}>
            <div style={{ fontSize: 20, color: "#fff", fontFamily: "Inter, sans-serif", lineHeight: 1.4, textAlign: "center", width: "100%" }}>{slide.caption}</div>
          </div>
        )}
      </div>

      {/* Dynamic Island */}
      <div style={{
        position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
        width: 100, height: 28, borderRadius: 20,
        background: "#000",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
        zIndex: 10,
      }} />

      {/* Home indicator */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 4, borderRadius: 4,
        background: "rgba(255,255,255,0.35)",
        zIndex: 10,
      }} />

      {/* Side button */}
      <div style={{ position: "absolute", right: -3, top: 160, width: 3, height: 60, borderRadius: "0 3px 3px 0", background: "rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", left: -3, top: 130, width: 3, height: 40, borderRadius: "3px 0 0 3px", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", left: -3, top: 185, width: 3, height: 40, borderRadius: "3px 0 0 3px", background: "rgba(255,255,255,0.1)" }} />
      <div style={{ position: "absolute", left: -3, top: 240, width: 3, height: 40, borderRadius: "3px 0 0 3px", background: "rgba(255,255,255,0.1)" }} />
    </div>
  );
}

// ── Fullscreen slide layer ──────────────────────────────────────

function SlideLayer({ slide, transitionIn, transitionOut, layout, kenBurns, accent }) {
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

  const dur = slide.duration || 90;
  const kbScale = kenBurns ? interpolate(frame, [0, dur], [1.08, 1], { extrapolateRight: "clamp" }) : 1;
  const kbX = kenBurns ? interpolate(frame, [0, dur], [10, -10], { extrapolateRight: "clamp" }) : 0;
  const kbY = kenBurns ? interpolate(frame, [0, dur], [5, -5], { extrapolateRight: "clamp" }) : 0;
  const kbStyle = { transform: `scale(${kbScale}) translate(${kbX}px, ${kbY}px)`, transformOrigin: "center center" };

  const isVideo = slide.type === "video";

  if (layout === "fullscreen") {
    return (
      <div style={{ ...outerStyle, position: "absolute", inset: 0, overflow: "hidden" }}>
        {isVideo
          ? <Video src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <img src={slide.image} style={{ width: "100%", height: "100%", objectFit: "cover", ...kbStyle }} />
        }
        {/* Cinematic colour grade overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%)", pointerEvents: "none" }} />
        {/* Subtle tint */}
        <div style={{ position: "absolute", inset: 0, background: `${accent}0a`, mixBlendMode: "color", pointerEvents: "none" }} />
      </div>
    );
  }

  // phone_mockup — render nothing here (phone is rendered separately)
  return null;
}

// ── Badge ───────────────────────────────────────────────────────

function Badge({ accent, frame }) {
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(
    spring({ frame, fps: 30, config: { damping: 14, stiffness: 120, mass: 0.7 } }),
    [0, 1], [0.7, 1]
  );
  return (
    <div style={{ opacity, transform: `scale(${scale})`, display: "inline-flex", alignItems: "center", gap: 10, background: `linear-gradient(135deg, ${accent}20, ${accent}10)`, border: `1px solid ${accent}50`, borderRadius: 100, padding: "10px 28px", backdropFilter: "blur(10px)" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <span style={{ color: accent, fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>
        Portfolio Showcase
      </span>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent, boxShadow: `0 0 8px ${accent}` }} />
    </div>
  );
}

// ── Handle pill ─────────────────────────────────────────────────

function HandlePill({ text: handleText, accent, frame, style }) {
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(
    spring({ frame, fps: 30, config: { damping: 16, stiffness: 110, mass: 0.8 } }),
    [0, 1], [0.85, 1]
  );
  return (
    <div style={{ opacity, transform: `scale(${scale})`, display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 36, height: 2, background: `linear-gradient(to right, transparent, ${accent})`, borderRadius: 2 }} />
      <span style={{ fontSize: style?.fontSize || 26, fontWeight: style?.fontWeight || 700, fontFamily: `'${style?.fontFamily || "Inter"}', sans-serif`, color: style?.color || "rgba(255,255,255,0.85)", letterSpacing: 1 }}>
        {handleText}
      </span>
      <div style={{ width: 36, height: 2, background: `linear-gradient(to left, transparent, ${accent})`, borderRadius: 2 }} />
    </div>
  );
}

// ── Slide progress bar ──────────────────────────────────────────

function SlideProgressDots({ slides, activeIndex, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
      {slides.map((_, i) => {
        const isActive = i === activeIndex;
        const width = isActive ? 28 : 8;
        return (
          <div key={i} style={{
            width, height: 8, borderRadius: 8,
            background: isActive ? accent : "rgba(255,255,255,0.2)",
            boxShadow: isActive ? `0 0 10px ${accent}80` : "none",
            transition: "all 0.3s",
          }} />
        );
      })}
    </div>
  );
}

// ── Main composition ────────────────────────────────────────────

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
  const { fps, durationInFrames } = useVideoConfig();
  const { timeline } = buildTimeline(slides, transitions);

  const ts = {
    projectName:  { ...DEFAULT_TEXT_STYLE.projectName,  ...(textStyle?.projectName  || {}) },
    tagline:      { ...DEFAULT_TEXT_STYLE.tagline,      ...(textStyle?.tagline      || {}) },
    description:  { ...DEFAULT_TEXT_STYLE.description,  ...(textStyle?.description  || {}) },
    handle:       { ...DEFAULT_TEXT_STYLE.handle,       ...(textStyle?.handle       || {}) },
  };

  const fadeOut = interpolate(frame, [durationInFrames - OUTRO, durationInFrames - 4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const introScale = interpolate(frame, [0, INTRO], [1.04, 1], { extrapolateRight: "clamp" });

  const alignStyle = (a) => a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

  // Active slide index for dots
  const activeSlideIdx = timeline.filter(t => t.type === "slide").findIndex(t => frame >= t.from && frame < t.from + t.duration);

  // Which slide is currently on screen (for phone_mockup)
  const activeSlideEntry = timeline.filter(t => t.type === "slide").find(t => frame >= t.from && frame < t.from + t.duration + 30);
  const currentSlide = activeSlideEntry ? slides[activeSlideEntry.index] : null;
  const slideLocalFrame = activeSlideEntry ? frame - activeSlideEntry.from : 0;

  return (
    <AbsoluteFill style={{
      opacity: fadeOut,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: "hidden",
      transform: `scale(${introScale})`,
      transformOrigin: "center center",
    }}>
      {/* ── Background system ── */}
      <AnimatedBackground accent={theme.accent} bgFrom={theme.bgFrom} bgTo={theme.bgTo} frame={frame} durationInFrames={durationInFrames} />
      <Particles accent={theme.accent} frame={frame} />

      {/* ── Audio ── */}
      {audio && <Audio src={audio} volume={audioVolume} />}
      {voiceovers.filter(v => v.audioUrl).map(vo => {
        const slideEntry = timeline.find(t => t.type === "slide" && t.index === vo.slideIndex);
        if (!slideEntry) return null;
        return (
          <Sequence key={vo.id} from={slideEntry.from} durationInFrames={slideEntry.duration}>
            <Audio src={vo.audioUrl} volume={vo.volume ?? 0.9} />
          </Sequence>
        );
      })}

      {/* ── Fullscreen slides ── */}
      {layout === "fullscreen" && slides.length > 0 && timeline.filter(t => t.type === "slide").map(item => {
        const transIn  = transitions.find(t => t.afterSlideIndex === item.index - 1);
        const transOut = transitions.find(t => t.afterSlideIndex === item.index);
        return (
          <Sequence key={item.id} from={item.from} durationInFrames={item.duration + (transOut?.duration || 0)}>
            <SlideLayer slide={item} transitionIn={transIn} transitionOut={transOut} layout={layout} kenBurns={kenBurns} accent={theme.accent} />
          </Sequence>
        );
      })}

      {/* ── Top badge ── */}
      <Sequence from={8}>
        <div style={{ position: "absolute", top: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <Badge accent={theme.accent} frame={frame - 8} />
        </div>
      </Sequence>

      {/* ── Phone mockup ── */}
      {layout !== "fullscreen" && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", marginTop: -60 }}>
          <PhoneMockup
            frame={slideLocalFrame || frame}
            fps={fps}
            slide={currentSlide}
            kenBurns={kenBurns}
            accent={theme.accent}
          />
        </div>
      )}

      {/* Slide dots — phone layout */}
      {layout !== "fullscreen" && slides.length > 1 && (
        <div style={{ position: "absolute", bottom: 355, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <SlideProgressDots slides={slides} activeIndex={activeSlideIdx} accent={theme.accent} />
        </div>
      )}

      {/* Empty state */}
      {slides.length === 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "rgba(255,255,255,0.2)", fontSize: 28, textAlign: "center", letterSpacing: 1 }}>
          Ask AI to build your reel →
        </div>
      )}

      {/* ── Text overlays ── */}
      {slides.length > 0 && layout === "fullscreen" && (
        <>
          {/* Fullscreen bottom gradient */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 800, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 35%, transparent 70%)", pointerEvents: "none" }} />

          {/* Project name */}
          <Sequence from={18}>
            <div style={{ position: "absolute", bottom: 290 + (ts.projectName.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.projectName.align), padding: "0 70px" }}>
              <WordReveal
                text={text.projectName}
                delay={0}
                style={{ fontSize: ts.projectName.fontSize, fontWeight: ts.projectName.fontWeight, fontFamily: `'${ts.projectName.fontFamily}', sans-serif`, color: ts.projectName.color || "#fff", textAlign: ts.projectName.align, lineHeight: 1.05, letterSpacing: -1, textShadow: "0 4px 40px rgba(0,0,0,0.6)" }}
              />
            </div>
          </Sequence>

          {/* Tagline */}
          <Sequence from={28}>
            <div style={{ position: "absolute", bottom: 220 + (ts.tagline.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.tagline.align), padding: "0 80px" }}>
              <BlurReveal delay={0}>
                <div style={{ fontSize: ts.tagline.fontSize, fontWeight: ts.tagline.fontWeight, fontFamily: `'${ts.tagline.fontFamily}', sans-serif`, color: ts.tagline.color || theme.accent, textAlign: ts.tagline.align, letterSpacing: 0.5 }}>
                  {text.tagline}
                </div>
              </BlurReveal>
            </div>
          </Sequence>

          {/* Description */}
          {text.description && (
            <Sequence from={40}>
              <div style={{ position: "absolute", bottom: 140 + (ts.description.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.description.align), padding: "0 80px" }}>
                <BlurReveal delay={0} from="top">
                  <div style={{ fontSize: ts.description.fontSize, fontWeight: ts.description.fontWeight, fontFamily: `'${ts.description.fontFamily}', sans-serif`, color: ts.description.color || "rgba(255,255,255,0.65)", textAlign: ts.description.align, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {text.description}
                  </div>
                </BlurReveal>
              </div>
            </Sequence>
          )}

          {/* Handle */}
          <Sequence from={54}>
            <div style={{ position: "absolute", bottom: 60 + (ts.handle.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.handle.align), padding: "0 80px" }}>
              <HandlePill text={text.handle} accent={theme.accent} frame={frame - 54} style={ts.handle} />
            </div>
          </Sequence>
        </>
      )}

      {slides.length > 0 && layout !== "fullscreen" && (
        <>
          {/* Project name */}
          <Sequence from={18}>
            <div style={{ position: "absolute", bottom: 290 + (ts.projectName.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.projectName.align), padding: "0 60px" }}>
              <WordReveal
                text={text.projectName}
                delay={0}
                style={{ fontSize: ts.projectName.fontSize, fontWeight: ts.projectName.fontWeight, fontFamily: `'${ts.projectName.fontFamily}', sans-serif`, color: ts.projectName.color || "#fff", textAlign: ts.projectName.align, lineHeight: 1.1, letterSpacing: -1, textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
              />
            </div>
          </Sequence>

          {/* Tagline */}
          <Sequence from={30}>
            <div style={{ position: "absolute", bottom: 228 + (ts.tagline.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.tagline.align), padding: "0 60px" }}>
              <BlurReveal delay={0}>
                <div style={{ fontSize: ts.tagline.fontSize, fontWeight: ts.tagline.fontWeight, fontFamily: `'${ts.tagline.fontFamily}', sans-serif`, color: ts.tagline.color || theme.accent, textAlign: ts.tagline.align }}>
                  {text.tagline}
                </div>
              </BlurReveal>
            </div>
          </Sequence>

          {/* Description */}
          {text.description && (
            <Sequence from={42}>
              <div style={{ position: "absolute", bottom: 153 + (ts.description.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.description.align), padding: "0 80px" }}>
                <BlurReveal delay={0} from="top">
                  <div style={{ fontSize: ts.description.fontSize, fontWeight: ts.description.fontWeight, fontFamily: `'${ts.description.fontFamily}', sans-serif`, color: ts.description.color, textAlign: ts.description.align, lineHeight: 1.55, whiteSpace: "pre-line" }}>
                    {text.description}
                  </div>
                </BlurReveal>
              </div>
            </Sequence>
          )}

          {/* Handle */}
          <Sequence from={55}>
            <div style={{ position: "absolute", bottom: 72 + (ts.handle.yOffset || 0), left: 0, right: 0, display: "flex", justifyContent: alignStyle(ts.handle.align), padding: "0 60px" }}>
              <HandlePill text={text.handle} accent={theme.accent} frame={frame - 55} style={ts.handle} />
            </div>
          </Sequence>
        </>
      )}

      {/* ── Custom text layers ── */}
      {textLayers.map(layer => {
        const currentSlideIdx = timeline.filter(t => t.type === "slide").findIndex(t => frame >= t.from && frame < t.from + t.duration);
        if (layer.slideIndex !== -1 && layer.slideIndex !== currentSlideIdx) return null;
        return (
          <div key={layer.id} style={{
            position: "absolute",
            left: `${layer.x}%`, top: `${layer.y}%`,
            transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
            fontSize: layer.fontSize, fontWeight: layer.fontWeight || 700,
            fontFamily: `'${layer.fontFamily || "Inter"}', sans-serif`,
            color: layer.color || "#ffffff",
            textAlign: "center", whiteSpace: "nowrap",
            textShadow: "0 2px 20px rgba(0,0,0,0.7)",
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
          transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg) scale(${1 + Math.sin(frame / 20 + sticker.x) * 0.04})`,
          fontSize: sticker.size || 80, lineHeight: 1,
          pointerEvents: "none",
          filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.5))",
        }}>
          {sticker.emoji}
        </div>
      ))}

      {/* ── Cinematic intro flash ── */}
      <IntroFlash frame={frame} />
    </AbsoluteFill>
  );
}
