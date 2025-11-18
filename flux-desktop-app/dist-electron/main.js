import { ipcMain, dialog, BrowserWindow, shell, app } from "electron";
import fs from "node:fs/promises";
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
ipcMain.handle(
  "start-download",
  async (_event, payload) => {
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
        preload: path.join(__dirname$1, "preload.mjs"),
        sandbox: true,
        contextIsolation: true
      }
    });
    newDownloaderWindow.on("ready-to-show", () => {
      newDownloaderWindow == null ? void 0 : newDownloaderWindow.show();
    });
    const sendDownloadData = () => {
      if (newDownloaderWindow && !newDownloaderWindow.isDestroyed()) {
        newDownloaderWindow.webContents.send("download-request", {
          url: payload.url,
          title: payload.title || null,
          cookies: payload.cookies || null
        });
        newDownloaderWindow.show();
        newDownloaderWindow.focus();
      }
    };
    if (VITE_DEV_SERVER_URL) {
      newDownloaderWindow.loadURL(downloaderUrl);
    } else {
      newDownloaderWindow.loadFile(path.join(RENDERER_DIST, "downloader.html"));
    }
    newDownloaderWindow.webContents.once("did-finish-load", sendDownloadData);
    return true;
  }
);
ipcMain.handle(
  "download-file",
  async (event, payload) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
      return { success: false, error: "Window not found" };
    }
    try {
      const windowSession = window.webContents.session;
      const normalizedPath = payload.filePath.replace(/\//g, path.sep);
      let absoluteFilePath = normalizedPath;
      if (!path.isAbsolute(absoluteFilePath)) {
        const homeDir = process.env.USERPROFILE || os.homedir();
        absoluteFilePath = path.join(homeDir, normalizedPath);
      }
      absoluteFilePath = path.normalize(absoluteFilePath);
      const dir = path.dirname(absoluteFilePath);
      await fs.mkdir(dir, { recursive: true });
      if (payload.cookies && (payload.cookies.msToken || payload.cookies.ttChainToken)) {
        const urlObj = new URL(payload.url);
        const domain = urlObj.hostname;
        if (payload.cookies.msToken) {
          await windowSession.cookies.set({
            url: payload.url,
            name: "msToken",
            value: payload.cookies.msToken,
            domain
          });
        }
        if (payload.cookies.ttChainToken) {
          await windowSession.cookies.set({
            url: payload.url,
            name: "tt-chain-token",
            value: payload.cookies.ttChainToken,
            domain
          });
        }
        const interceptorHandler = (details, callback) => {
          var _a, _b;
          const headers = { ...details.requestHeaders };
          const cookieParts = [];
          if ((_a = payload.cookies) == null ? void 0 : _a.msToken) {
            cookieParts.push(`msToken=${payload.cookies.msToken}`);
          }
          if ((_b = payload.cookies) == null ? void 0 : _b.ttChainToken) {
            cookieParts.push(`tt-chain-token=${payload.cookies.ttChainToken}`);
          }
          if (cookieParts.length > 0) {
            headers["Cookie"] = cookieParts.join("; ");
          }
          callback({ requestHeaders: headers });
        };
        windowSession.webRequest.onBeforeSendHeaders(
          {
            urls: [payload.url]
          },
          interceptorHandler
        );
      }
      return new Promise((resolve) => {
        let downloadResolved = false;
        const willDownloadHandler = (_event, item) => {
          const itemUrl = item.getURL();
          const baseUrl = payload.url.split("?")[0];
          const itemBaseUrl = itemUrl.split("?")[0];
          if (itemUrl === payload.url || itemBaseUrl === baseUrl) {
            activeDownloads.set(window.id, item);
            item.setSavePath(absoluteFilePath);
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
                  window.webContents.send("download-complete", {
                    filePath: absoluteFilePath
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
        windowSession.on("will-download", willDownloadHandler);
        window.webContents.downloadURL(payload.url);
        setTimeout(() => {
          if (!downloadResolved) {
            downloadResolved = true;
            windowSession.removeListener("will-download", willDownloadHandler);
            const error = "Download timeout - no download started";
            window.webContents.send("download-error", { error });
            resolve({ success: false, error });
          }
        }, 3e4);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
    return { success: false, error: "No active download found" };
  }
  if (downloadItem.canResume()) {
    downloadItem.pause();
    return { success: true };
  }
  return { success: false, error: "Download cannot be paused" };
});
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
app.whenReady().then(async () => {
  await ensureSettingsFile();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
