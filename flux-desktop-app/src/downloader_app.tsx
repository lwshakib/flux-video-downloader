import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "lucide-react";
import "./index.css";

export function DownloaderApp() {
  const [url, setUrl] = useState("");
  // Store title and cookies for future download implementation
  // These will be used when implementing the actual download functionality
  const [_title, setTitle] = useState<string | null>(null);
  const [_cookies, setCookies] = useState<{
    msToken?: string | null;
    ttChainToken?: string | null;
  } | null>(null);

  useEffect(() => {
    // Listen for download request from main process
    if (window?.ipcRenderer) {
      const handleDownloadRequest = (
        _event: unknown,
        data: {
          url: string;
          title?: string | null;
          cookies?: {
            msToken?: string | null;
            ttChainToken?: string | null;
          } | null;
        }
      ) => {
        setUrl(data.url);
        setTitle(data.title || null);
        setCookies(data.cookies || null);
      };

      window.ipcRenderer.on("download-request", handleDownloadRequest);

      return () => {
        window.ipcRenderer?.off("download-request", handleDownloadRequest);
      };
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center gap-4 bg-background p-0 text-sm select-none">
      <header className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide drag-css">
        <span>Download File Info</span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-base no-drag-css"
          >
            ─<span className="sr-only">Minimize</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-base no-drag-css"
          >
            ×<span className="sr-only">Cancel</span>
          </Button>
        </div>
      </header>
      <div className="w-full max-w-lg space-y-1.5">
        <label className="text-xs font-medium" htmlFor="download-input">
          URL
        </label>
        <Input
          id="download-input"
          disabled
          value={url}
          placeholder="https://example.com/video"
          className="h-9 text-xs"
        />
      </div>
      <div className="w-full max-w-lg space-y-1.5">
        <label className="text-xs font-medium" htmlFor="download-destination">
          Save as
        </label>
        <div className="flex gap-1.5">
          <Input
            id="download-destination"
            value={`Downloads\\Video\\TikTok - Make Your Day.mp4`}
            disabled
            className="h-9 flex-1 text-xs text-muted-foreground"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="sr-only">Browse</span>
          </Button>
        </div>
      </div>
      <div className="flex w-full max-w-lg items-center justify-end gap-2">
        <Button variant="outline" className="h-8 px-3 text-xs">
          Cancel
        </Button>
        <Button className="h-8 px-3 text-xs">Start download</Button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <DownloaderApp />
    </ThemeProvider>
  </React.StrictMode>
);
