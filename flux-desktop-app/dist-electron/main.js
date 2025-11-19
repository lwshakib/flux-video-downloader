import { ipcMain, dialog, BrowserWindow, shell, app } from "electron";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
const getIconPath = () => {
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
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const downloaderUrl = VITE_DEV_SERVER_URL ? `${VITE_DEV_SERVER_URL}/downloader.html` : path.join(RENDERER_DIST, "downloader.html");
let win;
const activeDownloads = /* @__PURE__ */ new Map();
let downloaderWindow = null;
let pendingDownloadData = null;
const EXTENSION_SERVER_PORT = 8765;
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
      preload: path.join(__dirname$1, "preload.mjs"),
      sandbox: true,
      contextIsolation: true
    }
  });
  win.webContents.openDevTools();
  win.on("ready-to-show", () => {
    win == null ? void 0 : win.show();
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("select-download-location", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Select download folder"
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
    const err = error;
    if ((err == null ? void 0 : err.code) === "ENOENT") {
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
ipcMain.on("theme-change", (_event, theme) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send("theme-changed", theme);
    }
  });
});
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
ipcMain.handle("get-pending-download", () => {
  const data = pendingDownloadData;
  if (data) {
    pendingDownloadData = null;
  }
  return data;
});
function createDownloaderWindow(payload) {
  if (downloaderWindow && !downloaderWindow.isDestroyed()) {
    console.log("Reusing existing downloader window");
    downloaderWindow.webContents.send("download-request", {
      url: payload.url,
      title: payload.title || null,
      cookies: payload.cookies || null
    });
    downloaderWindow.show();
    downloaderWindow.focus();
    return;
  }
  console.log("Creating new downloader window");
  const newDownloaderWindow = new BrowserWindow({
    width: 600,
    height: 300,
    minWidth: 400,
    minHeight: 250,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    center: true,
    title: "Flux Downloader",
    frame: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      sandbox: true,
      contextIsolation: true
    }
  });
  downloaderWindow = newDownloaderWindow;
  newDownloaderWindow.on("closed", () => {
    if (downloaderWindow === newDownloaderWindow) {
      downloaderWindow = null;
    }
  });
  newDownloaderWindow.on("ready-to-show", () => {
    newDownloaderWindow == null ? void 0 : newDownloaderWindow.show();
    newDownloaderWindow == null ? void 0 : newDownloaderWindow.focus();
  });
  newDownloaderWindow.webContents.openDevTools();
  const downloadPayload = {
    url: payload.url,
    title: payload.title || null,
    cookies: payload.cookies || null
  };
  pendingDownloadData = downloadPayload;
  const sendDownloadData = () => {
    if (newDownloaderWindow && !newDownloaderWindow.isDestroyed()) {
      setTimeout(() => {
        if (newDownloaderWindow && !newDownloaderWindow.isDestroyed()) {
          console.log("========================================");
          console.log("📤 Sending download-request event to renderer");
          console.log("🔗 URL:", downloadPayload.url);
          console.log("📝 Title:", downloadPayload.title);
          console.log("========================================");
          newDownloaderWindow.webContents.send(
            "download-request",
            downloadPayload
          );
          newDownloaderWindow.show();
          newDownloaderWindow.focus();
          console.log("✅ Downloader window opened and data sent");
        } else {
          console.error("❌ Cannot send data - window is destroyed");
        }
      }, 1e3);
    } else {
      console.error("❌ Cannot send data - window is destroyed");
    }
  };
  if (VITE_DEV_SERVER_URL) {
    newDownloaderWindow.loadURL(downloaderUrl);
  } else {
    newDownloaderWindow.loadFile(path.join(RENDERER_DIST, "downloader.html"));
  }
  newDownloaderWindow.webContents.once("did-finish-load", sendDownloadData);
  setTimeout(() => {
    if (newDownloaderWindow && !newDownloaderWindow.isDestroyed() && !newDownloaderWindow.isVisible()) {
      console.log("Fallback: Showing downloader window after timeout");
      newDownloaderWindow.show();
      newDownloaderWindow.focus();
      try {
        newDownloaderWindow.webContents.send(
          "download-request",
          downloadPayload
        );
      } catch (error) {
        console.error("Failed to send download data in fallback:", error);
      }
    }
  }, 3e3);
}
ipcMain.handle(
  "start-download",
  async (_event, payload) => {
    createDownloaderWindow(payload);
    return true;
  }
);
const MAX_REDIRECTS = 5;
const BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
  Referer: "https://www.tiktok.com/"
};
function buildCookieHeader(msToken, ttChainToken) {
  const parts = [];
  if (msToken) {
    parts.push(`msToken=${msToken}`);
  }
  if (ttChainToken) {
    parts.push(`tt_chain_token=${ttChainToken}`);
  }
  return parts.join("; ");
}
async function fetchWithRedirects(url, attempt = 1) {
  var _a;
  if (attempt > MAX_REDIRECTS) {
    throw new Error("Too many redirects while downloading the video.");
  }
  const parsed = new URL(url);
  const headers = new Headers({
    ...BASE_HEADERS,
    Host: parsed.hostname
  });
  const response = await fetch(url, {
    headers,
    redirect: "manual"
  });
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    const nextUrl = new URL(response.headers.get("location"), url);
    console.log(`Redirect ${attempt}: ${url} -> ${nextUrl.toString()}`);
    (_a = response.body) == null ? void 0 : _a.cancel();
    return fetchWithRedirects(nextUrl.toString(), attempt + 1);
  }
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Download failed with status ${response.status}. ${errorBody}`
    );
  }
  return response;
}
async function fetchWithCookies(url, cookieHeader, attempt = 1) {
  var _a;
  if (attempt > MAX_REDIRECTS) {
    throw new Error("Too many redirects while downloading the video.");
  }
  const parsed = new URL(url);
  const headers = new Headers({
    ...BASE_HEADERS,
    Host: parsed.hostname
  });
  if (!cookieHeader) {
    throw new Error(
      "TikTok cookie header could not be constructed from TikTok response."
    );
  }
  headers.set("Cookie", cookieHeader);
  const response = await fetch(url, {
    headers,
    redirect: "manual"
  });
  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    const nextUrl = new URL(response.headers.get("location"), url);
    console.log(`TikTok redirect ${attempt}: ${url} -> ${nextUrl.toString()}`);
    (_a = response.body) == null ? void 0 : _a.cancel();
    return fetchWithCookies(nextUrl.toString(), cookieHeader, attempt + 1);
  }
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Download failed with status ${response.status}. ${errorBody}`
    );
  }
  return response;
}
ipcMain.handle(
  "download-file",
  async (event, payload) => {
    var _a, _b;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
      console.error("Download error: Window not found");
      return { success: false, error: "Window not found" };
    }
    try {
      console.log("Download started:", {
        url: payload.url.substring(0, 100) + "...",
        hasCookies: !!(((_a = payload.cookies) == null ? void 0 : _a.msToken) || ((_b = payload.cookies) == null ? void 0 : _b.ttChainToken))
      });
      const windowSession = window.webContents.session;
      const normalizedPath = payload.filePath.replace(/\//g, path.sep);
      let absoluteFilePath = normalizedPath;
      if (!path.isAbsolute(absoluteFilePath)) {
        const homeDir = process.env.USERPROFILE || os.homedir();
        absoluteFilePath = path.join(homeDir, normalizedPath);
      }
      absoluteFilePath = path.normalize(absoluteFilePath);
      const finalDir = path.dirname(absoluteFilePath);
      await fs.mkdir(finalDir, { recursive: true });
      const tempDir = path.join(os.tmpdir(), "flux-downloads");
      await fs.mkdir(tempDir, { recursive: true });
      const fileName = path.basename(absoluteFilePath);
      const fileExt = path.extname(fileName);
      const fileBase = path.basename(fileName, fileExt);
      const tempFilePath = path.join(
        tempDir,
        `${fileBase}-${Date.now()}${fileExt}`
      );
      const urlObj = new URL(payload.url);
      const isYouTube = urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be") || urlObj.hostname.includes("googlevideo.com");
      const isTikTokDownload = payload.cookies && (payload.cookies.msToken || payload.cookies.ttChainToken);
      if ((isYouTube || isTikTokDownload) && (!isTikTokDownload || payload.cookies)) {
        const downloadType = isYouTube ? "YouTube" : "TikTok";
        console.log(`Using fetch-based download for ${downloadType} video`);
        let cookieHeader = "";
        if (isTikTokDownload && payload.cookies) {
          cookieHeader = buildCookieHeader(
            payload.cookies.msToken,
            payload.cookies.ttChainToken
          );
          console.log("Cookie header built:", cookieHeader ? "Yes" : "No");
        }
        try {
          let response;
          if (isTikTokDownload && cookieHeader) {
            response = await fetchWithCookies(payload.url, cookieHeader);
          } else {
            response = await fetchWithRedirects(payload.url);
          }
          console.log("Fetch response received:", {
            status: response.status,
            contentType: response.headers.get("content-type")
          });
          const contentLength = response.headers.get("content-length");
          const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
          const fileHandle = await fs.open(tempFilePath, "w");
          const body = response.body;
          if (!body) {
            await fileHandle.close();
            throw new Error("Response body is null");
          }
          let receivedBytes = 0;
          let position = 0;
          const reader = body.getReader();
          try {
            let reading = true;
            while (reading) {
              const { done, value } = await reader.read();
              if (done) {
                reading = false;
                break;
              }
              if (value) {
                const buffer = Buffer.from(value);
                await fileHandle.write(buffer, 0, buffer.length, position);
                position += buffer.length;
                receivedBytes += buffer.length;
                if (totalBytes > 0) {
                  const percent = Math.round(
                    receivedBytes / totalBytes * 100
                  );
                  window.webContents.send("download-progress", {
                    percent: isNaN(percent) ? 0 : percent,
                    received: receivedBytes,
                    total: totalBytes
                  });
                }
              }
            }
          } finally {
            await fileHandle.close();
          }
          console.log("Download completed, copying to final location");
          let finalPath = absoluteFilePath;
          let counter = 1;
          let fileExists = true;
          while (fileExists) {
            try {
              await fs.access(finalPath);
              const dir = path.dirname(absoluteFilePath);
              const ext = path.extname(absoluteFilePath);
              const base = path.basename(absoluteFilePath, ext);
              finalPath = path.join(dir, `${base} (${counter})${ext}`);
              counter++;
            } catch {
              fileExists = false;
            }
          }
          await fs.copyFile(tempFilePath, finalPath);
          console.log("File copied to:", finalPath);
          try {
            await fs.unlink(tempFilePath);
          } catch (cleanupError) {
            console.warn("Failed to cleanup temp file:", cleanupError);
          }
          window.webContents.send("download-complete", {
            filePath: finalPath
          });
          return { success: true, filePath: finalPath };
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : `Failed to download ${isYouTube ? "YouTube" : "TikTok"} video`;
          console.error(
            `${isYouTube ? "YouTube" : "TikTok"} download error:`,
            errorMessage,
            fetchError
          );
          window.webContents.send("download-error", { error: errorMessage });
          try {
            await fs.unlink(tempFilePath);
          } catch {
          }
          return { success: false, error: errorMessage };
        }
      }
      return new Promise((resolve) => {
        let downloadResolved = false;
        const willDownloadHandler = (_event, item) => {
          const itemUrl = item.getURL();
          const baseUrl = payload.url.split("?")[0];
          const itemBaseUrl = itemUrl.split("?")[0];
          if (itemUrl === payload.url || itemBaseUrl === baseUrl) {
            activeDownloads.set(window.id, item);
            item.setSavePath(tempFilePath);
            item.on("updated", () => {
              const total = item.getTotalBytes();
              const received = item.getReceivedBytes();
              if (total > 0) {
                const progress = received / total;
                const percent = Math.round(progress * 100);
                window.webContents.send("download-progress", {
                  percent: isNaN(percent) ? 0 : percent,
                  received,
                  total
                });
              }
            });
            item.once("done", (_event2, state) => {
              activeDownloads.delete(window.id);
              windowSession.removeListener(
                "will-download",
                willDownloadHandler
              );
              if (state === "completed") {
                if (!downloadResolved) {
                  downloadResolved = true;
                  console.log("Download completed, copying to final location");
                  (async () => {
                    try {
                      let finalPath = absoluteFilePath;
                      let counter = 1;
                      let fileExists = true;
                      while (fileExists) {
                        try {
                          await fs.access(finalPath);
                          const dir = path.dirname(absoluteFilePath);
                          const ext = path.extname(absoluteFilePath);
                          const base = path.basename(absoluteFilePath, ext);
                          finalPath = path.join(
                            dir,
                            `${base} (${counter})${ext}`
                          );
                          counter++;
                        } catch {
                          fileExists = false;
                        }
                      }
                      await fs.copyFile(tempFilePath, finalPath);
                      console.log("File copied to:", finalPath);
                      try {
                        await fs.unlink(tempFilePath);
                      } catch (cleanupError) {
                        console.warn(
                          "Failed to cleanup temp file:",
                          cleanupError
                        );
                      }
                      window.webContents.send("download-complete", {
                        filePath: finalPath
                      });
                    } catch (copyError) {
                      const errorMessage = copyError instanceof Error ? copyError.message : "Failed to copy file to final location";
                      console.error("Copy error:", errorMessage, copyError);
                      window.webContents.send("download-error", {
                        error: errorMessage
                      });
                    }
                  })();
                  resolve({ success: true, filePath: absoluteFilePath });
                }
              } else {
                if (!downloadResolved) {
                  downloadResolved = true;
                  const error = `Download failed: ${state}`;
                  console.error("Download failed:", error);
                  (async () => {
                    try {
                      await fs.unlink(tempFilePath);
                    } catch (cleanupError) {
                      console.warn(
                        "Failed to cleanup temp file on error:",
                        cleanupError
                      );
                    }
                  })();
                  window.webContents.send("download-error", { error });
                  resolve({ success: false, error });
                }
              }
            });
          }
        };
        windowSession.on("will-download", willDownloadHandler);
        window.webContents.downloadURL(payload.url);
        setTimeout(() => {
          if (!downloadResolved) {
            downloadResolved = true;
            windowSession.removeListener("will-download", willDownloadHandler);
            (async () => {
              try {
                await fs.unlink(tempFilePath);
              } catch {
              }
            })();
            const error = "Download timeout - no download started";
            console.error("Download timeout:", error);
            window.webContents.send("download-error", { error });
            resolve({ success: false, error });
          }
        }, 3e4);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Download error:", errorMessage, error);
      window.webContents.send("download-error", { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }
);
ipcMain.handle("pause-download", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { success: false, error: "Window not found" };
  }
  const downloadItem = activeDownloads.get(window.id);
  if (!downloadItem) {
    return {
      success: false,
      error: "No active download found. Pause is not supported for fetch-based downloads (YouTube/TikTok)."
    };
  }
  if (downloadItem.isPaused()) {
    return { success: false, error: "Download is already paused" };
  }
  const state = downloadItem.getState();
  if (state === "completed" || state === "cancelled" || state === "interrupted") {
    return {
      success: false,
      error: "Download cannot be paused in current state"
    };
  }
  try {
    downloadItem.pause();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to pause download";
    return { success: false, error: errorMessage };
  }
});
ipcMain.handle("resume-download", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { success: false, error: "Window not found" };
  }
  const downloadItem = activeDownloads.get(window.id);
  if (!downloadItem) {
    return {
      success: false,
      error: "No active download found. Resume is not supported for fetch-based downloads (YouTube/TikTok)."
    };
  }
  if (!downloadItem.canResume()) {
    return {
      success: false,
      error: "Download cannot be resumed. It may not be paused."
    };
  }
  try {
    downloadItem.resume();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to resume download";
    return { success: false, error: errorMessage };
  }
});
ipcMain.handle("cancel-download", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) {
    return { success: false, error: "Window not found" };
  }
  const downloadItem = activeDownloads.get(window.id);
  if (!downloadItem) {
    return { success: false, error: "No active download found" };
  }
  try {
    downloadItem.cancel();
    activeDownloads.delete(window.id);
    window.webContents.send("download-cancelled");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to cancel download";
    return { success: false, error: errorMessage };
  }
});
ipcMain.handle("open-folder", async (_event, filePath) => {
  try {
    const dir = path.dirname(filePath);
    await shell.openPath(dir);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to open folder";
    return { success: false, error: errorMessage };
  }
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
let extensionServer = null;
function createExtensionServer() {
  if (extensionServer && extensionServer.listening) {
    console.log("Extension server already running");
    return extensionServer;
  }
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }
    if (req.method === "POST" && req.url === "/download") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          console.log("Received download request from extension:", data.url);
          createDownloaderWindow(data);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error("Error processing extension request:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Invalid request" }));
        }
      });
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  server.listen(EXTENSION_SERVER_PORT, "127.0.0.1", () => {
    console.log(
      `Extension server listening on http://127.0.0.1:${EXTENSION_SERVER_PORT}`
    );
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log(
        `Port ${EXTENSION_SERVER_PORT} is already in use. Trying to reuse existing server.`
      );
      setTimeout(() => {
        createExtensionServer();
      }, 1e3);
    } else {
      console.error("Extension server error:", error);
      setTimeout(() => {
        createExtensionServer();
      }, 2e3);
    }
  });
  extensionServer = server;
  return server;
}
app.whenReady().then(async () => {
  await ensureSettingsFile();
  createWindow();
  createExtensionServer();
  console.log("Flux desktop app ready. Extension server should be running.");
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
