import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const contentMap: Record<string, string> = {
  home: "Welcome to Flux Video Downloader. Choose a platform to get started.",
  youtube: "Download videos from YouTube with a single click.",
  facebook: "Fetch public Facebook videos quickly.",
  "facebook-private-video":
    "Provide the private URL and we will fetch the video for you.",
  tiktok: "Save TikTok videos by pasting their link here.",
  settings: "Manage preferences, usage limits, and integrations.",
};

function App() {
  const [activeProject, setActiveProject] = useState("home");
  const [searchValue, setSearchValue] = useState("");
  const [downloadLocation, setDownloadLocation] = useState("Downloads");
  const [isChoosingLocation, setIsChoosingLocation] = useState(false);
  const content = useMemo(
    () => contentMap[activeProject] ?? contentMap.home,
    [activeProject]
  );
  const isHome = activeProject === "home";
  const hasCrawler = [
    "youtube",
    "facebook",
    "facebook-private-video",
    "tiktok",
  ].includes(activeProject);
  const isSettings = activeProject === "settings";

  const handleBrowseLocation = async () => {
    if (!window?.ipcRenderer) return;
    try {
      setIsChoosingLocation(true);
      const selectedPath: string | null = await window.ipcRenderer.invoke(
        "select-download-location"
      );
      if (selectedPath) {
        setDownloadLocation(selectedPath);
      }
    } catch (error) {
      console.error("Failed to select download location", error);
    } finally {
      setIsChoosingLocation(false);
    }
  };

  useEffect(() => {
    setSearchValue("");
  }, [activeProject]);
  const homeFeatures = [
    {
      title: "Multi-platform support",
      description: "Download content from YouTube, Facebook, TikTok and more.",
    },
    {
      title: "Private video handling",
      description: "Secure helpers guide you through fetching private videos.",
    },
    {
      title: "Lightning fast conversions",
      description: "Optimized pipeline delivers MP4s without waiting around.",
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar
        activeProject={activeProject}
        onSelectProject={setActiveProject}
      />
      <SidebarInset>
        <header className="drag-css flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 no-drag-css" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <div className="no-drag-css">
              <ModeToggle />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            <button
              aria-label="Minimize window"
              className="no-drag-css flex size-8 cursor-pointer items-center justify-center rounded bg-background text-sm font-semibold text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            >
              —
            </button>
            <button
              aria-label="Maximize window"
              className="no-drag-css flex size-8 cursor-pointer items-center justify-center rounded bg-background text-sm font-semibold text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            >
              ☐
            </button>
            <button
              aria-label="Close window"
              className="no-drag-css flex size-9 cursor-pointer items-center justify-center rounded bg-background text-xl font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-destructive"
            >
              ×
            </button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="bg-muted/50 min-h-screen flex-1 rounded-xl p-6 md:min-h-min">
            <h2 className="text-2xl font-semibold capitalize">
              {activeProject.replace(/-/g, " ")}
            </h2>
            <p className="mt-2 text-muted-foreground">{content}</p>
            {hasCrawler && (
              <form className="mt-6 flex flex-col gap-3 md:flex-row">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Paste the video URL here"
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  className="h-11"
                  disabled={!searchValue.trim()}
                >
                  Crawl
                </Button>
              </form>
            )}
            {isHome && (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {homeFeatures.map((feature) => (
                    <div
                      key={feature.title}
                      className="rounded-lg border border-border bg-background p-4 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                  Tip: Pick a platform from the sidebar to see its dedicated
                  workflow.
                </div>
              </>
            )}
            {isSettings && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-4">
                  <h3 className="text-lg font-semibold">Theme preference</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Toggle light or dark mode using the button in the header.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <h3 className="text-lg font-semibold">Usage limits</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Configure daily crawl quotas and API keys (coming soon).
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4 md:col-span-2">
                  <h3 className="text-lg font-semibold">
                    Default save location
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose where downloaded files should be saved.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 md:flex-row">
                    <Input
                      value={downloadLocation}
                      disabled
                      onChange={(event) =>
                        setDownloadLocation(event.target.value)
                      }
                      placeholder="Downloads folder"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBrowseLocation}
                      disabled={isChoosingLocation}
                    >
                      Browse
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
