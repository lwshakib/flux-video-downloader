import React, { useEffect, useMemo, useState } from "react";
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
  const [title, setTitle] = useState<string | null>(null);
  const [cookies, setCookies] = useState<{
    msToken?: string | null;
    ttChainToken?: string | null;
  } | null>(null);
  const [downloadLocation, setDownloadLocation] = useState<string>("Downloads");
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);
  const [completedFilePath, setCompletedFilePath] = useState<string | null>(
    null
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [supportsPause, setSupportsPause] = useState(true); // Track if current download supports pause

  // Sanitize title for filename
  const sanitizeTitle = (text: string | null): string => {
    if (!text) return "video";
    return text
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 100);
  };

  // Extract format from URL
  const getFormatFromUrl = (url: string): string => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes(".mp4") || urlLower.includes("format=mp4")) {
      return "mp4";
    }
    if (urlLower.includes(".webm") || urlLower.includes("format=webm")) {
      return "webm";
    }
    if (urlLower.includes(".mkv") || urlLower.includes("format=mkv")) {
      return "mkv";
    }
    if (urlLower.includes(".m3u8") || urlLower.includes("format=m3u8")) {
      return "m3u8";
    }
    if (urlLower.includes(".flv") || urlLower.includes("format=flv")) {
      return "flv";
    }
    // Default to mp4
    return "mp4";
  };

  // Compute the file path that will be used for download
  const filePath = useMemo(() => {
    if (!url) return "";
    const fileName = `${sanitizeTitle(title)}.${getFormatFromUrl(url)}`;

    // Check if downloadLocation is absolute or relative
    // On Windows, absolute paths start with drive letter (C:\, D:\, etc.)
    // On Unix, absolute paths start with /
    const isAbsolute =
      downloadLocation.startsWith("/") ||
      /^[A-Za-z]:[\\/]/.test(downloadLocation);

    if (isAbsolute) {
      // Absolute path - use as is
      return `${downloadLocation}/${fileName}`;
    } else {
      // Relative path - use forward slash for display (works on all platforms)
      return `${downloadLocation}/${fileName}`;
    }
  }, [url, title, downloadLocation]);

  useEffect(() => {
    // Load settings to get download location
    if (window?.ipcRenderer) {
      window.ipcRenderer
        .invoke("load-settings")
        .then((loaded) => {
          if (
            loaded &&
            typeof loaded.downloadLocation === "string" &&
            loaded.downloadLocation
          ) {
            setDownloadLocation(loaded.downloadLocation);
          }
        })
        .catch((error) => {
          console.error("Failed to load settings", error);
        });
    }
  }, []);

  // Log URL whenever it changes
  useEffect(() => {
    if (url) {
      console.log("========================================");
      console.log("📥 URL STATE UPDATED!");
      console.log("========================================");
      console.log("🔗 URL:", url);
      console.log("📝 Title:", title || "No title");
      console.log("📁 Download Location:", downloadLocation);
      console.log("💾 File Path:", filePath);
      console.log("========================================");
    } else {
      console.log("URL is empty");
    }
  }, [url, title, downloadLocation, filePath]);

  useEffect(() => {
    // Log when component mounts
    console.log("=== DownloaderApp Component Mounted ===");
    console.log("IPC Renderer available:", !!window?.ipcRenderer);

    // Listen for download request from main process
    if (window?.ipcRenderer) {
      console.log("Setting up download-request event listener...");

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
        // Very prominent logging
        console.log("========================================");
        console.log("🚀 DOWNLOAD REQUEST RECEIVED!");
        console.log("========================================");
        console.log("🔗 URL:", data.url);
        console.log("📝 Title:", data.title || "No title");
        console.log("🍪 Has Cookies:", !!data.cookies);
        console.log("========================================");

        // Also log as a table for better visibility
        console.table({
          URL: data.url,
          Title: data.title || "No title",
          HasCookies: !!data.cookies,
        });

        // Set the URL in the input field
        setUrl(data.url || "");
        setTitle(data.title || null);
        setCookies(data.cookies || null);
        setDownloadProgress(null);
        setIsDownloading(false);
        setIsPaused(false);
        setIsDownloadComplete(false);
        setCompletedFilePath(null);
        setDownloadError(null);

        // Determine if pause is supported based on URL
        // Fetch-based downloads (YouTube/TikTok) don't support pause
        if (data.url) {
          try {
            const urlObj = new URL(data.url);
            const isYouTube =
              urlObj.hostname.includes("youtube.com") ||
              urlObj.hostname.includes("youtu.be") ||
              urlObj.hostname.includes("googlevideo.com");
            const isTikTok =
              data.cookies &&
              (data.cookies.msToken || data.cookies.ttChainToken);
            setSupportsPause(!(isYouTube || isTikTok));
          } catch {
            // If URL parsing fails, assume pause is supported
            setSupportsPause(true);
          }
        } else {
          setSupportsPause(true);
        }

        // Log cookies if present
        if (
          data.cookies &&
          (data.cookies.msToken || data.cookies.ttChainToken)
        ) {
          console.log("Download - Cookies received:", {
            msToken: data.cookies.msToken
              ? `${data.cookies.msToken.substring(0, 20)}...`
              : null,
            ttChainToken: data.cookies.ttChainToken
              ? `${data.cookies.ttChainToken.substring(0, 20)}...`
              : null,
            url: data.url,
          });
        }
      };

      const handleDownloadProgress = (
        _event: unknown,
        data: { percent: number; received: number; total: number }
      ) => {
        setDownloadProgress(data.percent);
      };

      const handleDownloadComplete = (
        _event: unknown,
        data: { filePath: string }
      ) => {
        setDownloadProgress(100);
        setIsDownloading(false);
        setIsPaused(false);
        setIsDownloadComplete(true);
        setCompletedFilePath(data.filePath);
      };

      const handleDownloadError = (
        _event: unknown,
        data: { error: string }
      ) => {
        setDownloadError(data.error);
        setIsDownloading(false);
        setIsPaused(false);
        setIsDownloadComplete(false);
        setCompletedFilePath(null);
        setDownloadProgress(null);
      };

      const handleDownloadCancelled = () => {
        console.log("Download cancelled by user");
        setDownloadError(null);
        setIsDownloading(false);
        setIsPaused(false);
        setIsDownloadComplete(false);
        setCompletedFilePath(null);
        setDownloadProgress(null);
      };

      window.ipcRenderer.on("download-request", handleDownloadRequest);
      window.ipcRenderer.on("download-progress", handleDownloadProgress);
      window.ipcRenderer.on("download-complete", handleDownloadComplete);
      window.ipcRenderer.on("download-error", handleDownloadError);
      window.ipcRenderer.on("download-cancelled", handleDownloadCancelled);

      console.log("✅ Event listeners set up successfully!");

      // Request any pending download data that might have been sent before listener was ready
      const requestPendingData = async () => {
        try {
          if (window?.ipcRenderer) {
            const pendingData = await window.ipcRenderer.invoke(
              "get-pending-download"
            );
            if (pendingData && pendingData.url) {
              console.log("📦 Found pending download data:", pendingData);
              handleDownloadRequest(null, pendingData);
            } else {
              console.log("No pending download data found");
            }
          }
        } catch (error) {
          console.error("Error requesting pending download data:", error);
        }
      };

      // Request any pending data after a short delay to ensure everything is ready
      setTimeout(() => {
        requestPendingData();
      }, 100);

      return () => {
        console.log("Cleaning up event listeners...");
        window.ipcRenderer?.off("download-request", handleDownloadRequest);
        window.ipcRenderer?.off("download-progress", handleDownloadProgress);
        window.ipcRenderer?.off("download-complete", handleDownloadComplete);
        window.ipcRenderer?.off("download-error", handleDownloadError);
        window.ipcRenderer?.off("download-cancelled", handleDownloadCancelled);
      };
    } else {
      console.error("❌ window.ipcRenderer is not available!");
    }
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center gap-4 bg-background p-0 text-sm select-none">
      <header className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide drag-css">
        <span className="truncate">{title || "Download File Info"}</span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-base no-drag-css"
            onClick={() => {
              if (window?.ipcRenderer) {
                window.ipcRenderer.invoke("window-minimize");
              }
            }}
          >
            ─<span className="sr-only">Minimize</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-base no-drag-css"
            onClick={async () => {
              if (window?.ipcRenderer) {
                // If download is in progress, cancel it first
                if (isDownloading) {
                  try {
                    await window.ipcRenderer.invoke("cancel-download");
                  } catch (error) {
                    console.error("Error cancelling download:", error);
                  }
                }
                // Close the window
                window.ipcRenderer.invoke("window-close");
              }
            }}
          >
            ×<span className="sr-only">Close</span>
          </Button>
        </div>
      </header>
      <div className="w-full max-w-lg space-y-1.5">
        <label className="text-xs font-medium" htmlFor="download-input">
          URL
        </label>
        <Input
          id="download-input"
          readOnly
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
            value={filePath}
            disabled
            className="h-9 flex-1 text-xs text-muted-foreground"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={async () => {
              if (!window?.ipcRenderer) return;
              try {
                const selectedPath = await window.ipcRenderer.invoke(
                  "select-download-location"
                );
                if (selectedPath) {
                  // Update the download location
                  setDownloadLocation(selectedPath);

                  // Save to settings
                  await window.ipcRenderer.invoke("save-settings", {
                    downloadLocation: selectedPath,
                  });

                  console.log("Download location updated to:", selectedPath);
                }
              } catch (error) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : "Failed to select download location";
                setDownloadError(errorMessage);
                console.error("Error selecting download location:", error);
              }
            }}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="sr-only">Browse</span>
          </Button>
        </div>
      </div>
      {downloadError && (
        <div className="w-full max-w-lg p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-xs text-destructive wrap-break-word">
            {downloadError}
          </p>
        </div>
      )}
      {downloadProgress !== null && (
        <div className="w-full max-w-lg space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Download progress</span>
            <span className="font-medium">{downloadProgress}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex w-full max-w-lg items-center justify-end gap-2">
        {!isDownloadComplete && (
          <Button
            variant="outline"
            className="h-8 px-3 text-xs"
            onClick={async () => {
              if (!window?.ipcRenderer) return;

              // If download is in progress, cancel it
              if (isDownloading) {
                try {
                  const result = await window.ipcRenderer.invoke(
                    "cancel-download"
                  );
                  if (!result?.success) {
                    setDownloadError(
                      result?.error || "Failed to cancel download"
                    );
                  }
                } catch (error) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "Failed to cancel download";
                  setDownloadError(errorMessage);
                }
              } else {
                // If not downloading, just close the window
                window.ipcRenderer.invoke("window-close");
              }
            }}
          >
            {isDownloading ? "Cancel" : "Close"}
          </Button>
        )}
        {isDownloading && supportsPause && (
          <>
            {isPaused ? (
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={async () => {
                  if (!window?.ipcRenderer) return;
                  try {
                    const result = await window.ipcRenderer.invoke(
                      "resume-download"
                    );
                    if (result?.success) {
                      setIsPaused(false);
                    } else {
                      setDownloadError(
                        result?.error || "Failed to resume download"
                      );
                    }
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : "Failed to resume download";
                    setDownloadError(errorMessage);
                  }
                }}
              >
                Resume
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={async () => {
                  if (!window?.ipcRenderer) return;
                  try {
                    const result = await window.ipcRenderer.invoke(
                      "pause-download"
                    );
                    if (result?.success) {
                      setIsPaused(true);
                    } else {
                      setDownloadError(
                        result?.error || "Failed to pause download"
                      );
                    }
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error
                        ? error.message
                        : "Failed to pause download";
                    setDownloadError(errorMessage);
                  }
                }}
              >
                Pause
              </Button>
            )}
          </>
        )}
        {isDownloadComplete && completedFilePath && (
          <Button
            className="h-8 px-3 text-xs"
            onClick={async () => {
              if (!window?.ipcRenderer || !completedFilePath) return;
              try {
                await window.ipcRenderer.invoke(
                  "open-folder",
                  completedFilePath
                );
              } catch (error) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : "Failed to open folder";
                setDownloadError(errorMessage);
              }
            }}
          >
            Open folder
          </Button>
        )}
        {!isDownloading && !isDownloadComplete && (
          <Button
            className="h-8 px-3 text-xs"
            onClick={async () => {
              if (!url || !filePath || !window?.ipcRenderer) return;

              setIsDownloading(true);
              setIsPaused(false);
              setIsDownloadComplete(false);
              setCompletedFilePath(null);
              setDownloadError(null);
              setDownloadProgress(0);

              try {
                // Use the exact path shown in the "Save as" field
                await window.ipcRenderer.invoke("download-file", {
                  url,
                  filePath, // Use the computed file path
                  cookies,
                });
              } catch (error) {
                const errorMessage =
                  error instanceof Error
                    ? error.message
                    : "Failed to start download";
                setDownloadError(errorMessage);
                setIsDownloading(false);
                setIsPaused(false);
                setIsDownloadComplete(false);
                setCompletedFilePath(null);
                setDownloadProgress(null);
              }
            }}
            disabled={!url || !filePath}
          >
            Start download
          </Button>
        )}
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
