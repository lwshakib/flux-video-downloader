import { ipcMain as w, dialog as re, BrowserWindow as b, shell as ie, app as A } from "electron";
import c from "node:fs/promises";
import ae from "node:http";
import W from "node:os";
import t from "node:path";
import { fileURLToPath as le } from "node:url";
const z = t.dirname(le(import.meta.url));
process.env.APP_ROOT = t.join(z, "..");
const D = process.env.VITE_DEV_SERVER_URL, ye = t.join(process.env.APP_ROOT, "dist-electron"), I = t.join(process.env.APP_ROOT, "dist"), ce = () => {
  const n = process.platform, e = process.env.APP_ROOT;
  switch (n) {
    case "win32":
      return t.join(e, "public", "icons", "win", "icon.ico");
    case "darwin":
      return t.join(e, "public", "icons", "mac", "icon.icns");
    case "linux":
    default:
      return t.join(e, "public", "icons", "png", "256x256.png");
  }
}, X = ce(), V = () => {
  const n = process.env.USERPROFILE || W.homedir(), e = t.join(n, ".flux"), o = t.join(e, "settings.json");
  return { settingsDir: e, settingsFile: o };
}, de = async () => {
  const { settingsDir: n, settingsFile: e } = V(), o = { downloadLocation: "Downloads" };
  try {
    await c.mkdir(n, { recursive: !0 }), await c.access(e);
  } catch {
    await c.writeFile(
      e,
      JSON.stringify(o, null, 2),
      "utf-8"
    );
  }
};
process.env.VITE_PUBLIC = D ? t.join(process.env.APP_ROOT, "public") : I;
const ue = D ? `${D}/downloader.html` : t.join(I, "downloader.html");
let h;
const x = /* @__PURE__ */ new Map();
let k = null, H = null;
const M = 8765;
function G() {
  h = new b({
    width: 1200,
    height: 670,
    show: !1,
    autoHideMenuBar: !0,
    center: !0,
    title: "Flux",
    frame: !1,
    icon: X,
    webPreferences: {
      preload: t.join(z, "preload.mjs"),
      sandbox: !0,
      contextIsolation: !0
    }
  }), D && h.webContents.openDevTools(), h.on("ready-to-show", () => {
    h == null || h.show();
  }), h.webContents.on("did-finish-load", () => {
    h == null || h.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), D ? h.loadURL(D) : h.loadFile(t.join(I, "index.html"));
}
w.handle("select-download-location", async () => {
  const { canceled: n, filePaths: e } = await re.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Select download folder"
  });
  return n || e.length === 0 ? null : e[0];
});
w.handle("load-settings", async () => {
  try {
    const { settingsDir: n, settingsFile: e } = V();
    await c.mkdir(n, { recursive: !0 });
    const o = await c.readFile(e, "utf-8");
    return JSON.parse(o);
  } catch (n) {
    const e = n;
    return (e == null ? void 0 : e.code) === "ENOENT" || console.error("Failed to load settings", n), null;
  }
});
w.handle("save-settings", async (n, e) => {
  try {
    const { settingsDir: o, settingsFile: r } = V();
    await c.mkdir(o, { recursive: !0 });
    const s = JSON.stringify(e ?? {}, null, 2);
    return await c.writeFile(r, s, "utf-8"), !0;
  } catch (o) {
    return console.error("Failed to save settings", o), !1;
  }
});
w.on("theme-change", (n, e) => {
  b.getAllWindows().forEach((o) => {
    o && !o.isDestroyed() && o.webContents.send("theme-changed", e);
  });
});
w.handle("window-minimize", (n) => {
  const e = b.fromWebContents(n.sender);
  return e && !e.isDestroyed() && e.minimize(), !0;
});
w.handle("window-maximize", (n) => {
  const e = b.fromWebContents(n.sender);
  return e && !e.isDestroyed() && (e.isMaximized() ? e.unmaximize() : e.maximize()), !0;
});
w.handle("window-close", (n) => {
  const e = b.fromWebContents(n.sender);
  return e && !e.isDestroyed() && e.close(), !0;
});
w.handle("get-pending-download", () => {
  const n = H;
  return n && (H = null), n;
});
function Q(n) {
  if (k && !k.isDestroyed()) {
    console.log("Reusing existing downloader window"), k.webContents.send("download-request", {
      url: n.url,
      title: n.title || null,
      cookies: n.cookies || null
    }), k.show(), k.focus();
    return;
  }
  console.log("Creating new downloader window");
  const e = new b({
    width: 600,
    height: 300,
    minWidth: 400,
    minHeight: 250,
    resizable: !0,
    show: !1,
    autoHideMenuBar: !0,
    center: !0,
    title: "Flux Downloader",
    frame: !1,
    icon: X,
    webPreferences: {
      preload: t.join(z, "preload.mjs"),
      sandbox: !0,
      contextIsolation: !0
    }
  });
  k = e, e.on("closed", () => {
    k === e && (k = null);
  }), e.on("ready-to-show", () => {
    e == null || e.show(), e == null || e.focus();
  }), D && e.webContents.openDevTools();
  const o = {
    url: n.url,
    title: n.title || null,
    cookies: n.cookies || null
  };
  H = o;
  const r = () => {
    e && !e.isDestroyed() ? setTimeout(() => {
      e && !e.isDestroyed() ? (console.log("========================================"), console.log("📤 Sending download-request event to renderer"), console.log("🔗 URL:", o.url), console.log("📝 Title:", o.title), console.log("========================================"), e.webContents.send(
        "download-request",
        o
      ), e.show(), e.focus(), console.log("✅ Downloader window opened and data sent")) : console.error("❌ Cannot send data - window is destroyed");
    }, 1e3) : console.error("❌ Cannot send data - window is destroyed");
  };
  D ? e.loadURL(ue) : e.loadFile(t.join(I, "downloader.html")), e.webContents.once("did-finish-load", r), setTimeout(() => {
    if (e && !e.isDestroyed() && !e.isVisible()) {
      console.log("Fallback: Showing downloader window after timeout"), e.show(), e.focus();
      try {
        e.webContents.send(
          "download-request",
          o
        );
      } catch (s) {
        console.error("Failed to send download data in fallback:", s);
      }
    }
  }, 3e3);
}
w.handle(
  "start-download",
  async (n, e) => (Q(e), !0)
);
const Z = 5, ee = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
  Referer: "https://www.tiktok.com/"
};
function we(n, e) {
  const o = [];
  return n && o.push(`msToken=${n}`), e && o.push(`tt_chain_token=${e}`), o.join("; ");
}
async function oe(n, e = 1) {
  var a;
  if (e > Z)
    throw new Error("Too many redirects while downloading the video.");
  const o = new URL(n), r = new Headers({
    ...ee,
    Host: o.hostname
  }), s = await fetch(n, {
    headers: r,
    redirect: "manual"
  });
  if (s.status >= 300 && s.status < 400 && s.headers.get("location")) {
    const d = new URL(s.headers.get("location"), n);
    return console.log(`Redirect ${e}: ${n} -> ${d.toString()}`), (a = s.body) == null || a.cancel(), oe(d.toString(), e + 1);
  }
  if (!s.ok) {
    const d = await s.text().catch(() => "");
    throw new Error(
      `Download failed with status ${s.status}. ${d}`
    );
  }
  return s;
}
async function ne(n, e, o = 1) {
  var d;
  if (o > Z)
    throw new Error("Too many redirects while downloading the video.");
  const r = new URL(n), s = new Headers({
    ...ee,
    Host: r.hostname
  });
  if (!e)
    throw new Error(
      "TikTok cookie header could not be constructed from TikTok response."
    );
  s.set("Cookie", e);
  const a = await fetch(n, {
    headers: s,
    redirect: "manual"
  });
  if (a.status >= 300 && a.status < 400 && a.headers.get("location")) {
    const l = new URL(a.headers.get("location"), n);
    return console.log(`TikTok redirect ${o}: ${n} -> ${l.toString()}`), (d = a.body) == null || d.cancel(), ne(l.toString(), e, o + 1);
  }
  if (!a.ok) {
    const l = await a.text().catch(() => "");
    throw new Error(
      `Download failed with status ${a.status}. ${l}`
    );
  }
  return a;
}
w.handle(
  "download-file",
  async (n, e) => {
    var r, s;
    const o = b.fromWebContents(n.sender);
    if (!o || o.isDestroyed())
      return console.error("Download error: Window not found"), { success: !1, error: "Window not found" };
    try {
      console.log("Download started:", {
        url: e.url.substring(0, 100) + "...",
        hasCookies: !!((r = e.cookies) != null && r.msToken || (s = e.cookies) != null && s.ttChainToken)
      });
      const a = o.webContents.session, d = e.filePath.replace(/\//g, t.sep);
      let l = d;
      if (!t.isAbsolute(l)) {
        const R = process.env.USERPROFILE || W.homedir();
        l = t.join(R, d);
      }
      l = t.normalize(l);
      const te = t.dirname(l);
      await c.mkdir(te, { recursive: !0 });
      const Y = t.join(W.tmpdir(), "flux-downloads");
      await c.mkdir(Y, { recursive: !0 });
      const J = t.basename(l), q = t.extname(J), se = t.basename(J, q), T = t.join(
        Y,
        `${se}-${Date.now()}${q}`
      ), L = new URL(e.url), $ = L.hostname.includes("youtube.com") || L.hostname.includes("youtu.be") || L.hostname.includes("googlevideo.com"), _ = e.cookies && (e.cookies.msToken || e.cookies.ttChainToken);
      if (($ || _) && (!_ || e.cookies)) {
        console.log(`Using fetch-based download for ${$ ? "YouTube" : "TikTok"} video`);
        let g = "";
        _ && e.cookies && (g = we(
          e.cookies.msToken,
          e.cookies.ttChainToken
        ), console.log("Cookie header built:", g ? "Yes" : "No"));
        try {
          let u;
          _ && g ? u = await ne(e.url, g) : u = await oe(e.url), console.log("Fetch response received:", {
            status: u.status,
            contentType: u.headers.get("content-type")
          });
          const m = u.headers.get("content-length"), p = m ? parseInt(m, 10) : 0, P = await c.open(T, "w"), U = u.body;
          if (!U)
            throw await P.close(), new Error("Response body is null");
          let F = 0, E = 0;
          const v = U.getReader();
          try {
            let y = !0;
            for (; y; ) {
              const { done: C, value: S } = await v.read();
              if (C) {
                y = !1;
                break;
              }
              if (S) {
                const j = Buffer.from(S);
                if (await P.write(j, 0, j.length, E), E += j.length, F += j.length, p > 0) {
                  const K = Math.round(
                    F / p * 100
                  );
                  o.webContents.send("download-progress", {
                    percent: isNaN(K) ? 0 : K,
                    received: F,
                    total: p
                  });
                }
              }
            }
          } finally {
            await P.close();
          }
          console.log("Download completed, copying to final location");
          let i = l, f = 1, O = !0;
          for (; O; )
            try {
              await c.access(i);
              const y = t.dirname(l), C = t.extname(l), S = t.basename(l, C);
              i = t.join(y, `${S} (${f})${C}`), f++;
            } catch {
              O = !1;
            }
          await c.copyFile(T, i), console.log("File copied to:", i);
          try {
            await c.unlink(T);
          } catch (y) {
            console.warn("Failed to cleanup temp file:", y);
          }
          return o.webContents.send("download-complete", {
            filePath: i
          }), { success: !0, filePath: i };
        } catch (u) {
          const m = u instanceof Error ? u.message : `Failed to download ${$ ? "YouTube" : "TikTok"} video`;
          console.error(
            `${$ ? "YouTube" : "TikTok"} download error:`,
            m,
            u
          ), o.webContents.send("download-error", { error: m });
          try {
            await c.unlink(T);
          } catch {
          }
          return { success: !1, error: m };
        }
      }
      return new Promise((R) => {
        let g = !1;
        const u = (m, p) => {
          const P = p.getURL(), U = e.url.split("?")[0], F = P.split("?")[0];
          (P === e.url || F === U) && (x.set(o.id, p), p.setSavePath(T), p.on("updated", () => {
            const E = p.getTotalBytes(), v = p.getReceivedBytes();
            if (E > 0) {
              const i = v / E, f = Math.round(i * 100);
              o.webContents.send("download-progress", {
                percent: isNaN(f) ? 0 : f,
                received: v,
                total: E
              });
            }
          }), p.once("done", (E, v) => {
            if (x.delete(o.id), a.removeListener(
              "will-download",
              u
            ), v === "completed")
              g || (g = !0, console.log("Download completed, copying to final location"), (async () => {
                try {
                  let i = l, f = 1, O = !0;
                  for (; O; )
                    try {
                      await c.access(i);
                      const y = t.dirname(l), C = t.extname(l), S = t.basename(l, C);
                      i = t.join(
                        y,
                        `${S} (${f})${C}`
                      ), f++;
                    } catch {
                      O = !1;
                    }
                  await c.copyFile(T, i), console.log("File copied to:", i);
                  try {
                    await c.unlink(T);
                  } catch (y) {
                    console.warn(
                      "Failed to cleanup temp file:",
                      y
                    );
                  }
                  o.webContents.send("download-complete", {
                    filePath: i
                  });
                } catch (i) {
                  const f = i instanceof Error ? i.message : "Failed to copy file to final location";
                  console.error("Copy error:", f, i), o.webContents.send("download-error", {
                    error: f
                  });
                }
              })(), R({ success: !0, filePath: l }));
            else if (!g) {
              g = !0;
              const i = `Download failed: ${v}`;
              console.error("Download failed:", i), (async () => {
                try {
                  await c.unlink(T);
                } catch (f) {
                  console.warn(
                    "Failed to cleanup temp file on error:",
                    f
                  );
                }
              })(), o.webContents.send("download-error", { error: i }), R({ success: !1, error: i });
            }
          }));
        };
        a.on("will-download", u), o.webContents.downloadURL(e.url), setTimeout(() => {
          if (!g) {
            g = !0, a.removeListener("will-download", u), (async () => {
              try {
                await c.unlink(T);
              } catch {
              }
            })();
            const m = "Download timeout - no download started";
            console.error("Download timeout:", m), o.webContents.send("download-error", { error: m }), R({ success: !1, error: m });
          }
        }, 3e4);
      });
    } catch (a) {
      const d = a instanceof Error ? a.message : "Unknown error";
      return console.error("Download error:", d, a), o.webContents.send("download-error", { error: d }), { success: !1, error: d };
    }
  }
);
w.handle("pause-download", (n) => {
  const e = b.fromWebContents(n.sender);
  if (!e || e.isDestroyed())
    return { success: !1, error: "Window not found" };
  const o = x.get(e.id);
  if (!o)
    return {
      success: !1,
      error: "No active download found. Pause is not supported for fetch-based downloads (YouTube/TikTok)."
    };
  if (o.isPaused())
    return { success: !1, error: "Download is already paused" };
  const r = o.getState();
  if (r === "completed" || r === "cancelled" || r === "interrupted")
    return {
      success: !1,
      error: "Download cannot be paused in current state"
    };
  try {
    return o.pause(), { success: !0 };
  } catch (s) {
    return { success: !1, error: s instanceof Error ? s.message : "Failed to pause download" };
  }
});
w.handle("resume-download", (n) => {
  const e = b.fromWebContents(n.sender);
  if (!e || e.isDestroyed())
    return { success: !1, error: "Window not found" };
  const o = x.get(e.id);
  if (!o)
    return {
      success: !1,
      error: "No active download found. Resume is not supported for fetch-based downloads (YouTube/TikTok)."
    };
  if (!o.canResume())
    return {
      success: !1,
      error: "Download cannot be resumed. It may not be paused."
    };
  try {
    return o.resume(), { success: !0 };
  } catch (r) {
    return { success: !1, error: r instanceof Error ? r.message : "Failed to resume download" };
  }
});
w.handle("cancel-download", (n) => {
  const e = b.fromWebContents(n.sender);
  if (!e || e.isDestroyed())
    return { success: !1, error: "Window not found" };
  const o = x.get(e.id);
  if (!o)
    return { success: !1, error: "No active download found" };
  try {
    return o.cancel(), x.delete(e.id), e.webContents.send("download-cancelled"), { success: !0 };
  } catch (r) {
    return { success: !1, error: r instanceof Error ? r.message : "Failed to cancel download" };
  }
});
w.handle("open-folder", async (n, e) => {
  try {
    const o = t.dirname(e);
    return await ie.openPath(o), { success: !0 };
  } catch (o) {
    return { success: !1, error: o instanceof Error ? o.message : "Failed to open folder" };
  }
});
A.on("window-all-closed", () => {
  process.platform !== "darwin" && (A.quit(), h = null);
});
A.on("activate", () => {
  b.getAllWindows().length === 0 && G();
});
let N = null;
function B() {
  if (N && N.listening)
    return console.log("Extension server already running"), N;
  const n = ae.createServer((e, o) => {
    if (o.setHeader("Access-Control-Allow-Origin", "*"), o.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"), o.setHeader("Access-Control-Allow-Headers", "Content-Type"), e.method === "OPTIONS") {
      o.writeHead(200), o.end();
      return;
    }
    if (e.method === "POST" && e.url === "/download") {
      let r = "";
      e.on("data", (s) => {
        r += s.toString();
      }), e.on("end", () => {
        try {
          const s = JSON.parse(r);
          console.log("Received download request from extension:", s.url), Q(s), o.writeHead(200, { "Content-Type": "application/json" }), o.end(JSON.stringify({ success: !0 }));
        } catch (s) {
          console.error("Error processing extension request:", s), o.writeHead(400, { "Content-Type": "application/json" }), o.end(JSON.stringify({ success: !1, error: "Invalid request" }));
        }
      });
    } else
      o.writeHead(404), o.end("Not found");
  });
  return n.listen(M, "127.0.0.1", () => {
    console.log(
      `Extension server listening on http://127.0.0.1:${M}`
    );
  }), n.on("error", (e) => {
    e.code === "EADDRINUSE" ? (console.log(
      `Port ${M} is already in use. Trying to reuse existing server.`
    ), setTimeout(() => {
      B();
    }, 1e3)) : (console.error("Extension server error:", e), setTimeout(() => {
      B();
    }, 2e3));
  }), N = n, n;
}
A.whenReady().then(async () => {
  await de(), G(), B(), console.log("Flux desktop app ready. Extension server should be running.");
});
export {
  ye as MAIN_DIST,
  I as RENDERER_DIST,
  D as VITE_DEV_SERVER_URL
};
