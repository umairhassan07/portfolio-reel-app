import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { VideoProvider } from "./store/videoStore.jsx";

createRoot(document.getElementById("root")).render(
  <VideoProvider>
    <App />
  </VideoProvider>
);
