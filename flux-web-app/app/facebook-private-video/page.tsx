"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface VideoQuality {
  url: string
  width: number
  height: number
  format: string
  quality: string
}

interface VideoInfo {
  title: string
  thumbnail: string
  duration: number | null
  qualities: Record<string, VideoQuality>
}

export default function FacebookPrivateVideoPage() {
  const [pageSource, setPageSource] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!pageSource.trim()) return
    
    setIsAnalyzing(true)
    setVideoInfo(null)
    try {
      const response = await fetch('/api/crawl/facebook-private-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: pageSource }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze the page source')
      }

      if (data.success && data.data) {
        setVideoInfo({
          title: data.data.title,
          thumbnail: data.data.thumbnail,
          duration: data.data.duration,
          qualities: data.data.qualities || {}
        })
        toast.success('Video information extracted successfully!')
      } else {
        throw new Error('No video data found in the response')
      }
      
    } catch (error) {
      console.error('Error analyzing page source:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze the page source')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(text)
    toast.success('URL copied to clipboard')
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-8">
            Facebook Private Video Downloader
          </h1>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Paste HTML Source Code
            </h2>
            <div className="space-y-4">
              <div className="relative h-[400px] overflow-hidden">
                <Textarea
                  value={pageSource}
                  onChange={(e) => setPageSource(e.target.value)}
                  placeholder="Paste the page source HTML here..."
                  className="h-full font-mono text-sm resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={!pageSource.trim() || isAnalyzing}
                  className="w-full sm:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : 'Analyze Source'}
                </Button>
              </div>
            </div>
            {isAnalyzing && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-blue-700 dark:text-blue-300">Analyzing the page source for video information...</p>
              </div>
            )}

            {videoInfo && (
              <div className="mt-8 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">{videoInfo.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {videoInfo.thumbnail && (
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                          <img 
                            src={videoInfo.thumbnail} 
                            alt="Video thumbnail" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Available Qualities</h3>
                        {!videoInfo.qualities || Object.keys(videoInfo.qualities).length === 0 ? (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                            <p className="text-yellow-700 dark:text-yellow-300">No video qualities found in the provided source.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(videoInfo.qualities).map(([quality, res]) => (
                            <div 
                              key={quality} 
                              className="border rounded-lg p-4 flex flex-col space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {quality.toUpperCase()}
                                  {res.width > 0 && res.height > 0 && (
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({res.width}×{res.height})
                                    </span>
                                  )}
                                </span>
                                <div className="flex space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => copyToClipboard(res.url)}
                                    className="h-8 w-8 p-0"
                                    title="Copy URL"
                                  >
                                    {copiedUrl === res.url ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Copy URL</span>
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-8"
                                    asChild
                                  >
                                    <a 
                                      href={res.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      download
                                      className="flex items-center gap-1"
                                    >
                                      <Download className="h-4 w-4" />
                                      Download
                                    </a>
                                  </Button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" title={res.url}>
                                {new URL(res.url).pathname.split('/').pop()?.substring(0, 30)}...
                              </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

