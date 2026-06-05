import { Composition } from "remotion";
import { PortfolioReel } from "./compositions/PortfolioReel";

const INTRO = 40;
const OUTRO = 30;

const DEFAULT_PROPS = {
  slides: [],
  transitions: [],
  theme: { accent: "#6C63FF", bgFrom: "#0f0c29", bgTo: "#302b63" },
  text: { projectName: "My Portfolio Project", tagline: "Built with React & Tailwind", description: "A fast, modern web app.", handle: "@umair.dev" },
  layout: "phone_mockup",
  audio: null,
};

function calcDurationFromProps(props) {
  if (!props.slides || props.slides.length === 0) return INTRO + 90 + OUTRO;
  const slideFrames = props.slides.reduce((acc, s) => acc + (s.duration || 90), 0);
  const transFrames = (props.transitions || []).reduce((acc, t) => acc + (t.duration || 21), 0);
  return INTRO + slideFrames + transFrames + OUTRO;
}

// Aspect ratios supported
const FORMATS = [
  { id: "PortfolioReel",        label: "9:16 Vertical",  w: 1080, h: 1920 }, // Reels / TikTok / Shorts
  { id: "PortfolioReel_16x9",   label: "16:9 Landscape", w: 1920, h: 1080 }, // YouTube
  { id: "PortfolioReel_1x1",    label: "1:1 Square",     w: 1080, h: 1080 }, // Instagram Feed
];

export const RemotionRoot = () => (
  <>
    {FORMATS.map(({ id, w, h }) => (
      <Composition
        key={id}
        id={id}
        component={PortfolioReel}
        durationInFrames={270}
        fps={30}
        width={w}
        height={h}
        calculateMetadata={({ props }) => ({
          durationInFrames: calcDurationFromProps(props),
          fps: 30,
          width: w,
          height: h,
        })}
        defaultProps={DEFAULT_PROPS}
      />
    ))}
  </>
);
