import axios from "axios";
import { NextResponse } from "next/server";

// Try to load Puppeteer for browser-rendered pages
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puppeteer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  puppeteer = require("puppeteer");
} catch {
  // Puppeteer not available, will fall back to axios
}

interface StreamData {
  url: string;
  bitrate: number;
  height: number;
  streamType: string;
  width: number;
}

interface Resolution {
  url: string;
  width: number;
  height: number;
  quality: string;
  format: string;
}

interface VideoData {
  title: string;
  thumbnail: string;
  resolutions: Resolution[];
}

/**
 * Fetch page source (view source) from URL using Puppeteer or axios
 */
async function fetchPageSource(url: string): Promise<string> {
  // Try Puppeteer first for JavaScript-rendered pages (like Facebook)
  if (puppeteer) {
    console.log("Using Puppeteer to fetch fully rendered page source...");
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Navigate to the page and wait for network to be idle
      console.log("Loading page and waiting for content to render...");
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      // Wait a bit more for any lazy-loaded content
      await page.waitForTimeout(3000);

      // Get the page source (view source)
      const content = await page.content();

      await browser.close();
      return content;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(`Puppeteer failed: ${errorMessage}`);
      console.log("Falling back to axios...");
      // Fall through to axios
    }
  }

  // Fallback to axios for non-JS pages or if Puppeteer fails
  console.log("Using axios to fetch page source...");
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
    },
    timeout: 30000,
    maxRedirects: 5,
  });

  return response.data;
}

/**
 * Extract MP4 links from text content using regex patterns
 */
