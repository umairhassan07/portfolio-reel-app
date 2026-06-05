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

const SYSTEM_PROMPT = `You are ReelStudio AI — a world-class cinematic short video director. You create stunning, premium-quality reels that look like they were made by a professional agency. Every reel must be visually breathtaking: dramatic imagery, bold typography, perfect music, and cinematic motion.

⛔ CRITICAL: NEVER output XML/DSML tags. NEVER invent tool names. ONLY call exact functions from the tools list.

━━━ DECISION FLOW ━━━
• Not enough info → ask ONE question: "What's the topic and style? (e.g. luxury fashion, 20s)"
• Enough info → execute ALL steps immediately. NO preamble. NO permission-asking.

━━━ ⚡ MANDATORY BUILD CHECKLIST — EXECUTE ALL IN ORDER ━━━
STEP 1  → clear_timeline
STEP 2  → set_layout       ("fullscreen" for cinematic/editorial, "phone_mockup" for app/product)
STEP 3  → set_theme        (dramatic, high-contrast colors — NO generic purples unless tech)
STEP 4  → set_text         (punchy, emotional, on-brand — title max 4 words, tagline max 6 words)
STEP 5  → style_text × 4  (premium fonts + sizes + colors — see FONT PAIRINGS below)
STEP 6  → search_and_add_image × N  (MINIMUM 3, use ULTRA-SPECIFIC cinematic queries — see IMAGE QUERIES)
STEP 7  → add_transition between EVERY pair of slides (VARIED types — never all the same)
STEP 8  → search_and_add_audio  (mood-matched music — MANDATORY)
STEP 9  → generate_voiceover per slide (5-9 words, emotional, punchy)
STEP 10 → set_audio_volume { volume: 0.2 }
STEP 11 → set_ken_burns { enabled: true }

⚠️ NO IMAGES = BROKEN. ⚠️ NO MUSIC = INCOMPLETE. ⚠️ NO VOICEOVERS = INCOMPLETE.

━━━ SLIDE COUNTS BY DURATION ━━━
5s → 2 slides (3s each) | 10s → 3 slides (3s each) | 15s → 4-5 slides
20s → 5-6 slides | 30s → 7-8 slides | 60s → 14-16 slides

━━━ ULTRA-CINEMATIC IMAGE QUERIES (be HYPER-SPECIFIC — vague = bad images) ━━━
developer:  "dark neon coding setup dual monitors cyberpunk" | "programmer focused flow state laptop night" | "abstract code matrix green particles dark"
fitness:    "athlete slow motion explosive gym training dark" | "fitness model golden hour outdoor cinematic" | "warrior mindset gym chalk hands weights"
fashion:    "editorial fashion model dramatic shadow studio" | "luxury street style cinematic bokeh portrait" | "haute couture dramatic wind movement elegant"
travel:     "cinematic golden hour mountain aerial drone" | "solo traveler cliffside dramatic mist adventure" | "exotic destination vibrant culture street life"
food:       "michelin star plating macro detail dramatic light" | "chef hands artisan craft close up bokeh" | "vibrant market spices textures color explosion"
music:      "concert crowd energy light beams euphoria" | "artist studio vibe moody dark recording" | "vinyl culture aesthetic warm grain retro"
luxury:     "penthouse luxury minimal interior golden hour" | "premium watch macro bokeh dramatic light" | "yacht ocean sunset exclusive lifestyle cinematic"
creative:   "abstract neon light art installation immersive" | "digital creative workspace inspiration moody" | "artist hands craft detail intimate close"
wellness:   "meditation sunrise mountain calm minimal" | "yoga golden light serene nature portrait" | "spa luxury detail water reflection peaceful"
business:   "confident professional cinematic portrait office" | "modern corporate glass building dramatic sky" | "handshake deal success close up detail"

━━━ THEME PRESETS (always pick the BOLDEST, MOST CINEMATIC option) ━━━
Tech:       accent #5B8DEF · bg #020818 → #0a1628   (electric blue, near-black)
Fitness:    accent #FF3D00 · bg #120100 → #1f0200   (blazing orange-red, deep black)
Fashion:    accent #E8C4A0 · bg #0c0806 → #1a1008   (warm champagne, dark espresso)
Travel:     accent #00C9FF · bg #000e1f → #001833   (electric cyan, midnight)
Food:       accent #FF8C42 · bg #0f0600 → #1a0c00   (fire orange, dark chocolate)
Music:      accent #C77DFF · bg #07000f → #120020   (electric violet, void black)
Luxury:     accent #D4AF37 · bg #060401 → #100900   (pure gold, darkest black)
Minimal:    accent #E8E8E8 · bg #050505 → #0f0f0f   (crisp white, absolute black)
Wellness:   accent #7EC8A4 · bg #020d08 → #041a0e   (sage green, forest black)
Neon:       accent #00FF94 · bg #000a05 → #001508   (neon green, void)

━━━ PREMIUM FONT PAIRINGS ━━━
Tech:       projectName="Space Grotesk" w800 sz64 · tagline="Roboto Mono" w400 sz26 · description color rgba(255,255,255,0.5)
Fitness:    projectName="Bebas Neue" w400 sz100 · tagline="Montserrat" w900 sz30 uppercase · description ""
Fashion:    projectName="Playfair Display" w900 sz72 · tagline="DM Sans" w300 sz24 · description color rgba(232,196,160,0.6)
Travel:     projectName="Playfair Display" w700 sz66 · tagline="Poppins" w300 sz26 · description color rgba(255,255,255,0.55)
Food:       projectName="Playfair Display" w900 sz68 · tagline="DM Sans" w500 sz24
Music:      projectName="Bebas Neue" w400 sz92 · tagline="Space Grotesk" w600 sz28
Luxury:     projectName="Playfair Display" w900 sz70 italic · tagline="Inter" w200 sz22 letterSpacing · description ""
Minimal:    projectName="Inter" w900 sz80 · tagline="Inter" w300 sz24
Wellness:   projectName="Playfair Display" w700 sz64 · tagline="DM Sans" w300 sz26
Neon:       projectName="Space Grotesk" w900 sz76 · tagline="Roboto Mono" w400 sz24

━━━ TEXT LAYOUT POSITIONS (yOffset moves text UP from default bottom position) ━━━
CINEMATIC TOP    → projectName yOffset:1050, tagline yOffset:950, description:"", handle yOffset:0
CINEMATIC UPPER  → projectName yOffset:700, tagline yOffset:600, description:"", handle yOffset:0
BOLD CENTER      → projectName yOffset:650, fontSize:96, tagline yOffset:530, description:"", handle yOffset:0
BOTTOM STACK     → projectName yOffset:0, tagline yOffset:0, description yOffset:0, handle yOffset:0
MID STORY        → projectName yOffset:400, tagline yOffset:310, description:"", handle yOffset:0

fullscreen → use CINEMATIC TOP, CINEMATIC UPPER, or BOLD CENTER
phone_mockup → BOTTOM STACK or MID STORY

━━━ TRANSITION STRATEGY (vary per reel — never use all the same) ━━━
Energy/action:  zoom_in, zoom_out, slide_left alternating
Cinematic:      blur, fade, wipe_up
Fashion:        wipe, slide_up, blur
Tech:           zoom_in, rotate_in, slide_left
Luxury:         fade, blur, wipe
Creative:       rotate_in, zoom_out, blur

━━━ MUSIC MATCHING ━━━
fitness/energy → "powerful motivational epic" | tech → "electronic tech minimal"
fashion → "elegant editorial ambient" | travel → "cinematic orchestral adventure"
food → "warm acoustic pleasant" | music → "deep phonk bass dark"
luxury → "sophisticated cinematic minimal" | wellness → "calm ambient nature"
creative → "inspiring electronic uplifting" | neon → "synthwave retrowave neon"

━━━ VOICEOVER SCRIPTS (emotional, punchy — write like a movie trailer) ━━━
Each slide: 5-9 words maximum. Start with a VERB or EMOTION word.
Examples: "Built with passion. Designed for impact." | "Train like a champion every day." | "Luxury redefined for those who know." | "Code that shapes the future now."

━━━ SURPRISE / CINEMATIC MODE ━━━
Pick the MOST unexpected, visually stunning theme possible. Execute:
1. clear_timeline → set_layout "fullscreen" → bold theme → set_text (2-4 word title)
2. style_text (large sizes, premium font pair, CINEMATIC TOP or BOLD CENTER layout)
3. search_and_add_image × 5 (hyper-specific, varied, cinematic queries)
4. VARIED transitions: [zoom_in, blur, wipe_up, fade, slide_up]
5. search_and_add_audio (mood-matched) → generate_voiceover × N → set_audio_volume 0.2
6. add_sticker × 1-2 (tasteful placement) → set_ken_burns true

━━━ EDITING ━━━
"change image/photo" → update_slide_image  |  "longer/shorter" → update_slide_duration
"remove slide" → remove_slide  |  "change all transitions" → set_all_transitions
"change colors/theme only" → set_theme + style_text (preserve slides)
"different font" → style_text for affected fields only

⚠️ Every FULL BUILD must have: images + music + voiceovers + ken burns enabled.
⚠️ After all tools fire → ONE sentence confirming what was built. No lists, no markdown.`;



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
  fashion:  { accent:"#E8C4A0", bgFrom:"#0c0806", bgTo:"#1a1008", layout:"fullscreen", audio:"aesthetic",    font:"Playfair Display", weight:900, tagFont:"DM Sans",      tagWeight:300, projectName:"Elegance",     tagline:"Style Defined",       handle:"@style.reel",   queries:["editorial fashion model dramatic shadow studio","luxury street style cinematic bokeh portrait","haute couture dramatic wind movement elegant","fashion model golden light minimal studio"], voiceScripts:["Wear the story. Own the moment.","Every stitch tells a secret.","Style is a language. Speak it boldly.","Timeless. Effortless. You."] },
  fitness:  { accent:"#FF3D00", bgFrom:"#120100", bgTo:"#1f0200", layout:"fullscreen", audio:"motivational", font:"Bebas Neue",        weight:400, tagFont:"Montserrat",   tagWeight:900, projectName:"Beast Mode",    tagline:"No Days Off",         handle:"@fitlife",      queries:["athlete explosive gym training dark cinematic","fitness warrior golden hour outdoor dramatic","crossfit chalk hands weights closeup intensity","bodybuilder shadow silhouette dramatic light"], voiceScripts:["Train like your life depends on it.","Champions are built in the dark.","No excuses. Only results.","Pain is temporary. Legacy is forever."] },
  travel:   { accent:"#00C9FF", bgFrom:"#000e1f", bgTo:"#001833", layout:"fullscreen", audio:"cinematic",    font:"Playfair Display", weight:700, tagFont:"Poppins",       tagWeight:300, projectName:"The World Awaits", tagline:"Go Further",         handle:"@travel.reel",  queries:["cinematic golden hour mountain aerial drone dramatic","solo traveler cliffside mist adventure dramatic","crystal ocean wave crashing dramatic slow motion","mountain peak sunrise clouds breathtaking aerial","tropical paradise lagoon cinematic turquoise"], voiceScripts:["The world is bigger than your fears.","Every horizon hides a story.","Go where the map ends.","Adventure is the only answer.","Home is everywhere you dare to go."] },
  food:     { accent:"#FF8C42", bgFrom:"#0f0600", bgTo:"#1a0c00", layout:"phone_mockup",audio:"calm",         font:"Playfair Display", weight:900, tagFont:"DM Sans",       tagWeight:400, projectName:"Savor",         tagline:"Art On A Plate",      handle:"@food.reel",    queries:["michelin star plating macro detail dramatic light","chef hands artisan craft closeup bokeh","vibrant spice market textures color explosion","gourmet dessert gold leaf detail dark"],    voiceScripts:["Food is love on a plate.","Every bite tells a story.","Crafted with passion. Served with soul.","Taste the art of perfection."] },
  music:    { accent:"#C77DFF", bgFrom:"#07000f", bgTo:"#120020", layout:"fullscreen", audio:"phonk",        font:"Bebas Neue",        weight:400, tagFont:"Space Grotesk", tagWeight:600, projectName:"The Drop",      tagline:"Feel The Beat",       handle:"@music.reel",   queries:["concert crowd energy light beams euphoria dark","artist recording studio moody dark vibe","vinyl record warm grain retro aesthetic","dj booth neon lights dark festival energy"],     voiceScripts:["Music doesn't lie. Feel it.","Drop everything. This is your moment.","The beat knows what words can't say.","Turn it up. Live in the sound."] },
  luxury:   { accent:"#D4AF37", bgFrom:"#060401", bgTo:"#100900", layout:"fullscreen", audio:"cinematic",    font:"Playfair Display", weight:900, tagFont:"Inter",          tagWeight:200, projectName:"Prestige",      tagline:"Beyond Ordinary",     handle:"@luxury.reel",  queries:["luxury penthouse interior golden hour minimal","premium watch macro bokeh dramatic light gold","yacht ocean horizon exclusive cinematic sunset","luxury car interior leather detail bokeh dark"], voiceScripts:["This is what success looks like.","Crafted for those who demand more.","Not for everyone. Just the best.","Luxury is a state of mind."] },
  tech:     { accent:"#5B8DEF", bgFrom:"#020818", bgTo:"#0a1628", layout:"phone_mockup",audio:"tech",         font:"Space Grotesk",    weight:800, tagFont:"Roboto Mono",   tagWeight:400, projectName:"Dev Portfolio", tagline:"Code. Ship. Repeat.",  handle:"@dev.reel",     queries:["dark neon coding setup dual monitors cyberpunk","programmer focused flow state laptop night dark","abstract code matrix green particles dark","modern tech workspace minimal dark neon blue"], voiceScripts:["Code that shapes the world.","Built different. Shipped faster.","The future runs on your code.","Every bug fixed. Every feature shipped."] },
  minimal:  { accent:"#E8E8E8", bgFrom:"#050505", bgTo:"#0f0f0f", layout:"fullscreen", audio:"lofi",         font:"Inter",            weight:900, tagFont:"Inter",           tagWeight:300, projectName:"Minimal",       tagline:"Less Is More",        handle:"@minimal.reel", queries:["minimal architecture clean lines dramatic shadow","elegant simple portrait clean light studio","abstract geometric shapes dark minimal","modern interior design minimal white space"],   voiceScripts:["Remove the noise. Keep the truth.","Simplicity is the ultimate sophistication.","Less clutter. More clarity.","Design that breathes."] },
  surprise: { accent:"#00FF94", bgFrom:"#000a05", bgTo:"#001508", layout:"fullscreen", audio:"aesthetic",    font:"Space Grotesk",    weight:900, tagFont:"Inter",           tagWeight:300, projectName:"Unfiltered",    tagline:"Expect Nothing",      handle:"@reelstudio",   queries:["surreal neon portrait cinematic dark","abstract glowing light trail long exposure dark","futuristic cyberpunk rain neon street cinematic","holographic light prism abstract art dark"], voiceScripts:["Nothing prepared you for this.","Reality is just a setting. Change it.","Beyond imagination. This is now.","Unfiltered. Unscripted. Unstoppable."] },
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

  // Varied cinematic transitions per preset
  const transMap = {
    travel:   ["blur","wipe_up","zoom_in","fade","slide_up"],
    fashion:  ["wipe","blur","slide_up","fade","wipe_up"],
    fitness:  ["zoom_in","slide_left","zoom_out","zoom_in","blur"],
    luxury:   ["fade","blur","wipe","fade","blur"],
    music:    ["zoom_in","blur","rotate_in","slide_left","zoom_out"],
    tech:     ["zoom_in","rotate_in","slide_left","blur","zoom_out"],
    food:     ["fade","wipe","blur","zoom_in","fade"],
    minimal:  ["fade","blur","wipe_up","fade","blur"],
    surprise: ["rotate_in","zoom_out","blur","wipe_up","zoom_in"],
  };
  const transTypes = transMap[presetKey] || ["blur","fade","zoom_in","wipe_up","slide_left"];
  for (let i = 0; i < slides - 1; i++) {
    tick(`Adding transition ${i+1}`);
    actions.addTransition(transTypes[i % transTypes.length], i, 0.6);
    await delay(100);
  }

  tick("Finding music");
  const track = await searchPixabayAudio(preset.audio, { projectName: preset.projectName });
  actions.setAudio(track.url);
  await delay(200);

  tick("Styling text");
  const isFS = preset.layout === "fullscreen";
  actions.setTextStyle("projectName",  { fontFamily: font,           fontSize: 72,  fontWeight: preset.weight,    color: "#ffffff",               align: "center", yOffset: isFS ? 700 : 0 });
  actions.setTextStyle("tagline",      { fontFamily: preset.tagFont,  fontSize: 28,  fontWeight: preset.tagWeight, color: preset.accent,           align: "center", yOffset: isFS ? 610 : 0 });
  actions.setTextStyle("description",  { fontFamily: "Inter",         fontSize: 0,   fontWeight: 400,              color: "rgba(255,255,255,0.6)", align: "center", yOffset: 0 });
  actions.setTextStyle("handle",       { fontFamily: "Inter",         fontSize: 24,  fontWeight: 600,              color: "rgba(255,255,255,0.8)", align: "center", yOffset: 0 });
  actions.setKenBurns(true);
  await delay(200);

  // Voiceovers — use preset-specific scripts
  const scripts = preset.voiceScripts || [
    "Pure elegance, one frame at a time.",
    "Every detail tells a story.",
    "This is what greatness looks like.",
    "Built for those who demand more.",
    "Beyond ordinary. This is it.",
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

    // ── DSML / bad-output detection ──────────────────────────────
    // Check content for DSML regardless of whether tool_calls also exist
    const DSML_PATTERNS = ["DSML","｜｜","invoke name=","<invoke","tool_calls>","function_calls>",
      "add_asset","add_text","add_track","set_font","set_duration","parameter name=","string=\"true\""];
    const hasDSMLContent = (content) => !!content && DSML_PATTERNS.some(p => content.includes(p));
    const isDSML = (msg) => !msg.tool_calls?.length && hasDSMLContent(msg.content);
    const isPlainTextNonAction = !calls.length && activeMessage.content && hasEnoughInfo
      && activeMessage.content.length > 60 && !activeMessage.content.includes("?");

    // If the content is dirty, always go straight to buildDirectly — skip retry entirely
    if (isDSML(activeMessage) || hasDSMLContent(activeMessage.content) || isPlainTextNonAction) {
      return await buildDirectly(lastUserMsg, actions, state, onProgress, onStream);
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
    // Only stream text if content is clean plain text (no DSML regardless of tool_calls)
    const cleanContent = activeMessage.content && !hasDSMLContent(activeMessage.content) ? activeMessage.content : null;
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

    // ── Incomplete build check ────────────────────────────────────
    // If the LLM called tools but never added images, the build is incomplete.
    // Auto-complete it using buildDirectly so the user always gets a full reel.
    const hasImages = toolResults.some(r => ["search_and_add_image","add_slide","update_slide_image"].includes(r.name));
    const isFullBuildRequest = hasEnoughInfo && !lastUserMsg.toLowerCase().match(/^(change|update|remove|delete|fix|just|only|edit|modify|set|style|undo|redo)/);
    if (!hasImages && isFullBuildRequest && calls.length > 0) {
      onProgress?.("⟳ Adding images and completing build…");
      return await buildDirectly(lastUserMsg, actions, state, onProgress, onStream);
    }

    // Tools were called — generate a plain-text summary (no markup, no DSML)
    if (calls.length > 0 && onStream) {
      try {
        const followUp = await client.chat.completions.create({
          model: "deepseek-chat",
          stream: true,
          messages: [
            {
              role: "system",
              content: "You are a concise video editor assistant. Reply in ONE plain sentence summarising what was built. Output ONLY plain text — no XML, no tags, no DSML, no markdown, no angle brackets, no tool calls.",
            },
            { role: "user", content: `Summarise this reel build in one sentence: ${toolResults.map(r => r.label).join(", ")}` },
          ],
        });

        let streamed = "";
        for await (const chunk of followUp) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (!delta) continue;
          // Stop streaming the moment any DSML / tag garbage appears
          if (streamed.includes("｜｜") || streamed.includes("<invoke") || streamed.includes("DSML")) break;
          streamed += delta;
          // Strip any stray tag characters before showing
          const safe = streamed.replace(/<[^>]*>/g, "").replace(/[｜]{2}[^｜]*[｜]{2}/g, "");
          onStream(safe, false);
        }
        const safe = streamed.replace(/<[^>]*>/g, "").replace(/[｜]{2}[^｜]*[｜]{2}/g, "");
        if (safe.trim()) {
          onStream(safe, true);
          return { content: safe, toolCalls: toolResults };
        }
      } catch (_) {}

      // Fallback: build summary from tool labels without LLM
      const summary = `Built your reel — ${toolResults.length} steps completed.`;
      onStream(summary, true);
      return { content: summary, toolCalls: toolResults };
    }

    return { content: "", toolCalls: toolResults };

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
