import OpenAI from "openai";
import { searchPexels } from "./pexels";
import { searchPixabayAudio } from "./pixabay";
import { TEMPLATES } from "../data/templates.js";
import { generateVoiceover, VOICES } from "./tts.js";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_slide",
      description: "Add a new image slide to the timeline. Use search_and_add_image instead if no local filename is provided.",
      parameters: {
        type: "object",
        properties: {
          image: { type: "string", description: "Filename in public/assets/ e.g. 'photo.png', or full URL" },
          duration: { type: "number", description: "Duration in seconds. Default 3." },
        },
        required: ["image"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_slide",
      description: "Remove a slide by its index (0-based).",
      parameters: {
        type: "object",
        properties: { index: { type: "number", description: "0-based index of the slide to remove" } },
        required: ["index"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_slide_duration",
      description: "Change the duration of an existing slide.",
      parameters: {
        type: "object",
        properties: {
          index: { type: "number", description: "0-based slide index" },
          duration: { type: "number", description: "New duration in seconds" },
        },
        required: ["index", "duration"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reorder_slides",
      description: "Move a slide from one position to another.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "number", description: "Current index" },
          to: { type: "number", description: "Target index" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_timeline",
      description: "Remove all slides from the timeline. Use before building a fresh reel.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "add_transition",
      description: "Add a transition between two consecutive slides.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["fade", "slide_left", "slide_right", "zoom_in", "zoom_out", "wipe"] },
          after_slide_index: { type: "number", description: "Insert transition after this slide (0-based)" },
          duration: { type: "number", description: "Duration in seconds. Default 0.5." },
        },
        required: ["type", "after_slide_index"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_transition",
      description: "Remove the transition after a specific slide.",
      parameters: {
        type: "object",
        properties: { after_slide_index: { type: "number" } },
        required: ["after_slide_index"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_theme",
      description: "Set the color theme — accent color and background gradient.",
      parameters: {
        type: "object",
        properties: {
          accent: { type: "string", description: "Hex color e.g. '#6C63FF'" },
          bg_from: { type: "string", description: "Gradient start hex" },
          bg_to: { type: "string", description: "Gradient end hex" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_text",
      description: "Set the overlay text in the video (title, tagline, description, social handle).",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Main title shown large" },
          tagline: { type: "string", description: "Short subtitle in accent color" },
          description: { type: "string", description: "Body text, can have newlines" },
          handle: { type: "string", description: "Social handle e.g. '@username'" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_layout",
      description: "Switch between phone mockup and fullscreen layout.",
      parameters: {
        type: "object",
        properties: {
          layout: { type: "string", enum: ["phone_mockup", "fullscreen"] },
        },
        required: ["layout"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_and_add_image",
      description: "Search Pexels for a portrait image and add it as a slide. Prefer this over add_slide when no local file is specified.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Specific visual query e.g. 'developer coding dark screen laptop'" },
          duration: { type: "number", description: "Slide duration in seconds. Default 3." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "style_text",
      description: "Change the visual style of a text element: font family, size, color, alignment, or vertical position.",
      parameters: {
        type: "object",
        properties: {
          field: { type: "string", enum: ["projectName", "tagline", "description", "handle"], description: "Which text element to style" },
          fontFamily: { type: "string", enum: ["Inter","Playfair Display","Space Grotesk","Montserrat","Bebas Neue","Poppins","DM Sans","Roboto Mono"], description: "Font name" },
          fontSize: { type: "number", description: "Font size in px, e.g. 58" },
          color: { type: "string", description: "Hex color e.g. '#ffffff' or 'rgba(255,255,255,0.7)'" },
          fontWeight: { type: "number", description: "Font weight: 400 (normal), 600, 700, 800, 900" },
          align: { type: "string", enum: ["left","center","right"] },
          yOffset: { type: "number", description: "Vertical offset in px. Positive = higher, negative = lower." },
        },
        required: ["field"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_template",
      description: "Apply a professional preset (theme, fonts, text, layout). IMPORTANT: This ONLY sets colors/fonts/text — it does NOT add images. After calling this, you MUST still call search_and_add_image to add slides. Available: tech-dev, fashion, fitness, travel, food, luxury, music, minimal.",
      parameters: {
        type: "object",
        properties: {
          template_id: { type: "string", enum: ["tech-dev","fashion","fitness","travel","food","luxury","music","minimal"] },
        },
        required: ["template_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_audio_volume",
      description: "Set background music volume.",
      parameters: {
        type: "object",
        properties: { volume: { type: "number", description: "0.0 (silent) to 1.0 (full). Default 0.4." } },
        required: ["volume"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_ken_burns",
      description: "Enable or disable the Ken Burns zoom/pan effect on slides.",
      parameters: {
        type: "object",
        properties: { enabled: { type: "boolean" } },
        required: ["enabled"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_sticker",
      description: "Add an emoji sticker overlay to the video.",
      parameters: {
        type: "object",
        properties: {
          emoji: { type: "string", description: "Single emoji e.g. '🔥' or '✨'" },
          x: { type: "number", description: "Horizontal position 0-100 (percent). Default 50." },
          y: { type: "number", description: "Vertical position 0-100 (percent). Default 20." },
          size: { type: "number", description: "Font size in px. Default 80." },
        },
        required: ["emoji"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_caption",
      description: "Add or update a caption/subtitle text on a specific slide.",
      parameters: {
        type: "object",
        properties: {
          slide_index: { type: "number", description: "0-based slide index" },
          text: { type: "string", description: "Caption text. Empty string to remove." },
        },
        required: ["slide_index", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_voiceover",
      description: "Write a voiceover script for a slide and generate audio. Requires ElevenLabs API key.",
      parameters: {
        type: "object",
        properties: {
          slide_index: { type: "number", description: "0-based slide index to attach voiceover to" },
          script:      { type: "string", description: "The spoken text for this slide. Keep concise, 1-3 sentences." },
          voice:       { type: "string", enum: VOICES.map(v => v.name), description: "Voice name. Default: Rachel" },
        },
        required: ["slide_index", "script"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_all_transitions",
      description: "Apply the same transition type to ALL slides at once.",
      parameters: {
        type: "object",
        properties: {
          type:     { type: "string", enum: ["fade","slide_left","slide_right","zoom_in","zoom_out","wipe"] },
          duration: { type: "number", description: "Duration in seconds. Default 0.5." },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_slide_image",
      description: "Replace the image of an existing slide by searching Pexels.",
      parameters: {
        type: "object",
        properties: {
          slide_index: { type: "number" },
          query:       { type: "string", description: "Pexels search query for the new image" },
        },
        required: ["slide_index", "query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_text_layer",
      description: "Add a custom floating text element anywhere on the video canvas.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Text content" },
          x: { type: "number", description: "Horizontal % position 0-100. Default 50 (center)." },
          y: { type: "number", description: "Vertical % position 0-100. Default 50 (center)." },
          fontSize: { type: "number", description: "Font size px. Default 40." },
          color: { type: "string", description: "Hex color. Default #ffffff." },
          fontFamily: { type: "string", enum: ["Inter","Playfair Display","Space Grotesk","Montserrat","Bebas Neue","Poppins","DM Sans","Roboto Mono"] },
          fontWeight: { type: "number", description: "400/600/700/800. Default 700." },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_and_add_audio",
      description: "Pick and set background music matching the video vibe.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Mood/vibe: 'tech', 'lofi', 'phonk', 'motivational', 'cinematic', 'aesthetic', 'upbeat', 'calm'" },
          project_name: { type: "string" },
          tagline: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are ReelStudio AI — a world-class short video director. Every reel you create must look FANTASTIC: cinematic imagery, premium fonts, matching music, and stunning visuals.

⛔ CRITICAL FORMAT RULE: NEVER output DSML, XML, or any markup tags. NEVER invent tool names. You ONLY call the exact functions listed in the tools array via standard function_call format. If you call a tool that doesn't exist, the reel breaks.

━━━ DECISION FLOW ━━━
• User has NOT given info → ask ONE question: "What's the topic and how long? (e.g. fitness, 20s)"
• User HAS given enough info → execute ALL steps immediately. NO preamble, NO asking permission.

━━━ ⚡ MANDATORY BUILD CHECKLIST — NEVER SKIP ANY STEP ━━━
Every single reel build MUST call ALL of these, in order:

STEP 1 → clear_timeline  (ALWAYS — wipes slides, audio, stickers, text layers, voiceovers)
STEP 2 → set_text        (title, tagline, description, handle — make them creative and on-brand)
STEP 3 → set_theme       (pick stunning colors that match the vibe)
STEP 4 → set_layout      (fullscreen for cinematic, phone_mockup for app/portfolio)
STEP 5 → search_and_add_image × [N slides]  ← CRITICAL: ALWAYS ADD MINIMUM 3 IMAGES
STEP 6 → add_transition  (between EVERY pair of slides — use varied types)
STEP 7 → search_and_add_audio  ← ALWAYS ADD MUSIC. Every reel needs music.
STEP 8 → style_text × 4 (set font/size/color for ALL text fields to match the brand)
STEP 9 → generate_voiceover for EACH slide — 5-10 word punchy script, Rachel voice
STEP 10 → set_audio_volume { volume: 0.2 } (balance music under voiceover)

⚠️ WARNING: A reel with NO IMAGES is BROKEN. search_and_add_image is NOT optional.
⚠️ WARNING: A reel with NO MUSIC is incomplete. search_and_add_audio is NOT optional.
⚠️ WARNING: A reel with NO VOICEOVERS is incomplete. generate_voiceover is NOT optional.
⚠️ After steps 1-10, you MAY add: stickers, captions, text layers.

━━━ SLIDE COUNTS BY DURATION ━━━
5s → 2 slides | 10s → 3 slides | 15s → 4 slides | 20s → 5 slides | 30s → 7 slides

━━━ CINEMATIC PEXELS QUERIES (always portrait, high-contrast, specific) ━━━
developer:  ["developer coding dark neon screen night", "programmer laptop coffee creative workspace", "code terminal green text dark monitor"]
fitness:    ["athlete bodybuilder gym workout intensity", "fitness model running sunset motivation", "crossfit warrior training sweat closeup"]
fashion:    ["fashion model editorial street style", "luxury outfit aesthetic portrait studio", "model runway haute couture elegant"]
travel:     ["aerial mountain landscape golden hour", "traveler adventure cliff sunrise dramatic", "tropical beach paradise crystal water"]
food:       ["gourmet dish restaurant fine dining", "chef plating artistic food closeup", "street food market vibrant colors"]
music:      ["dj concert lights crowd energy", "musician recording studio headphones vibe", "vinyl record aesthetic dark moody"]
luxury:     ["luxury penthouse interior gold detail", "premium watch jewelry bokeh dark", "rich lifestyle yacht sunset exclusive"]
creative:   ["abstract art neon light painting", "digital art holographic futuristic", "creative studio workspace inspiration"]

━━━ THEME PRESETS BY VIBE ━━━
Tech:     accent #6C63FF · bg #0a0014 → #160030
Fitness:  accent #ff4500 · bg #1a0300 → #2a0600
Fashion:  accent #ff6b9d · bg #150010 → #250020
Travel:   accent #00d4ff · bg #000d1a → #001428
Food:     accent #f5a623 · bg #150800 → #250e00
Music:    accent #b44fff · bg #0d0018 → #180030
Luxury:   accent #f5c842 · bg #080600 → #151000
Minimal:  accent #ffffff · bg #080808 → #151515

━━━ FONT PAIRINGS (always set BOTH title and tagline) ━━━
Tech:     projectName=Space Grotesk 700 · tagline=Roboto Mono 400
Fitness:  projectName=Bebas Neue 400 size 90 · tagline=Montserrat 800 size 28
Fashion:  projectName=Playfair Display 900 size 68 · tagline=DM Sans 300 size 24
Travel:   projectName=Playfair Display 700 size 62 · tagline=Poppins 300 size 24
Food:     projectName=Playfair Display 900 · tagline=DM Sans 400
Music:    projectName=Bebas Neue 400 size 80 · tagline=Space Grotesk 600 size 26
Luxury:   projectName=Playfair Display 900 size 64 · tagline=Inter 300 size 20
Creative: projectName=Poppins 800 size 64 · tagline=Inter 400 size 24

━━━ TEXT POSITION CREATIVITY — MANDATORY VARIATION ━━━
Canvas is 1080×1920px. Text is positioned from bottom. yOffset shifts from default position.
Default positions (yOffset 0): projectName=bottom 290, tagline=bottom 220, description=bottom 140, handle=bottom 60.
Positive yOffset moves UP. Max safe yOffset: +1400. Min safe yOffset: 0 (never go negative — elements go off screen).

LAYOUT A — "Upper Third" (fullscreen cinematic):
  projectName yOffset: 1000, tagline yOffset: 920, description: "" (empty), handle yOffset: 0

LAYOUT B — "Bottom Stack" (default, phone mockup):
  projectName yOffset: 0, tagline yOffset: 0, description yOffset: 0, handle yOffset: 0

LAYOUT C — "Center Stage":
  projectName yOffset: 700, tagline yOffset: 620, description: "" (empty), handle yOffset: 0

LAYOUT D — "Mid Upper":
  projectName yOffset: 400, tagline yOffset: 320, description: "" (empty), handle yOffset: 0

LAYOUT E — "Bold Center" (large title, minimal):
  projectName yOffset: 600, fontSize: 100, tagline yOffset: 490, description: "" (empty), handle yOffset: 0

For fullscreen layout → ALWAYS use Layout A, C, D, or E.
For phone_mockup → Layout B or D.
Vary per reel so no two look the same.

━━━ MUSIC MATCHING ━━━
fitness/energy → "motivational" | tech/dev → "tech" | fashion/aesthetic → "aesthetic"
travel/cinematic → "cinematic" | music → "phonk" or "lofi" | food → "calm"
luxury → "cinematic" | creative/art → "aesthetic"

━━━ VOICEOVERS ━━━
If user asks for voiceover/narration: generate_voiceover for each slide (5-12 words per slide)
Always add: set_audio_volume { volume: 0.15 } when adding voiceovers

━━━ SURPRISE / CREATIVE MODE ━━━
When asked to surprise or be creative, execute ALL of these WITHOUT asking:
1. clear_timeline
2. Pick a RANDOM unexpected theme (e.g. neon cyberpunk, dark luxury, vibrant travel, etc.)
3. set_theme with bold cinematic colors
4. set_text with creative, on-brand copy
5. set_layout → "fullscreen" (more cinematic for surprise)
6. search_and_add_image × 4-5 slides with vivid, specific Pexels queries
7. add_transition × between all slides (use VARIED types: zoom_in, fade, slide_left, wipe)
8. search_and_add_audio with mood-matched query
9. style_text × 4 — bold fonts, large sizes, NON-DEFAULT yOffsets (Layout A or E)
10. add_sticker × 2 — place them at different x/y coordinates
The result should look RADICALLY different from the default.

━━━ EDITING EXISTING ━━━
"change image" → update_slide_image | "make longer" → update_slide_duration
"remove slide" → remove_slide | "change all transitions" → set_all_transitions
"change theme only" → set_theme + style_text only (keep slides)
"apply template + add slides" → apply_template THEN search_and_add_image × N + transitions + audio (FULL BUILD)

⚠️ RULE: If the user says "add N slides" or "add images" ANYWHERE in their message → ALWAYS call search_and_add_image × N. Never skip it.
⚠️ RULE: Every FULL BUILD (new reel, template + images, surprise) MUST include: images + music + voiceovers.
⚠️ RULE: ElevenLabs API is available. For every full build, call generate_voiceover for each slide with a short punchy 5-10 word script. Then set_audio_volume { volume: 0.2 } to balance with music.

After ALL tools fire → confirm in ONE sentence what was built.`;


// Build a short state summary to inject as context
function buildStateContext(state) {
  if (!state) return "";
  const INTRO = 40, OUTRO = 30;
  const slideFrames = state.slides.reduce((a, s) => a + s.duration, 0);
  const transFrames = state.transitions.reduce((a, t) => a + t.duration, 0);
  const totalSec = ((INTRO + slideFrames + transFrames + OUTRO) / 30).toFixed(1);
  const slideList = state.slides.length > 0
    ? state.slides.map((s, i) => `[${i}] ${s.image.split("/").pop()} (${(s.duration / 30).toFixed(1)}s)`).join(", ")
    : "none";
  const tsInfo = state.textStyle ? Object.entries(state.textStyle).map(([k, v]) => `${k}: ${v.fontFamily} ${v.fontSize}px`).join(", ") : "default";
  const voiceInfo = state.voiceovers?.length ? state.voiceovers.map(v => `[S${v.slideIndex + 1}: "${v.text?.slice(0,30)}…"]`).join(", ") : "none";
  const transInfo = state.transitions?.length ? state.transitions.map(t => `after S${t.afterSlideIndex + 1}: ${t.type}`).join(", ") : "none";
  const stickerInfo = state.stickers?.length ? `${state.stickers.length} sticker(s)` : "none";
  return `\n\n---\nFULL VIDEO STATE:\n- Slides (${state.slides.length}): ${slideList}\n- Transitions: ${transInfo}\n- Total: ${totalSec}s | Theme: ${state.theme.accent} | Layout: ${state.layout}\n- Audio: ${state.audio ? `yes (vol ${state.audioVolume})` : "none"} | Ken Burns: ${state.kenBurns}\n- Text: "${state.text.projectName}" / "${state.text.tagline}" / ${state.text.handle}\n- Text styles: ${tsInfo}\n- Voiceovers: ${voiceInfo}\n- Stickers: ${stickerInfo}\n---`;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function toolLabel(name, args) {
  const map = {
    add_slide:            () => `Adding slide: ${args.image?.split("/").pop() || "image"}`,
    remove_slide:         () => `Removing slide ${args.index + 1}`,
    update_slide_duration:() => `Updating slide ${args.index + 1} duration → ${args.duration}s`,
    reorder_slides:       () => `Reordering slides`,
    clear_timeline:       () => `Clearing timeline`,
    add_transition:       () => `Adding ${args.type} transition`,
    remove_transition:    () => `Removing transition`,
    set_theme:            () => `Setting theme → ${args.accent || "colors"}`,
    set_text:             () => `Updating text content`,
    style_text:           () => `Styling ${args.field}: ${[args.fontFamily, args.fontSize && `${args.fontSize}px`, args.color].filter(Boolean).join(", ")}`,
    set_layout:           () => `Setting layout → ${args.layout}`,
    search_and_add_image: () => `Searching Pexels: "${args.query}"`,
    search_and_add_audio: () => `Finding ${args.query} music`,
    generate_voiceover:   () => `Generating voiceover for slide ${(args.slide_index || 0) + 1}`,
    set_all_transitions:  () => `Setting all transitions → ${args.type}`,
    update_slide_image:   () => `Updating slide ${(args.slide_index || 0) + 1} image`,
    apply_template:       () => `Applying template: ${args.template_id}`,
    set_audio_volume:     () => `Setting volume → ${Math.round(args.volume * 100)}%`,
    set_ken_burns:        () => `Ken Burns ${args.enabled ? "on" : "off"}`,
    add_sticker:          () => `Adding sticker: ${args.emoji}`,
    set_caption:          () => `Caption on slide ${(args.slide_index || 0) + 1}: "${args.text}"`,
    add_text_layer:       () => `Adding text: "${args.content}"`,
  };
  return map[name]?.() || name.replace(/_/g, " ");
}

// ── Direct build fallback — bypasses LLM tool calling entirely ──────────────
// Used when DeepSeek refuses to call tools properly (outputs text or DSML).
const DIRECT_PRESETS = {
  fashion:  { accent:"#ff6b9d", bgFrom:"#150010", bgTo:"#250020", layout:"fullscreen", audio:"aesthetic",    font:"Playfair Display", weight:900, tagFont:"DM Sans", tagWeight:300, projectName:"Elegance",    tagline:"Style Defined",      handle:"@style.reel",    queries:["fashion model pastel silk portrait","luxury dress elegant editorial","model runway haute couture pastel"] },
  fitness:  { accent:"#ff4500", bgFrom:"#1a0300", bgTo:"#2a0600", layout:"fullscreen", audio:"motivational", font:"Bebas Neue",       weight:400, tagFont:"Montserrat", tagWeight:800, projectName:"Beast Mode",   tagline:"No Days Off",        handle:"@fitlife",       queries:["athlete gym workout intensity portrait","fitness model running motivation","crossfit training sweat closeup"] },
  travel:   { accent:"#00d4ff", bgFrom:"#000d1a", bgTo:"#001428", layout:"fullscreen", audio:"cinematic",    font:"Playfair Display", weight:700, tagFont:"Poppins",    tagWeight:300, projectName:"Wanderlust",   tagline:"Every Mile Matters", handle:"@travel.reel",   queries:["aerial mountain golden hour dramatic","traveler adventure cliff sunrise","tropical beach paradise crystal water"] },
  food:     { accent:"#f5a623", bgFrom:"#150800", bgTo:"#250e00", layout:"phone_mockup",audio:"calm",         font:"Playfair Display", weight:900, tagFont:"DM Sans",    tagWeight:400, projectName:"Savor",        tagline:"Art On A Plate",     handle:"@food.reel",     queries:["gourmet dish fine dining closeup","chef plating artistic food","street food market vibrant colors"] },
  music:    { accent:"#b44fff", bgFrom:"#0d0018", bgTo:"#180030", layout:"fullscreen", audio:"phonk",        font:"Bebas Neue",       weight:400, tagFont:"Space Grotesk", tagWeight:600, projectName:"The Drop",    tagline:"Feel The Beat",      handle:"@music.reel",    queries:["dj concert neon lights crowd","musician recording studio headphones","vinyl record aesthetic dark moody"] },
  luxury:   { accent:"#f5c842", bgFrom:"#080600", bgTo:"#151000", layout:"fullscreen", audio:"cinematic",    font:"Playfair Display", weight:900, tagFont:"Inter",       tagWeight:300, projectName:"Prestige",     tagline:"Beyond Ordinary",    handle:"@luxury.reel",   queries:["luxury penthouse interior gold","premium watch jewelry bokeh dark","rich lifestyle yacht sunset"] },
  tech:     { accent:"#6C63FF", bgFrom:"#0a0014", bgTo:"#160030", layout:"phone_mockup",audio:"tech",         font:"Space Grotesk",    weight:700, tagFont:"Roboto Mono", tagWeight:400, projectName:"Dev Portfolio",tagline:"Code. Ship. Repeat.", handle:"@dev.reel",      queries:["developer coding dark neon screen","programmer laptop coffee workspace","code terminal green text monitor"] },
  minimal:  { accent:"#ffffff", bgFrom:"#080808", bgTo:"#151515", layout:"fullscreen", audio:"lofi",         font:"Inter",            weight:800, tagFont:"Inter",       tagWeight:300, projectName:"Minimal",      tagline:"Less Is More",       handle:"@minimal.reel",  queries:["minimal abstract clean composition","elegant simple lifestyle portrait","modern architecture clean lines"] },
  surprise: { accent:"#00ffcc", bgFrom:"#00001a", bgTo:"#0d0030", layout:"fullscreen", audio:"aesthetic",    font:"Poppins",          weight:800, tagFont:"Inter",       tagWeight:300, projectName:"Unfiltered",   tagline:"Expect Nothing. See Everything.", handle:"@reelstudio", queries:["surreal neon portrait cinematic","abstract glowing light trail dark","futuristic cyberpunk street neon rain"] },
};

function detectPreset(msg) {
  const m = msg.toLowerCase();
  if (m.match(/surprise|creative|impress|unexpected/)) return "surprise";
  if (m.match(/fashion|style|elegance|runway|vogue|pastel|silk|dress|outfit|model/)) return "fashion";
  if (m.match(/fitness|gym|workout|muscle|athlete|sport|hustle|grind/)) return "fitness";
  if (m.match(/travel|adventure|landscape|journey|wanderlust|explore/)) return "travel";
  if (m.match(/food|recipe|chef|dish|restaurant|savor|gourmet/)) return "food";
  if (m.match(/music|dj|concert|beat|vinyl|sound|drop/)) return "music";
  if (m.match(/luxury|premium|gold|prestige|exclusive|elite/)) return "luxury";
  if (m.match(/minimal|clean|simple|minimalist/)) return "minimal";
  if (m.match(/dev|code|developer|tech|web|app|software|react/)) return "tech";
  return "tech";
}

function detectDuration(msg) {
  const m = msg.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);
  const sec = m ? parseInt(m[1]) : 15;
  if (sec <= 5)  return { sec, slides: 2 };
  if (sec <= 10) return { sec, slides: 3 };
  if (sec <= 15) return { sec, slides: 4 };
  if (sec <= 20) return { sec, slides: 5 };
  return { sec, slides: 7 };
}

async function buildDirectly(userMsg, actions, state, onProgress, onStream) {
  const presetKey = detectPreset(userMsg);
  const preset    = DIRECT_PRESETS[presetKey];
  const { sec, slides } = detectDuration(userMsg);
  const slideDur  = +(sec / slides).toFixed(1);
  const steps     = 6 + slides + (slides - 1) + 4 + slides; // rough total
  let step = 0;
  const tick = (label) => { step++; onProgress?.(`⟳ ${step}/${steps} — ${label}…`); };

  // Allow font override from user message
  let font = preset.font;
  const fontMatch = userMsg.match(/playfair display|space grotesk|bebas neue|montserrat|poppins|inter|dm sans|roboto mono/i);
  if (fontMatch) font = fontMatch[0].replace(/\b\w/g, c => c.toUpperCase());

  tick("Clearing timeline");
  actions.clearTimeline?.();
  await delay(200);

  tick("Setting text");
  actions.setText(preset.projectName, preset.tagline, "", preset.handle);
  await delay(150);

  tick("Applying theme");
  actions.setTheme(preset.accent, preset.bgFrom, preset.bgTo);
  await delay(150);

  tick("Setting layout");
  actions.setLayout(preset.layout);
  await delay(150);

  for (let i = 0; i < slides; i++) {
    const query = preset.queries[i % preset.queries.length];
    tick(`Searching image ${i+1}/${slides}: "${query}"`);
    const photos = await searchPexels(query, 1);
    actions.addSlide(photos[0].url, slideDur);
    await delay(300);
  }

  const transTypes = ["fade","zoom_in","slide_left","wipe","zoom_out"];
  for (let i = 0; i < slides - 1; i++) {
    tick(`Adding transition ${i+1}`);
    actions.addTransition(transTypes[i % transTypes.length], i, 0.5);
    await delay(100);
  }

  tick("Finding music");
  const track = await searchPixabayAudio(preset.audio, { projectName: preset.projectName });
  actions.setAudio(track.url);
  await delay(200);

  tick("Styling text");
  actions.setTextStyle("projectName",  { fontFamily: font,           fontSize: 68,  fontWeight: preset.weight,    color: "#ffffff",               align: "center", yOffset: preset.layout === "fullscreen" ? 700 : 0 });
  actions.setTextStyle("tagline",      { fontFamily: preset.tagFont,  fontSize: 28,  fontWeight: preset.tagWeight, color: preset.accent,            align: "center", yOffset: preset.layout === "fullscreen" ? 620 : 0 });
  actions.setTextStyle("description",  { fontFamily: "Inter",         fontSize: 22,  fontWeight: 400,              color: "rgba(255,255,255,0.6)",  align: "center", yOffset: 0 });
  actions.setTextStyle("handle",       { fontFamily: "Inter",         fontSize: 24,  fontWeight: 600,              color: "rgba(255,255,255,0.8)",  align: "center", yOffset: 0 });
  await delay(200);

  // Voiceovers via ElevenLabs
  const scripts = [
    "Pure elegance, one frame at a time.",
    "Style that speaks without words.",
    "Where beauty meets intention.",
    "This is fashion, redefined.",
    "Timeless. Graceful. Yours.",
    "Every detail tells a story.",
    "Art you can wear.",
  ];
  for (let i = 0; i < slides; i++) {
    tick(`Generating voiceover ${i+1}/${slides}`);
    try {
      const audioUrl = await generateVoiceover(scripts[i % scripts.length], VOICES[0].id);
      actions.addVoiceover(i, scripts[i % scripts.length], audioUrl);
    } catch (e) {
      // skip silently if ElevenLabs fails
    }
    await delay(200);
  }

  tick("Balancing audio");
  actions.setAudioVolume(0.2);

  const summary = `Built a ${sec}s ${presetKey} reel — ${slides} cinematic slides, ${font} font, ${preset.audio} music${import.meta.env.VITE_ELEVENLABS_API_KEY ? ", ElevenLabs voiceovers" : ""}.`;
  onStream?.(summary, false);
  await delay(300);
  onStream?.(summary, true);
  return { content: summary, toolCalls: [] };
}

// onProgress(text)        — called with the full progress bubble text
// onStream(chunk, isDone) — called with each streamed character chunk of final response
export async function sendMessage(messages, actions, state = null, onProgress = null, onStream = null) {
  try {
    const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const hasEnoughInfo = lastUserMsg.length > 20;
    const systemContent = SYSTEM_PROMPT + buildStateContext(state);

    onProgress?.("⟳ Thinking…");

    // ── Phase 1: non-streaming pass to get tool calls ──────────
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemContent }, ...messages],
      tools: TOOLS,
      tool_choice: hasEnoughInfo ? "required" : "auto",
    });

    let activeMessage = response.choices[0].message;
    const toolResults = [];
    let calls = activeMessage.tool_calls || [];

    // ── DSML detection: DeepSeek sometimes outputs raw DSML markup instead of tool_calls ──
    const isDSML = (msg) => !msg.tool_calls?.length && msg.content && (
      msg.content.includes("DSML") || msg.content.includes("｜｜") || msg.content.includes("invoke name=")
    );

    // Also detect plain-text "planning" responses (model described instead of building)
    const isPlainTextNonAction = !calls.length && activeMessage.content && hasEnoughInfo && activeMessage.content.length > 80 && !activeMessage.content.includes("?");

    if (isDSML(activeMessage) || isPlainTextNonAction) {
      onProgress?.("⟳ Retrying with direct build…");
      // One LLM retry first
      try {
        const retryResponse = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a video editor. Call the function tools NOW. No text. No markup. Only function_calls." },
            { role: "user", content: lastUserMsg },
          ],
          tools: TOOLS,
          tool_choice: "required",
        });
        activeMessage = retryResponse.choices[0].message;
        calls = activeMessage.tool_calls || [];
      } catch (_) { calls = []; }

      // If still no valid tool calls → use direct build fallback
      if (!calls.length || isDSML(activeMessage)) {
        return await buildDirectly(lastUserMsg, actions, state, onProgress, onStream);
      }
    }

    // ── Phase 2: execute tools one-by-one with progress ───────
    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      const stepNum = i + 1;
      const total   = calls.length;
      try {
        const args  = JSON.parse(call.function.arguments);
        const label = toolLabel(call.function.name, args);

        const progressLines = toolResults.map((r, idx) => `✓ ${idx + 1}. ${r.label}`);
        progressLines.push(`⟳ ${stepNum}/${total} — ${label}…`);
        onProgress?.(progressLines.join("\n"));

        await delay(380);

        const result = await executeTool(call.function.name, args, actions, state);
        toolResults.push({ name: call.function.name, label, args, result });

        const doneLines = toolResults.map((r, idx) => `✓ ${idx + 1}. ${r.label}`);
        if (i < calls.length - 1) {
          const nextArgs = JSON.parse(calls[i + 1].function.arguments);
          doneLines.push(`  → ${toolLabel(calls[i + 1].function.name, nextArgs)}`);
        }
        onProgress?.(doneLines.join("\n"));
        if (i < calls.length - 1) await delay(280);

      } catch (err) {
        toolResults.push({ name: call.function.name, label: call.function.name, result: `Error: ${err.message}` });
      }
    }

    // ── Phase 3: stream the final text response ────────────────
    // Only stream text if it's real content (not DSML garbage)
    const cleanContent = activeMessage.content && !isDSML(activeMessage) ? activeMessage.content : null;
    if (cleanContent) {
      if (onStream) {
        const words = cleanContent.split(" ");
        let built = "";
        for (const word of words) {
          built += (built ? " " : "") + word;
          onStream(built, false);
          await delay(28);
        }
        onStream(built, true);
      }
      return { content: cleanContent, toolCalls: toolResults };
    }

    // Tools were called — optionally do a follow-up streaming call for the summary
    if (calls.length > 0 && onStream) {
      const followUp = await client.chat.completions.create({
        model: "deepseek-chat",
        stream: true,
        messages: [
          { role: "system", content: "You are a concise video editor AI. In ONE sentence, confirm what you just built. No lists. No markdown." },
          ...messages,
          { role: "assistant", content: null, tool_calls: calls },
          ...toolResults.map((r, i) => ({
            role: "tool",
            tool_call_id: calls[i].id,
            content: r.result,
          })),
        ],
      });

      let streamed = "";
      for await (const chunk of followUp) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          streamed += delta;
          onStream(streamed, false);
        }
      }
      onStream(streamed, true);
      return { content: streamed, toolCalls: toolResults };
    }

    return { content: message.content || "", toolCalls: toolResults };

  } catch (err) {
    console.error("[DeepSeek Error]", err);
    throw err;
  }
}

async function executeTool(name, args, actions, state) {
  switch (name) {

    case "add_slide":
      actions.addSlide(args.image, args.duration || 3);
      return `Slide added: ${args.image}`;

    case "remove_slide":
      actions.removeSlide(args.index);
      return `Removed slide ${args.index}`;

    case "update_slide_duration":
      actions.updateSlideDuration(args.index, Math.round((args.duration || 3) * 30));
      return `Slide ${args.index} duration → ${args.duration}s`;

    case "reorder_slides":
      actions.reorderSlides(args.from, args.to);
      return `Moved slide ${args.from} → ${args.to}`;

    case "clear_timeline":
      actions.clearTimeline?.();
      return "Timeline cleared";

    case "add_transition":
      actions.addTransition(args.type, args.after_slide_index, args.duration || 0.5);
      return `${args.type} transition after slide ${args.after_slide_index}`;

    case "remove_transition":
      actions.removeTransition(args.after_slide_index);
      return "Transition removed";

    case "set_theme":
      actions.setTheme(args.accent || null, args.bg_from || null, args.bg_to || null);
      return `Theme: ${args.accent}`;

    case "set_text":
      actions.setText(
        args.project_name || null,
        args.tagline || null,
        args.description || null,
        args.handle || null
      );
      return "Text updated";

    case "style_text": {
      const styleUpdate = {};
      if (args.fontFamily !== undefined) styleUpdate.fontFamily = args.fontFamily;
      if (args.fontSize   !== undefined) styleUpdate.fontSize   = args.fontSize;
      if (args.color      !== undefined) styleUpdate.color      = args.color;
      if (args.fontWeight !== undefined) styleUpdate.fontWeight = args.fontWeight;
      if (args.align      !== undefined) styleUpdate.align      = args.align;
      if (args.yOffset    !== undefined) styleUpdate.yOffset    = args.yOffset;
      actions.setTextStyle(args.field, styleUpdate);
      return `${args.field} styled`;
    }

    case "set_layout":
      actions.setLayout(args.layout);
      return `Layout: ${args.layout}`;

    case "search_and_add_image": {
      const photos = await searchPexels(args.query, 1);
      const photo = photos[0];
      actions.addSlide(photo.url, args.duration || 3);
      return `Added: "${photo.alt}" by ${photo.photographer}`;
    }

    case "generate_voiceover": {
      const voiceName = args.voice || "Rachel";
      const voice = VOICES.find(v => v.name === voiceName) || VOICES[0];
      try {
        const audioUrl = await generateVoiceover(args.script, voice.id);
        actions.addVoiceover(args.slide_index, args.script, audioUrl);
        return `Voiceover generated for slide ${args.slide_index + 1} (${voice.name})`;
      } catch (e) {
        // Non-fatal — reel continues without voiceover
        return `Voiceover skipped (${e.message.slice(0, 60)})`;
      }
    }

    case "set_all_transitions": {
      if (!state?.slides) return "No slides";
      const dur = args.duration || 0.5;
      state.slides.forEach((_, i) => {
        if (i < state.slides.length - 1) {
          actions.addTransition(args.type, i, dur);
        }
      });
      return `${args.type} transitions applied to all ${state.slides.length} slides`;
    }

    case "update_slide_image": {
      const photos = await searchPexels(args.query, 1);
      const photo = photos[0];
      // We implement this by removing and re-inserting at same index
      if (state?.slides?.[args.slide_index]) {
        const dur = state.slides[args.slide_index].duration / 30;
        actions.removeSlide(args.slide_index);
        // Re-add at same position (addSlide appends, so we reorder)
        actions.addSlide(photo.url, dur);
        if (args.slide_index < (state.slides.length - 1)) {
          actions.reorderSlides(state.slides.length - 1, args.slide_index);
        }
      }
      return `Slide ${args.slide_index + 1} image updated: "${photo.alt}"`;
    }

    case "apply_template": {
      const tpl = TEMPLATES.find(t => t.id === args.template_id);
      if (!tpl) throw new Error(`Template "${args.template_id}" not found`);
      actions.applyTemplate(tpl);
      return `Applied template: ${tpl.name}`;
    }

    case "set_audio_volume":
      actions.setAudioVolume(args.volume);
      return `Audio volume → ${Math.round(args.volume * 100)}%`;

    case "set_ken_burns":
      actions.setKenBurns(args.enabled);
      return `Ken Burns ${args.enabled ? "enabled" : "disabled"}`;

    case "add_sticker":
      actions.addSticker(args.emoji, args.x ?? 50, args.y ?? 20, args.size ?? 80);
      return `Sticker ${args.emoji} added`;

    case "set_caption": {
      // Find slide by index
      if (state && state.slides[args.slide_index]) {
        const slideId = state.slides[args.slide_index].id;
        actions.setCaption?.(slideId, args.text);
        return `Caption set on slide ${args.slide_index + 1}`;
      }
      return "Slide not found";
    }

    case "add_text_layer":
      actions.addTextLayer(args.content, {
        x: args.x ?? 50, y: args.y ?? 50,
        fontSize: args.fontSize ?? 40,
        color: args.color ?? "#ffffff",
        fontFamily: args.fontFamily ?? "Inter",
        fontWeight: args.fontWeight ?? 700,
      });
      return `Text layer added: "${args.content}"`;

    case "search_and_add_audio": {
      const track = await searchPixabayAudio(args.query, {
        projectName: args.project_name || "",
        tagline: args.tagline || "",
      });
      actions.setAudio(track.url);
      return `Audio: "${track.title}"`;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
