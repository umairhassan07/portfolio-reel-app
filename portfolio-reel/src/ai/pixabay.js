import { detectCategory, getTrackForCategory, getCategoryById, fetchCategoryTracks } from "./trendingAudio.js";

export async function searchPixabayAudio(query, videoContext = {}) {
  const categoryId = detectCategory(
    videoContext.projectName || query,
    videoContext.tagline || "",
    videoContext.description || ""
  );
  const track = await getTrackForCategory(categoryId);
  console.log(`[Music] ${categoryId} → "${track.title}" by ${track.artist || "—"}`);
  return track;
}

export async function autoPickMusic(projectName, tagline, description) {
  return searchPixabayAudio("", { projectName, tagline, description });
}

export { fetchCategoryTracks };
