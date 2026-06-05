import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const VideoContext = createContext(null);

export const defaultState = {
  slides: [],
  transitions: [],
  theme: { accent: "#6C63FF", bgFrom: "#0f0c29", bgTo: "#302b63" },
  text: {
    projectName: "My Portfolio Project",
    tagline: "Built with React & Tailwind",
    description: "A fast, modern web app\ndesigned for real users.",
    handle: "@umair.dev",
  },
  textStyle: {
    projectName:  { fontSize: 58,  color: "#ffffff",               fontFamily: "Inter",  fontWeight: 800, align: "center", yOffset: 0 },
    tagline:      { fontSize: 32,  color: null,                    fontFamily: "Inter",  fontWeight: 500, align: "center", yOffset: 0 },
    description:  { fontSize: 26,  color: "rgba(255,255,255,0.65)",fontFamily: "Inter",  fontWeight: 400, align: "center", yOffset: 0 },
    handle:       { fontSize: 28,  color: "rgba(255,255,255,0.9)", fontFamily: "Inter",  fontWeight: 700, align: "center", yOffset: 0 },
  },
  textLayers: [],   // [{ id, content, x, y, fontSize, color, fontFamily, fontWeight, rotation, slideIndex }]
  stickers:   [],   // [{ id, emoji, x, y, size, rotation }]
  voiceovers: [],   // [{ id, text, audioUrl, slideIndex, volume }]
  audioVolume: 0.4,
  kenBurns: true,
  layout: "phone_mockup",
  audio: null,
};

let nextId = 1;
const uid = () => `id_${nextId++}`;

const MAX_HISTORY = 50;

