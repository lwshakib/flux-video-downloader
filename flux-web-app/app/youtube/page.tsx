"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function YoutubePage() {
  const [url, setUrl] = useState("")

  const handleCrawl = () => {
    // TODO: Implement crawl functionality
    console.log("Crawling YouTube URL:", url)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-8">
            YouTube Video Downloader
          </h1>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Enter YouTube URL..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10 h-12 text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCrawl()
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleCrawl}
                size="lg"
                className="h-12 px-8"
                disabled={!url.trim()}
              >
                Crawl
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

