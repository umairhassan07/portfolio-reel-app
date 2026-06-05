import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { z } from "zod";

// ── Zod schema — this powers the Props editor in Remotion Studio ──
export const schema = z.object({
  images: z.array(z.string()).describe("Filenames from your public/ folder e.g. screenshot1.png"),
  projectName: z.string(),
  tagline: z.string(),
  description: z.string(),
  yourName: z.string(),
  accentColor: z.string(),
  bgGradientFrom: z.string(),
  bgGradientTo: z.string(),
});

// ─────────────────────────────────────────────────────────────────

const FRAMES_PER_SLIDE = 90; // 3s per screenshot

function SlideUp({ children, delay = 0 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ opacity, transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)` }}>
      {children}
    </div>
  );
}

function PhoneMockup({ frame, fps, image }) {
  const slideIn = spring({ frame, fps, config: { damping: 16, stiffness: 100, mass: 1 } });
  const scale = interpolate(slideIn, [0, 1], [0.6, 1]);
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      width: 380, height: 720, borderRadius: 44,
      border: "10px solid rgba(255,255,255,0.15)", background: "#111",
      boxShadow: "0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
      overflow: "hidden", position: "relative",
    }}>
      {/* Notch */}
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 90, height: 22, background: "#111", borderRadius: 20, zIndex: 10 }} />

      {image ? (
        <img src={image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 22, textAlign: "center", padding: 40, lineHeight: 1.6 }}>
          Add image filenames in the Props panel →
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)", pointerEvents: "none" }} />
    </div>
  );
}

export function PortfolioReel({
  images = [],
  projectName = "My Portfolio Project",
  tagline = "Built with React & Tailwind",
  description = "A fast, modern web app\ndesigned for real users.",
  yourName = "@umair.dev",
  accentColor = "#6C63FF",
  bgGradientFrom = "#0f0c29",
  bgGradientTo = "#302b63",
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Which slide is active (after intro frames)
  const INTRO = 40;
  const slideIndex = Math.min(
    Math.max(0, Math.floor((frame - INTRO) / FRAMES_PER_SLIDE)),
    Math.max(0, images.length - 1)
  );
  const slideFrame = Math.max(0, (frame - INTRO) % FRAMES_PER_SLIDE);
  const activeImage = images.length > 0 ? images[slideIndex] : null;

  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames - 5], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const floatY = Math.sin(frame / 30) * 8;
  const shimmer = interpolate(frame, [0, durationInFrames], [0, 360]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${shimmer}deg, ${bgGradientFrom}, ${bgGradientTo})`,
      opacity: fadeOut,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: "hidden",
    }}>
      {/* Glow blobs */}
      <div style={{ position: "absolute", top: -200, left: -200, width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, #ff6b6b22 0%, transparent 70%)", filter: "blur(80px)" }} />

      {/* Top badge */}
      <Sequence from={10}>
        <div style={{ position: "absolute", top: 90, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <SlideUp delay={0}>
            <div style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}66`, borderRadius: 100, padding: "10px 30px", color: accentColor, fontSize: 28, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              Portfolio Showcase
            </div>
          </SlideUp>
        </div>
      </Sequence>

      {/* Phone */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, calc(-50% + ${floatY}px))`, marginTop: -30 }}>
        <PhoneMockup frame={frame} fps={fps} image={activeImage} />
      </div>

      {/* Slide dots — only if multiple images */}
      {images.length > 1 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, 420px)", display: "flex", gap: 10 }}>
          {images.map((_, i) => (
            <div key={i} style={{ width: i === slideIndex ? 26 : 10, height: 10, borderRadius: 10, background: i === slideIndex ? accentColor : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
          ))}
        </div>
      )}

      {/* Project name */}
      <Sequence from={20}>
        <div style={{ position: "absolute", bottom: 320, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 60px" }}>
          <SlideUp delay={0}>
            <div style={{ fontSize: 60, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.1, letterSpacing: -1, textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
              {projectName}
            </div>
          </SlideUp>
        </div>
      </Sequence>

      {/* Tagline */}
      <Sequence from={35}>
        <div style={{ position: "absolute", bottom: 245, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 80px" }}>
          <SlideUp delay={0}>
            <div style={{ fontSize: 34, fontWeight: 500, color: accentColor, textAlign: "center" }}>{tagline}</div>
          </SlideUp>
        </div>
      </Sequence>

      {/* Description */}
      <Sequence from={50}>
        <div style={{ position: "absolute", bottom: 155, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 80px" }}>
          <SlideUp delay={0}>
            <div style={{ fontSize: 28, fontWeight: 400, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.5, whiteSpace: "pre-line" }}>
              {description}
            </div>
          </SlideUp>
        </div>
      </Sequence>

      {/* Handle */}
      <Sequence from={65}>
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <SlideUp delay={0}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor }} />
              <div style={{ fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 1 }}>{yourName}</div>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: accentColor }} />
            </div>
          </SlideUp>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
}
