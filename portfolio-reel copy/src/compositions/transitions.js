import { interpolate } from "remotion";

// Each transition receives: { progress (0→1), type }
// Returns style object to apply to the INCOMING slide

export function getTransitionStyle(progress, type) {
  switch (type) {
    case "fade":
      return { opacity: progress };

    case "slide_left":
      return {
        opacity: 1,
        transform: `translateX(${interpolate(progress, [0, 1], [100, 0])}%)`,
      };

    case "slide_right":
      return {
        opacity: 1,
        transform: `translateX(${interpolate(progress, [0, 1], [-100, 0])}%)`,
      };

    case "zoom_in":
      return {
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [1.3, 1])})`,
      };

    case "zoom_out":
      return {
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
      };

    case "wipe":
      return {
        opacity: 1,
        clipPath: `inset(0 ${interpolate(progress, [0, 1], [100, 0])}% 0 0)`,
      };

    default:
      return { opacity: progress };
  }
}

// Outgoing slide style during transition
export function getOutgoingStyle(progress, type) {
  switch (type) {
    case "fade":
      return { opacity: 1 - progress };

    case "slide_left":
      return { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [0, -100])}%)` };

    case "slide_right":
      return { opacity: 1, transform: `translateX(${interpolate(progress, [0, 1], [0, 100])}%)` };

    case "zoom_in":
      return { opacity: 1 - progress };

    case "zoom_out":
      return { opacity: 1 - progress };

    case "wipe":
      return { opacity: 1 };

    default:
      return { opacity: 1 - progress };
  }
}
