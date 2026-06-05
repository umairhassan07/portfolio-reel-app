const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// Popular ElevenLabs voices
export const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel",   gender: "F", style: "Calm, professional" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi",     gender: "F", style: "Strong, confident" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella",    gender: "F", style: "Soft, warm" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni",   gender: "M", style: "Well-rounded" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli",     gender: "F", style: "Emotional, young" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh",     gender: "M", style: "Deep, young" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold",   gender: "M", style: "Crisp, authoritative" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam",     gender: "M", style: "Deep, narrative" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam",      gender: "M", style: "Raspy, energetic" },
];

export const DEFAULT_VOICE = VOICES[0];

// Generate audio via ElevenLabs → returns blob URL
export async function generateVoiceover(text, voiceId = DEFAULT_VOICE.id, apiKey) {
  const key = apiKey || import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!key) throw new Error("ElevenLabs API key not set. Add VITE_ELEVENLABS_API_KEY to .env");

  const res = await fetch(`${ELEVENLABS_API}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs (${res.status}): ${err}`);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Get available voices from ElevenLabs account
export async function fetchVoices(apiKey) {
  const key = apiKey || import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!key) return VOICES;
  try {
    const res = await fetch(`${ELEVENLABS_API}/voices`, { headers: { "xi-api-key": key } });
    if (!res.ok) return VOICES;
    const data = await res.json();
    return data.voices.map(v => ({ id: v.voice_id, name: v.name, gender: "?", style: v.labels?.description || "" }));
  } catch {
    return VOICES;
  }
}

// Preview using browser TTS (no API key needed, not exportable)
export function previewBrowserTTS(text, rate = 1, pitch = 1) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  speechSynthesis.speak(u);
}

export function stopBrowserTTS() {
  window.speechSynthesis?.cancel();
}

// Estimate duration of voiceover (rough: ~130 words per minute)
export function estimateDuration(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / 130) * 60); // in seconds
}