export function VideoProvider({ children }) {
  const [state, setState] = useState(defaultState);
  const historyRef = useRef([defaultState]);
  const histIdxRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0); // force re-render on undo/redo

  // ── History helpers ──────────────────────────────────────────
  const push = useCallback((newState) => {
    const trimmed = historyRef.current.slice(0, histIdxRef.current + 1);
    trimmed.push(newState);
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    histIdxRef.current = trimmed.length - 1;
    setHistoryVersion(v => v + 1);
    setState(newState);
  }, []);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    setState(historyRef.current[histIdxRef.current]);
    setHistoryVersion(v => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (histIdxRef.current >= historyRef.current.length - 1) return;
    histIdxRef.current++;
    setState(historyRef.current[histIdxRef.current]);
    setHistoryVersion(v => v + 1);
  }, []);

  const canUndo = histIdxRef.current > 0;
  const canRedo = histIdxRef.current < historyRef.current.length - 1;

  // ── Slides ───────────────────────────────────────────────────
  const addSlide = useCallback((source, durationSec = 3) => {
    const isVideo = /\.(mp4|webm|mov|avi)$/i.test(source);
    setState(s => {
      const ns = { ...s, slides: [...s.slides, { id: uid(), image: source, type: isVideo ? "video" : "image", duration: Math.round(durationSec * 30), caption: "" }] };
      // push to history after state settles
      setTimeout(() => push(ns), 0);
      return ns;
    });
  }, [push]);

  const updateSlideDuration = useCallback((index, frames) => {
    setState(s => {
      const slides = [...s.slides];
      if (slides[index]) slides[index] = { ...slides[index], duration: Math.max(30, Math.round(frames)) };
      return { ...s, slides };
    });
  }, []);

  const removeSlide = useCallback((index) => {
    setState(s => {
      const slides = [...s.slides];
      slides.splice(index, 1);
      const transitions = s.transitions.filter(t => t.afterSlideIndex < slides.length - 1);
      const ns = { ...s, slides, transitions };
      setTimeout(() => push(ns), 0);
      return ns;
    });
  }, [push]);

  const reorderSlides = useCallback((from, to) => {
    setState(s => {
      const slides = [...s.slides];
      const [item] = slides.splice(from, 1);
      slides.splice(to, 0, item);
      const ns = { ...s, slides };
      setTimeout(() => push(ns), 0);
      return ns;
    });
  }, [push]);

  const setCaption = useCallback((slideId, text) => {
    setState(s => ({
      ...s,
      slides: s.slides.map(sl => sl.id === slideId ? { ...sl, caption: text } : sl),
    }));
  }, []);

  // ── Transitions ──────────────────────────────────────────────
  const addTransition = useCallback((type = "fade", afterSlideIndex = 0, durationSec = 0.5) => {
    setState(s => ({
      ...s,
      transitions: [
        ...s.transitions.filter(t => t.afterSlideIndex !== afterSlideIndex),
        { id: uid(), type, afterSlideIndex, duration: Math.round(durationSec * 30) },
      ],
    }));
  }, []);

  const removeTransition = useCallback((afterSlideIndex) => {
    setState(s => ({ ...s, transitions: s.transitions.filter(t => t.afterSlideIndex !== afterSlideIndex) }));
  }, []);

  // ── Theme / Text / Layout / Audio ────────────────────────────
  const setTheme = useCallback((accent, bgFrom, bgTo) => {
    setState(s => ({ ...s, theme: { accent: accent || s.theme.accent, bgFrom: bgFrom || s.theme.bgFrom, bgTo: bgTo || s.theme.bgTo } }));
  }, []);

  const setText = useCallback((projectName, tagline, description, handle) => {
    setState(s => ({
      ...s,
      text: {
        projectName: projectName ?? s.text.projectName,
        tagline:     tagline     ?? s.text.tagline,
        description: description ?? s.text.description,
        handle:      handle      ?? s.text.handle,
      },
    }));
  }, []);

  const setTextStyle = useCallback((field, style) => {
    setState(s => ({
      ...s,
      textStyle: { ...s.textStyle, [field]: { ...s.textStyle[field], ...style } },
    }));
  }, []);

  const setLayout = useCallback((layout) => setState(s => ({ ...s, layout })), []);

  const setAudio = useCallback((audio) => setState(s => ({ ...s, audio })), []);

  const setAudioVolume = useCallback((vol) => setState(s => ({ ...s, audioVolume: Math.max(0, Math.min(1, vol)) })), []);

  const setKenBurns = useCallback((val) => setState(s => ({ ...s, kenBurns: val })), []);

  // ── Stickers ─────────────────────────────────────────────────
  const addSticker = useCallback((emoji, x = 50, y = 30, size = 80) => {
    setState(s => ({
      ...s,
      stickers: [...s.stickers, { id: uid(), emoji, x, y, size, rotation: 0 }],
    }));
  }, []);

  const removeSticker = useCallback((id) => {
    setState(s => ({ ...s, stickers: s.stickers.filter(st => st.id !== id) }));
  }, []);

  const updateSticker = useCallback((id, changes) => {
    setState(s => ({ ...s, stickers: s.stickers.map(st => st.id === id ? { ...st, ...changes } : st) }));
  }, []);

  // ── Text Layers ──────────────────────────────────────────────
  const addTextLayer = useCallback((content = "Text", opts = {}) => {
    setState(s => ({
      ...s,
      textLayers: [...s.textLayers, {
        id: uid(), content,
        x: opts.x ?? 50, y: opts.y ?? 50,
        fontSize: opts.fontSize ?? 40,
        color: opts.color ?? "#ffffff",
        fontFamily: opts.fontFamily ?? "Inter",
        fontWeight: opts.fontWeight ?? 700,
        rotation: opts.rotation ?? 0,
        slideIndex: opts.slideIndex ?? -1, // -1 = all slides
      }],
    }));
  }, []);

  const removeTextLayer = useCallback((id) => {
    setState(s => ({ ...s, textLayers: s.textLayers.filter(l => l.id !== id) }));
  }, []);

  const updateTextLayer = useCallback((id, changes) => {
    setState(s => ({ ...s, textLayers: s.textLayers.map(l => l.id === id ? { ...l, ...changes } : l) }));
  }, []);

  // ── Voiceovers ───────────────────────────────────────────────
  const addVoiceover = useCallback((slideIndex, text, audioUrl, volume = 0.9) => {
    setState(s => ({
      ...s,
      voiceovers: [
        ...s.voiceovers.filter(v => v.slideIndex !== slideIndex), // replace if exists
        { id: uid(), text, audioUrl, slideIndex, volume },
      ],
    }));
  }, []);

  const removeVoiceover = useCallback((id) => {
    setState(s => ({ ...s, voiceovers: s.voiceovers.filter(v => v.id !== id) }));
  }, []);

  const updateVoiceover = useCallback((id, changes) => {
    setState(s => ({ ...s, voiceovers: s.voiceovers.map(v => v.id === id ? { ...v, ...changes } : v) }));
  }, []);

  // ── Apply Template ───────────────────────────────────────────
  const applyTemplate = useCallback((template) => {
    setState(s => {
      const ns = {
        ...s,
        theme: template.theme,
        text: template.text,
        textStyle: template.textStyle,
        layout: template.layout,
      };
      setTimeout(() => push(ns), 0);
      return ns;
    });
  }, [push]);

  // ── Save / Load ──────────────────────────────────────────────
  const saveProject = useCallback(() => {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reel-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const loadProject = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const loaded = JSON.parse(e.target.result);
        // Merge with defaults to handle old project files
        const merged = { ...defaultState, ...loaded };
        push(merged);
      } catch {}
    };
    reader.readAsText(file);
  }, [push]);

  // ── Clear Timeline (AI tool — wipes slides/transitions/overlays/audio but keeps theme+text) ──
  const clearTimeline = useCallback(() => {
    setState(s => {
      const ns = {
        ...s,
        slides: [],
        transitions: [],
        stickers: [],
        textLayers: [],
        voiceovers: [],
        audio: null,
      };
      setTimeout(() => push(ns), 0);
      return ns;
    });
  }, [push]);

  // ── Reset ────────────────────────────────────────────────────
  const reset = useCallback(() => push(defaultState), [push]);

  return (
    <VideoContext.Provider value={{
      state,
      // slides
      addSlide, updateSlideDuration, removeSlide, reorderSlides, setCaption, clearTimeline,
      // transitions
      addTransition, removeTransition,
      // theme/text/layout/audio
      setTheme, setText, setTextStyle, setLayout, setAudio, setAudioVolume, setKenBurns,
      // stickers
      addSticker, removeSticker, updateSticker,
      // text layers
      addTextLayer, removeTextLayer, updateTextLayer,
      // voiceovers
      addVoiceover, removeVoiceover, updateVoiceover,
      // template
      applyTemplate,
      // project
      saveProject, loadProject,
      // history
      undo, redo, canUndo, canRedo,
      reset,
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export const useVideo = () => useContext(VideoContext);

export function calcDuration(state) {
  const INTRO = 40;
  const OUTRO = 30;
  if (!state.slides || state.slides.length === 0) return INTRO + 90 + OUTRO;
  const slideFrames = state.slides.reduce((acc, s) => acc + s.duration, 0);
  const transFrames = state.transitions.reduce((acc, t) => acc + t.duration, 0);
  return INTRO + slideFrames + transFrames + OUTRO;
}
