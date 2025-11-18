import { app, BrowserWindow, dialog, ipcMain } from "electron";
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

    // Open DevTools for downloader window
    newDownloaderWindow.webContents.openDevTools();

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
