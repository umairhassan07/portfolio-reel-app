import { Composition } from "remotion";
import { PortfolioReel } from "./compositions/PortfolioReel";

const INTRO = 40;
const OUTRO = 30;

function calcDurationFromProps(props) {
  if (!props.slides || props.slides.length === 0) return INTRO + 90 + OUTRO;
  const slideFrames = props.slides.reduce((acc, s) => acc + (s.duration || 90), 0);
  const transFrames = (props.transitions || []).reduce((acc, t) => acc + (t.duration || 21), 0);
  return INTRO + slideFrames + transFrames + OUTRO;
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="PortfolioReel"
      component={PortfolioReel}
      durationInFrames={270}
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={({ props }) => ({
        durationInFrames: calcDurationFromProps(props),
        fps: 30,
        width: 1080,
        height: 1920,
      })}
      defaultProps={{
        slides: [],
        transitions: [],
        theme: { accent: "#6C63FF", bgFrom: "#0f0c29", bgTo: "#302b63" },
        text: { projectName: "My Portfolio Project", tagline: "Built with React & Tailwind", description: "A fast, modern web app.", handle: "@umair.dev" },
        layout: "phone_mockup",
        audio: null,
      }}
    />
  );
};
