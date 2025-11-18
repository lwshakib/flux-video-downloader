import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
// import { createRequire } from 'node:module'
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

// Platform-specific icon paths
const getIconPath = (): string => {
  const platform = process.platform;
  const basePath = process.env.APP_ROOT;

  switch (platform) {
    case "win32":
      return path.join(basePath, "public", "icons", "win", "icon.ico");
    case "darwin":
      return path.join(basePath, "public", "icons", "mac", "icon.icns");
    case "linux":
    default:
      return path.join(basePath, "public", "icons", "png", "256x256.png");
  }
};

const iconPath = getIconPath();

const getSettingsPaths = () => {
  const homeDir = process.env.USERPROFILE || os.homedir();
  const settingsDir = path.join(homeDir, ".flux");
  const settingsFile = path.join(settingsDir, "settings.json");
  return { settingsDir, settingsFile };
};

const ensureSettingsFile = async () => {
  const { settingsDir, settingsFile } = getSettingsPaths();
  const defaultSettings = { downloadLocation: "Downloads" };

  try {
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.access(settingsFile);
  } catch {
    await fs.writeFile(
      settingsFile,
      JSON.stringify(defaultSettings, null, 2),
      "utf-8"
    );
  }
};

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

const downloaderUrl = VITE_DEV_SERVER_URL
  ? `${VITE_DEV_SERVER_URL}/downloader.html`
  : path.join(RENDERER_DIST, "downloader.html");

let win: BrowserWindow | null;

// Store active download items by window ID
const activeDownloads = new Map<number, Electron.DownloadItem>();

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    center: true,
    title: "Flux",
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      sandbox: true,
      contextIsolation: true,
    },
  });

  // Open DevTools for main window
  win.webContents.openDevTools();

  win.on("ready-to-show", () => {
    win?.show();
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

ipcMain.handle("select-download-location", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Select download folder",
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  return filePaths[0];
});

ipcMain.handle("load-settings", async () => {
  try {
    const { settingsDir, settingsFile } = getSettingsPaths();
    await fs.mkdir(settingsDir, { recursive: true });
    const contents = await fs.readFile(settingsFile, "utf-8");
    return JSON.parse(contents);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return null;
    }
    console.error("Failed to load settings", error);
    return null;
  }
});

ipcMain.handle("save-settings", async (_event, payload) => {
  try {
    const { settingsDir, settingsFile } = getSettingsPaths();
    await fs.mkdir(settingsDir, { recursive: true });
    const data = JSON.stringify(payload ?? {}, null, 2);
    await fs.writeFile(settingsFile, data, "utf-8");
    return true;
  } catch (error) {
    console.error("Failed to save settings", error);
    return false;
  }
});

// Handle theme changes and broadcast to all windows
ipcMain.on("theme-change", (_event, theme: string) => {
  // Broadcast theme change to all windows
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send("theme-changed", theme);
    }
  });
});

// Handle window controls
ipcMain.handle("window-minimize", (_event) => {
  const window = BrowserWindow.fromWebContents(_event.sender);
  if (window && !window.isDestroyed()) {
    window.minimize();
  }
  return true;
});

ipcMain.handle("window-maximize", (_event) => {
  const window = BrowserWindow.fromWebContents(_event.sender);
  if (window && !window.isDestroyed()) {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }
  return true;
});

ipcMain.handle("window-close", (_event) => {
  const window = BrowserWindow.fromWebContents(_event.sender);
  if (window && !window.isDestroyed()) {
    window.close();
  }
  return true;
});

// Handle download requests - creates a new window for each download
ipcMain.handle(
  "start-download",
  async (
    _event,
    payload: {
      url: string;
      title?: string | null;
      cookies?: {
        msToken?: string | null;
        ttChainToken?: string | null;
      } | null;
    }
  ) => {
    // Create a new downloader window for each download
    const newDownloaderWindow = new BrowserWindow({
      width: 600,
      height: 300,
      minWidth: 600,
      maxWidth: 600,
      minHeight: 300,
      maxHeight: 300,
      resizable: false,
      show: false,
      autoHideMenuBar: true,
      center: true,
      title: "Flux Downloader",
      frame: false,
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        sandbox: true,
        contextIsolation: true,
      },
    });

    newDownloaderWindow.on("ready-to-show", () => {
      newDownloaderWindow?.show();
    });

    // Wait for the window to be ready, then send download data
    const sendDownloadData = () => {
      if (newDownloaderWindow && !newDownloaderWindow.isDestroyed()) {
        newDownloaderWindow.webContents.send("download-request", {
          url: payload.url,
          title: payload.title || null,
          cookies: payload.cookies || null,
        });
        newDownloaderWindow.show();
        newDownloaderWindow.focus();
      }
    };

    // Load the downloader page
    if (VITE_DEV_SERVER_URL) {
      newDownloaderWindow.loadURL(downloaderUrl);
    } else {
      newDownloaderWindow.loadFile(path.join(RENDERER_DIST, "downloader.html"));
    }

    // Send data once the page is loaded
    newDownloaderWindow.webContents.once("did-finish-load", sendDownloadData);

    return true;
  }
);

