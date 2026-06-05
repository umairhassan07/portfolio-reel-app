import { interpolate } from "remotion";

function ease(p) {
  const c = Math.max(0, Math.min(1, p));
  return c < 0.5 ? 2 * c * c : -1 + (4 - 2 * c) * c;
}

export function getTransitionStyle(progress, type) {
  const p = ease(progress);

  switch (type) {
    case "fade":
      return { opacity: p };

    case "slide_left":
      return {
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateX(${interpolate(p, [0, 1], [110, 0])}%)`,
      };

    case "slide_right":
      return {
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateX(${interpolate(p, [0, 1], [-110, 0])}%)`,
      };

    case "slide_up":
      return {
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(p, [0, 1], [110, 0])}%)`,
      };

    case "zoom_in":
      return {
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(p, [0, 1], [1.2, 1])})`,
        filter: `blur(${interpolate(p, [0, 0.5], [8, 0], { extrapolateRight: "clamp" })}px)`,
      };

    case "zoom_out":
      return {
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        transform: `scale(${interpolate(p, [0, 1], [0.82, 1])})`,
        filter: `blur(${interpolate(p, [0, 0.5], [8, 0], { extrapolateRight: "clamp" })}px)`,
      };

    case "wipe":
      return {
        opacity: 1,
        clipPath: `inset(0 ${interpolate(p, [0, 1], [100, 0])}% 0 0)`,
      };

    case "wipe_up":
      return {
        opacity: 1,
        clipPath: `inset(${interpolate(p, [0, 1], [100, 0])}% 0 0 0)`,
      };

    case "blur":
      return {
        opacity: interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        filter: `blur(${interpolate(p, [0, 0.6], [20, 0], { extrapolateRight: "clamp" })}px)`,
        transform: `scale(${interpolate(p, [0, 1], [1.05, 1])})`,
      };

    case "rotate_in":
      return {
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        transform: `rotate(${interpolate(p, [0, 1], [-8, 0])}deg) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      };

    default:
      return { opacity: p };
  }
}

export function getOutgoingStyle(progress, type) {
  const p = ease(progress);

  switch (type) {
    case "fade":
      return { opacity: 1 - p };

    case "slide_left":
      return {
        opacity: interpolate(p, [0.7, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `translateX(${interpolate(p, [0, 1], [0, -110])}%)`,
      };

    case "slide_right":
      return {
        opacity: interpolate(p, [0.7, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `translateX(${interpolate(p, [0, 1], [0, 110])}%)`,
      };

    case "slide_up":
      return {
        opacity: interpolate(p, [0.7, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `translateY(${interpolate(p, [0, 1], [0, -110])}%)`,
      };

    case "zoom_in":
      return {
        opacity: interpolate(p, [0.6, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `scale(${interpolate(p, [0, 1], [1, 0.88])})`,
        filter: `blur(${interpolate(p, [0.5, 1], [0, 8], { extrapolateLeft: "clamp" })}px)`,
      };

    case "zoom_out":
      return {
        opacity: interpolate(p, [0.6, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `scale(${interpolate(p, [0, 1], [1, 1.15])})`,
        filter: `blur(${interpolate(p, [0.5, 1], [0, 8], { extrapolateLeft: "clamp" })}px)`,
      };

    case "wipe":
    case "wipe_up":
      return { opacity: 1 };

    case "blur":
      return {
        opacity: interpolate(p, [0.5, 1], [1, 0], { extrapolateLeft: "clamp" }),
        filter: `blur(${interpolate(p, [0.4, 1], [0, 20], { extrapolateLeft: "clamp" })}px)`,
        transform: `scale(${interpolate(p, [0, 1], [1, 0.96])})`,
      };

    case "rotate_in":
      return {
        opacity: interpolate(p, [0.6, 1], [1, 0], { extrapolateLeft: "clamp" }),
        transform: `rotate(${interpolate(p, [0, 1], [0, 6])}deg)`,
      };

    default:
      return { opacity: 1 - p };
  }
}