function extractMp4FromText(text: string): string[] {
  if (!text) return [];

  const links = new Set<string>();

  // Pattern 1: Direct MP4 URLs (http/https)
  const pattern1 = /https?:\/\/[^\s"'<>{}]+\.mp4(?:\?[^\s"'<>{}]*)?/gi;
  let matches = text.match(pattern1);
  if (matches) {
    matches.forEach((match) => {
      const cleaned = match.replace(/[.,;:!?)]+$/, "");
      links.add(cleaned);
    });
  }

  // Pattern 2: MP4 URLs in JSON (may be escaped)
  if (text.toLowerCase().includes("mp4")) {
    const jsonPattern = /https?:\\?\/\\?\/[^"'<>{}]+\.mp4[^"'<>{}]*/gi;
    matches = text.match(jsonPattern);
    if (matches) {
      matches.forEach((match) => {
        const cleaned = match.replace(/\\\//g, "/").replace(/\\"/g, '"');
        const trimmed = cleaned.replace(/[.,;:!?)]+$/, "");
        if (trimmed.startsWith("http")) {
          links.add(trimmed);
        }
      });
    }
  }

  return Array.from(links);
}

/**
 * Parse a single Representation block and extract stream info
 */
function parseRepresentationBlock(repBlock: string): StreamData[] {
  const streams: StreamData[] = [];

  // Get the full Representation tag
  let fullMatch = repBlock.match(
    /<Representation[^>]*>[\s\S]*?<\/Representation>/i
  );
  if (!fullMatch) {
    fullMatch = repBlock.match(
      /Representation[^>]*>[\s\S]*?<\/Representation/i
    );
  }

  if (fullMatch) {
    repBlock = fullMatch[0];
  }

  // Extract attributes from Representation tag
  const repTagMatch = repBlock.match(/Representation\s+([^>]*)>/i);
  if (!repTagMatch) {
    return streams;
  }

  const attrsStr = repTagMatch[1];

  // Extract quality info
  let width = 0;
  let height = 0;
  let bitrate = 0;
  let encodingTag: string | null = null;
  let mimeType: string | null = null;

  // Extract width
  const widthMatch = attrsStr.match(/width\s*=\s*["']?(\d+)["']?/i);
  if (widthMatch) {
    width = parseInt(widthMatch[1], 10);
  }

  // Extract height
  const heightMatch = attrsStr.match(/height\s*=\s*["']?(\d+)["']?/i);
  if (heightMatch) {
    height = parseInt(heightMatch[1], 10);
  }

  // Extract bandwidth
  const bandwidthMatch = attrsStr.match(/bandwidth\s*=\s*["']?(\d+)["']?/i);
  if (bandwidthMatch) {
    bitrate = parseInt(bandwidthMatch[1], 10);
  }

  // Extract FBEncodingTag
  const encodingMatch = attrsStr.match(/FBEncodingTag\s*=\s*["']([^"']+)["']/i);
  if (encodingMatch) {
    encodingTag = encodingMatch[1];
  }

  // Extract mimeType
  const mimeMatch = attrsStr.match(/mimeType\s*=\s*["']([^"']+)["']/i);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  // Determine stream type
  let streamType = "combined";
  if (encodingTag) {
    const encodingLower = encodingTag.toLowerCase();
    if (encodingLower.includes("video") && !encodingLower.includes("audio")) {
      streamType = "video";
    } else if (
      encodingLower.includes("audio") &&
      !encodingLower.includes("video")
    ) {
      streamType = "audio";
    }
  } else if (mimeType) {
    const mimeLower = mimeType.toLowerCase();
    if (mimeLower.includes("video") && !mimeLower.includes("audio")) {
      streamType = "video";
    } else if (mimeLower.includes("audio")) {
      streamType = "audio";
    }
  }

  // Extract BaseURL
  const baseurlPatterns = [
    /<BaseURL>([\s\S]*?)<\/BaseURL>/i,
    /BaseURL>([\s\S]*?)<\/BaseURL/i,
    /BaseURL\s*>([\s\S]*?)\s*<\/BaseURL/i,
  ];

  let url: string | null = null;
  for (const pattern of baseurlPatterns) {
    const baseurlMatch = repBlock.match(pattern);
    if (baseurlMatch) {
      url = baseurlMatch[1].trim();
      break;
    }
  }

  if (url) {
    // Clean URL
    url = url
      .replace(/&amp;/g, "&")
      .replace(/\\u00253D/g, "=")
      .replace(/\\\//g, "/");

    try {
      url = decodeURIComponent(url);
    } catch {
      // URL decode failed, use as is
    }

    url = url.replace(/[.,;:!?)]+$/, "");

    // Remove trailing tags
    if (url.includes("</")) {
      url = url.split("</")[0];
    }
    if (url.includes("\\u003C")) {
      url = url.split("\\u003C")[0];
    }
    if (url.includes("<") && !url.startsWith("<")) {
      url = url.split("<")[0];
    }

    // Only add if it's a valid URL
    if (
      url.startsWith("http") &&
      (url.includes(".mp4") ||
        (mimeType &&
          (mimeType.toLowerCase().includes("video") ||
            mimeType.toLowerCase().includes("audio"))))
    ) {
      streams.push({ url, bitrate, height, streamType, width });
    }
  }

  return streams;
}

/**
 * Parse DASH XML manifest and extract streams
 */
function parseDashXml(manifestXml: string): StreamData[] {
  const streams: StreamData[] = [];
  const representationPattern =
    /<Representation[^>]*>([\s\S]*?)<\/Representation>/gi;
  let match;

  while ((match = representationPattern.exec(manifestXml)) !== null) {
    streams.push(...parseRepresentationBlock(match[1]));
  }

  return streams;
}

/**
 * Extract video streams from DASH manifest data in HTML
 */
function extractDashManifestStreams(content: string): StreamData[] {
  const streams: StreamData[] = [];

  // Method 1: Extract from JSON (manifest_xml field)
  try {
    const jsonPattern =
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = jsonPattern.exec(content)) !== null) {
      try {
        const jsonStr = match[1];
        const data = JSON.parse(jsonStr);

        // Recursively search for manifest_xml and representations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function findStreamsInJson(obj: any): void {
          if (typeof obj === "object" && obj !== null) {
            if (Array.isArray(obj)) {
              obj.forEach((item) => findStreamsInJson(item));
            } else {
              // Check for manifest_xml
              if (obj.manifest_xml && typeof obj.manifest_xml === "string") {
                const manifestXml = obj.manifest_xml
                  .replace(/\\u003C/g, "<")
                  .replace(/\\u003E/g, ">")
                  .replace(/\\u00253D/g, "=")
                  .replace(/\\\//g, "/")
                  .replace(/\\n/g, "\n")
                  .replace(/\\"/g, '"')
                  .replace(/&amp;/g, "&");

                streams.push(...parseDashXml(manifestXml));
              }

              // Check for representations array
              if (obj.representations && Array.isArray(obj.representations)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                obj.representations.forEach((rep: any) => {
                  if (rep && typeof rep === "object") {
                    const url = rep.base_url || "";
                    const width = rep.width || 0;
                    const height = rep.height || 0;
                    const bandwidth = rep.bandwidth || 0;
                    const mimeType = rep.mime_type || "";

                    let streamType = "combined";
                    if (mimeType) {
                      const mimeLower = mimeType.toLowerCase();
                      if (
                        mimeLower.includes("video") &&
                        !mimeLower.includes("audio")
                      ) {
                        streamType = "video";
                      } else if (mimeLower.includes("audio")) {
                        streamType = "audio";
                      }
                    }

                    if (
                      url &&
                      url.startsWith("http") &&
                      (url.includes(".mp4") ||
                        mimeType.toLowerCase().includes("video") ||
                        mimeType.toLowerCase().includes("audio"))
                    ) {
                      streams.push({
                        url,
                        bitrate: bandwidth,
                        height,
                        streamType,
                        width,
                      });
                    }
                  }
                });
              }

              // Recursively search
              Object.values(obj).forEach((value) => findStreamsInJson(value));
            }
          }
        }

        findStreamsInJson(data);
      } catch {
        // JSON parse error, skip
      }
    }
  } catch {
    // Error extracting JSON, continue
  }

  // Method 2: Direct search in content (for escaped XML)
  const unescapedContent = content
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u00253D/g, "=")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");

  const representationPattern =
    /<Representation[^>]*>([\s\S]*?)<\/Representation>/gi;
  let match;
  while ((match = representationPattern.exec(unescapedContent)) !== null) {
    streams.push(...parseRepresentationBlock(match[1]));
  }

  return streams;
}

/**
 * Extract all MP4 video links from HTML content
 */
function extractMp4LinksFromContent(content: string): StreamData[] {
  const mp4Links = new Set<string>();
  const streamsWithMetadata: StreamData[] = [];

  // Method 1: Extract DASH manifest streams (with quality metadata)
  const dashStreams = extractDashManifestStreams(content);
  dashStreams.forEach(({ url, bitrate, height, streamType, width }) => {
    streamsWithMetadata.push({ url, bitrate, height, streamType, width });
    mp4Links.add(url);
  });

  // Method 2: Direct regex search for MP4 URLs
  const patterns = [
    /https?:\/\/[^\s"'<>{}]+\.mp4(?:\?[^\s"'<>{}]*)?/gi,
    /https?:\\?\/\\?\/[^"'<>{}]+\.mp4[^"'<>{}]*/gi,
  ];

  patterns.forEach((pattern) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        let cleaned = match.replace(/\\\//g, "/").replace(/\\"/g, '"');
        cleaned = cleaned
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\\u00253D/g, "=")
          .replace(/\\u003C/g, "<");

        try {
          cleaned = decodeURIComponent(cleaned);
        } catch {
          // URL decode failed
        }

        cleaned = cleaned.replace(/[.,;:!?)]+$/, "");
        if (cleaned.includes("</")) {
          cleaned = cleaned.split("</")[0];
        }

        if (
          (cleaned.endsWith(".mp4") || cleaned.includes(".mp4?")) &&
          !mp4Links.has(cleaned)
        ) {
          mp4Links.add(cleaned);
          streamsWithMetadata.push({
            url: cleaned,
            bitrate: 0,
            height: 0,
            streamType: "combined",
            width: 0,
          });
        }
      });
    }
  });

  // Method 3: Extract from text content
  const textLinks = extractMp4FromText(content);
  textLinks.forEach((link) => {
    if (!mp4Links.has(link)) {
      mp4Links.add(link);
      streamsWithMetadata.push({
        url: link,
        bitrate: 0,
        height: 0,
        streamType: "combined",
        width: 0,
      });
    }
  });

  // Method 4: Parse JSON data in script tags
  const jsonPattern =
    /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonPattern.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const jsonStr = JSON.stringify(data);
      const mp4InJson = jsonStr.match(
        /https?:\/\/[^\s"'<>{}]+\.mp4(?:\?[^\s"'<>{}]*)?/gi
      );
      if (mp4InJson) {
        mp4InJson.forEach((url) => {
          let cleaned = url.replace(/&amp;/g, "&").replace(/\\u00253D/g, "=");
          cleaned = cleaned.replace(/[.,;:!?)]+$/, "");
          if (cleaned.includes("</")) {
            cleaned = cleaned.split("</")[0];
          }
          if (!mp4Links.has(cleaned)) {
            mp4Links.add(cleaned);
            streamsWithMetadata.push({
              url: cleaned,
              bitrate: 0,
              height: 0,
              streamType: "combined",
              width: 0,
            });
          }
        });
      }
    } catch {
      // JSON parse error, try regex on raw text
      const mp4InText = match[1].match(
        /https?:\/\/[^\s"'<>{}]+\.mp4(?:\?[^\s"'<>{}]*)?/gi
      );
      if (mp4InText) {
        mp4InText.forEach((url) => {
          let cleaned = url.replace(/&amp;/g, "&").replace(/\\u00253D/g, "=");
          cleaned = cleaned.replace(/[.,;:!?)]+$/, "");
          if (cleaned.includes("</")) {
            cleaned = cleaned.split("</")[0];
          }
          if (!mp4Links.has(cleaned)) {
            mp4Links.add(cleaned);
            streamsWithMetadata.push({
              url: cleaned,
              bitrate: 0,
              height: 0,
              streamType: "combined",
              width: 0,
            });
          }
        });
      }
    }
  }

  return streamsWithMetadata;
}

