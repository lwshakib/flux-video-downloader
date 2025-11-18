import { useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { contentMap, crawlerPages } from "@/constants/content";
import { CrawlerPage, HomePage, SettingsPage } from "@/pages";

type AppSettings = {
  downloadLocation: string;
};

const defaultSettings: AppSettings = {
  downloadLocation: "Downloads",
};

function App() {
  const [activeProject, setActiveProject] = useState("home");
  const [searchValue, setSearchValue] = useState("");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const content = useMemo(
    () => contentMap[activeProject] ?? contentMap.home,
    [activeProject]
  );
  const isHome = activeProject === "home";
  const hasCrawler = crawlerPages.includes(activeProject);
  const isSettings = activeProject === "settings";

  const handleCrawl = async (url: string) => {
    if (activeProject === "youtube") {
      const apiUrl = import.meta.env.VITE_WEB_API_URL;
      if (!apiUrl) {
        console.error("VITE_WEB_API_URL is not defined");
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/crawl/youtube`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Crawl response:", data);
        // TODO: Handle the response (e.g., show success message, open downloader window)
      } catch (error) {
        console.error("Failed to crawl YouTube video:", error);
        throw error;
      }
    } else {
      // TODO: Implement other platforms
      console.log(`Crawling ${activeProject}:`, url);
    }
  };

  useEffect(() => {
    setSearchValue("");
  }, [activeProject]);
  useEffect(() => {
    if (!window?.ipcRenderer) {
      setSettingsLoaded(true);
      return;
    }

    let isCancelled = false;

    window.ipcRenderer
      .invoke("load-settings")
      .then((loaded) => {
        if (
          !isCancelled &&
          loaded &&
          typeof loaded.downloadLocation === "string"
        ) {
          setSettings({
            downloadLocation: loaded.downloadLocation,
          });
        }
      })
      .catch((error) => {
        console.error("Failed to load settings", error);
      })
      .finally(() => {
        if (!isCancelled) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!window?.ipcRenderer || !settingsLoaded) return;

    window.ipcRenderer
      .invoke("save-settings", settings)
      .catch((error) => console.error("Failed to save settings", error));
  }, [settings, settingsLoaded]);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

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
              <CrawlerPage
                searchValue={searchValue}
                onSearchValueChange={setSearchValue}
                onCrawl={handleCrawl}
              />
            )}
            {isHome && <HomePage />}
            {isSettings && (
              <SettingsPage
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