// Handle actual file download with progress
ipcMain.handle(
  "download-file",
  async (
    event,
    payload: {
      url: string;
      filePath: string;
      cookies?: {
        msToken?: string | null;
        ttChainToken?: string | null;
      } | null;
    }
  ) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
      return { success: false, error: "Window not found" };
    }

    try {
      // Get the window's session
      const windowSession = window.webContents.session;

      // Resolve file path to absolute path
      // Normalize path separators (handle both / and \)
      const normalizedPath = payload.filePath.replace(/\//g, path.sep);
      let absoluteFilePath = normalizedPath;

      if (!path.isAbsolute(absoluteFilePath)) {
        // If relative, resolve to user's home directory
        const homeDir = process.env.USERPROFILE || os.homedir();
        absoluteFilePath = path.join(homeDir, normalizedPath);
      }

      // Normalize the final path (resolve .. and . segments)
      absoluteFilePath = path.normalize(absoluteFilePath);

      // Ensure the directory exists
      const dir = path.dirname(absoluteFilePath);
      await fs.mkdir(dir, { recursive: true });

      // Only set up cookies for TikTok videos (when cookies are provided)
      if (
        payload.cookies &&
        (payload.cookies.msToken || payload.cookies.ttChainToken)
      ) {
        const urlObj = new URL(payload.url);
        const domain = urlObj.hostname;

        // Set cookies in the session
        if (payload.cookies.msToken) {
          await windowSession.cookies.set({
            url: payload.url,
            name: "msToken",
            value: payload.cookies.msToken,
            domain: domain,
          });
        }
        if (payload.cookies.ttChainToken) {
          await windowSession.cookies.set({
            url: payload.url,
            name: "tt-chain-token",
            value: payload.cookies.ttChainToken,
            domain: domain,
          });
        }

        // Set up request interceptor to add cookies to headers
        const interceptorHandler = (
          details: Electron.OnBeforeSendHeadersListenerDetails,
          callback: (response: {
            requestHeaders?: Record<string, string>;
          }) => void
        ) => {
          const headers = { ...details.requestHeaders };
          const cookieParts: string[] = [];
          if (payload.cookies?.msToken) {
            cookieParts.push(`msToken=${payload.cookies.msToken}`);
          }
          if (payload.cookies?.ttChainToken) {
            cookieParts.push(`tt-chain-token=${payload.cookies.ttChainToken}`);
          }
          if (cookieParts.length > 0) {
            headers["Cookie"] = cookieParts.join("; ");
          }
          callback({ requestHeaders: headers });
        };

        windowSession.webRequest.onBeforeSendHeaders(
          {
            urls: [payload.url],
          },
          interceptorHandler
        );
      }

      return new Promise((resolve) => {
        let downloadResolved = false;

        // Set up will-download listener BEFORE calling downloadURL
        // This prevents the default save dialog from appearing
        const willDownloadHandler = (
          _event: Electron.Event,
          item: Electron.DownloadItem
        ) => {
          // Match by URL (handle query parameters)
          const itemUrl = item.getURL();
          const baseUrl = payload.url.split("?")[0];
          const itemBaseUrl = itemUrl.split("?")[0];

          if (itemUrl === payload.url || itemBaseUrl === baseUrl) {
            // Store the download item for pause/resume functionality
            activeDownloads.set(window.id, item);

            // CRITICAL: Set the save path IMMEDIATELY and SYNCHRONOUSLY
            // This prevents the save dialog from appearing
            item.setSavePath(absoluteFilePath);

            // Track progress
            item.on("updated", () => {
              const total = item.getTotalBytes();
              const received = item.getReceivedBytes();
              if (total > 0) {
                const progress = received / total;
                const percent = Math.round(progress * 100);
                window.webContents.send("download-progress", {
                  percent: isNaN(percent) ? 0 : percent,
                  received: received,
                  total: total,
                });
              }
            });

            // Handle completion
            item.once("done", (_event, state) => {
              // Remove the download item from active downloads
              activeDownloads.delete(window.id);

              // Remove the listener after this download completes
              windowSession.removeListener(
                "will-download",
                willDownloadHandler
              );

              if (state === "completed") {
                if (!downloadResolved) {
                  downloadResolved = true;
                  window.webContents.send("download-complete", {
                    filePath: absoluteFilePath,
                  });
                  resolve({ success: true, filePath: absoluteFilePath });
                }
              } else {
                if (!downloadResolved) {
                  downloadResolved = true;
                  const error = `Download failed: ${state}`;
                  window.webContents.send("download-error", { error });
                  resolve({ success: false, error });
                }
              }
            });
          }
        };

        // Register the handler BEFORE starting the download
        windowSession.on("will-download", willDownloadHandler);

        // Start the download
        window.webContents.downloadURL(payload.url);

        // Timeout fallback
        setTimeout(() => {
          if (!downloadResolved) {
            downloadResolved = true;
            // Clean up listener on timeout
            windowSession.removeListener("will-download", willDownloadHandler);
            const error = "Download timeout - no download started";
            window.webContents.send("download-error", { error });
            resolve({ success: false, error });
          }
        }, 30000); // 30 second timeout
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      window.webContents.send("download-error", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
);

// Handle pause download
ipcMain.handle("pause-download", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { success: false, error: "Window not found" };
  }

  const downloadItem = activeDownloads.get(window.id);
  if (!downloadItem) {
    return { success: false, error: "No active download found" };
  }

  if (downloadItem.canResume()) {
    downloadItem.pause();
    return { success: true };
  }

  return { success: false, error: "Download cannot be paused" };
});

// Handle resume download
ipcMain.handle("resume-download", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { success: false, error: "Window not found" };
  }

  const downloadItem = activeDownloads.get(window.id);
  if (!downloadItem) {
    return { success: false, error: "No active download found" };
  }

  if (downloadItem.canResume()) {
    downloadItem.resume();
    return { success: true };
  }

  return { success: false, error: "Download cannot be resumed" };
});

// Handle open folder
ipcMain.handle("open-folder", async (_event, filePath: string) => {
  try {
    // Get the directory containing the file
    const dir = path.dirname(filePath);
    // Open the folder in the system file manager
    await shell.openPath(dir);
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to open folder";
    return { success: false, error: errorMessage };
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  await ensureSettingsFile();
  createWindow();
});