/**
 * Extract video title from HTML content
 */
function extractVideoTitle(content: string): string {
  // Try og:title first
  const ogTitleMatch = content.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (ogTitleMatch) {
    return ogTitleMatch[1].trim();
  }

  // Try title tag
  const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1]
      .trim()
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Try JSON-LD
  const jsonLdPattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdPattern.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data.name || data.headline || data.title) {
        return (data.name || data.headline || data.title).trim();
      }
    } catch {
      // Continue
    }
  }

  return "";
}

/**
 * Extract thumbnail URL from HTML content
 */
function extractThumbnail(content: string): string {
  // Try og:image first
  const ogImageMatch = content.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
  );
  if (ogImageMatch) {
    return ogImageMatch[1].trim();
  }

  // Try twitter:image
  const twitterImageMatch = content.match(
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i
  );
  if (twitterImageMatch) {
    return twitterImageMatch[1].trim();
  }

  return "";
}

/**
 * Categorize videos by quality and format response
 */
function formatVideoData(
  streamsData: StreamData[],
  title: string,
  thumbnail: string
): VideoData {
  const resolutions: Resolution[] = [];

  // Filter only combined streams (video + audio together)
  const combinedStreams = streamsData.filter(
    (s) => s.streamType === "combined"
  );

  // Group by quality based on height
  combinedStreams.forEach(({ url, bitrate, height, width }) => {
    let quality = "144p";
    let finalHeight = height;
    let finalWidth = width;

    // Use height from metadata if available
    if (height > 0) {
      if (height >= 2160) {
        quality = "2160p";
        finalHeight = 2160;
      } else if (height >= 1440) {
        quality = "1440p";
        finalHeight = 1440;
      } else if (height >= 1080) {
        quality = "1080p";
        finalHeight = 1080;
      } else if (height >= 720) {
        quality = "720p";
        finalHeight = 720;
      } else if (height >= 480) {
        quality = "480p";
        finalHeight = 480;
      } else if (height >= 360) {
        quality = "360p";
        finalHeight = 360;
      } else if (height >= 240) {
        quality = "240p";
        finalHeight = 240;
      } else {
        quality = "144p";
        finalHeight = 144;
      }
    } else {
      // Fallback: analyze URL
      const urlLower = url.toLowerCase();
      let finalBitrate = bitrate;
      if (finalBitrate === 0) {
        const bitrateMatch = url.match(/bitrate=(\d+)/);
        if (bitrateMatch) {
          finalBitrate = parseInt(bitrateMatch[1], 10);
        }
      }

      // Determine from URL tags
      if (
        urlLower.includes("hd2") ||
        urlLower.includes("hd_2") ||
        urlLower.includes("1080")
      ) {
        quality = "1080p";
        finalHeight = 1080;
        finalWidth = 1920;
      } else if (
        urlLower.includes("hd1") ||
        urlLower.includes("hd_1") ||
        urlLower.includes("720")
      ) {
        quality = "720p";
        finalHeight = 720;
        finalWidth = 1280;
      } else if (urlLower.includes("md") && !urlLower.includes("hd")) {
        quality = "480p";
        finalHeight = 480;
        finalWidth = 854;
      } else if (urlLower.includes("sd")) {
        quality = "360p";
        finalHeight = 360;
        finalWidth = 640;
      } else if (urlLower.includes("qd")) {
        quality = "240p";
        finalHeight = 240;
        finalWidth = 426;
      } else {
        // Map based on bitrate
        if (finalBitrate > 3000000) {
          quality = "1080p";
          finalHeight = 1080;
          finalWidth = 1920;
        } else if (finalBitrate > 1500000) {
          quality = "720p";
          finalHeight = 720;
          finalWidth = 1280;
        } else if (finalBitrate > 500000) {
          quality = "480p";
          finalHeight = 480;
          finalWidth = 854;
        } else if (finalBitrate > 200000) {
          quality = "360p";
          finalHeight = 360;
          finalWidth = 640;
        } else if (finalBitrate > 100000) {
          quality = "240p";
          finalHeight = 240;
          finalWidth = 426;
        } else {
          quality = "144p";
          finalHeight = 144;
          finalWidth = 256;
        }
      }
    }

    // Calculate width if not available
    if (finalWidth === 0 && finalHeight > 0) {
      // Assume 16:9 aspect ratio
      finalWidth = Math.round((finalHeight * 16) / 9);
    }

    resolutions.push({
      url,
      width: finalWidth,
      height: finalHeight,
      quality,
      format: "mp4",
    });
  });

  // Group by quality and keep only the best stream per quality
  const qualityMap = new Map<string, Resolution>();
  resolutions.forEach((res) => {
    const existing = qualityMap.get(res.quality);
    if (!existing || res.height > existing.height) {
      qualityMap.set(res.quality, res);
    }
  });

  // Convert to array and sort by height descending
  const uniqueResolutions = Array.from(qualityMap.values()).sort(
    (a, b) => b.height - a.height
  );

  return {
    title: title || "Facebook Video",
    thumbnail: thumbnail,
    resolutions: uniqueResolutions,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required and must be a string" },
        { status: 400 }
      );
    }

    console.log("Fetching page source from Facebook URL:", url);

    // Fetch page source (view source)
    const pageSource = await fetchPageSource(url);

    // Extract video streams
    const streamsData = extractMp4LinksFromContent(pageSource);

    if (streamsData.length === 0) {
      return NextResponse.json(
        {
          error: "No video streams found in the page",
        },
        { status: 404 }
      );
    }

    // Extract title and thumbnail
    const title = extractVideoTitle(pageSource);
    const thumbnail = extractThumbnail(pageSource);

    // Format video data
    const videoData = formatVideoData(streamsData, title, thumbnail);

    return NextResponse.json(videoData);
  } catch (error) {
    console.error("Error fetching page source:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    const httpStatus =
      axios.isAxiosError(error) && error.response
        ? `HTTP ${error.response.status}`
        : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        details: httpStatus,
      },
      { status: 500 }
    );
  }
}
