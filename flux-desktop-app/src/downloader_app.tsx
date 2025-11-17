import React from "react";
import ReactDOM from "react-dom/client";

import { Input } from "@/components/ui/input";
import "./index.css";

export function DownloaderApp() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Flux Downloader</h1>
        <p className="text-muted-foreground">
          Paste a video link below and start the crawl.
        </p>
      </div>
      <div className="w-full max-w-xl space-y-2">
        <label className="text-sm font-medium" htmlFor="download-input">
          Video URL
        </label>
        <Input
          id="download-input"
          placeholder="https://example.com/video"
          className="h-12 text-base"
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DownloaderApp />
  </React.StrictMode>
);
