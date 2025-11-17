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

export interface VideoData {
  title: string;
  thumbnail: string;
  resolutions: Resolution[];
}

export function extractDashManifestStreams(html: string): StreamData[] {
  const streams: StreamData[] = [];
  
  // Look for DASH manifest URL in the HTML
  const dashPattern = /dash_manifest"?\s*:\s*"([^"]+)"/i;
  const match = html.match(dashPattern);
  
  if (!match) return [];
  
  try {
    // Decode the URL-encoded manifest
    const manifestUrl = match[1].replace(/\\\//g, '/');
    
    // Extract streams from the manifest URL pattern
    const streamPattern = /(https?:[^,"']+\.(?:mp4|m3u8|mpd)[^,"']*)/gi;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(manifestUrl)) !== null) {
      const url = streamMatch[1];
      const qualityMatch = url.match(/(\d+)p?\D*\.(mp4|m3u8|mpd)/i);
      const height = qualityMatch ? parseInt(qualityMatch[1], 10) : 0;
      
      streams.push({
        url,
        bitrate: height * 1000, // Approximate bitrate based on resolution
        height,
        width: Math.round(height * 16/9), // Approximate width
        streamType: height >= 720 ? 'hd' : 'sd',
      });
    }
  } catch (error) {
    console.error('Error parsing DASH manifest:', error);
  }
  
  return streams;
}

export function extractMp4FromText(text: string): string[] {
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
    const jsonPattern = /https?:\\?\/\\?\/[^"'<>]+\.mp4[^"'<>]*/gi;
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

export function extractMp4LinksFromContent(content: string): StreamData[] {
  const mp4Links = new Set<string>();
  const streamsWithMetadata: StreamData[] = [];

  // Extract direct MP4 links
  const directLinks = extractMp4FromText(content);
  directLinks.forEach(link => {
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

  // Additional parsing for Facebook-specific video data
  const videoDataMatches = content.match(/"playable_url":"(.*?)"/g);
  if (videoDataMatches) {
    videoDataMatches.forEach(match => {
      const urlMatch = match.match(/"playable_url":"(.*?)"/);
      if (urlMatch && urlMatch[1]) {
        const url = urlMatch[1].replace(/\\\//g, '/');
        if (!mp4Links.has(url)) {
          mp4Links.add(url);
          streamsWithMetadata.push({
            url,
            bitrate: 0,
            height: 0,
            streamType: "combined",
            width: 0,
          });
        }
      }
    });
  }

  return streamsWithMetadata;
}

export function extractVideoTitle(content: string): string {
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

  return '';
}

export function extractThumbnail(content: string): string {
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

  return '';
}

export function formatVideoData(
  streamsData: StreamData[],
  title: string,
  thumbnail: string
): VideoData {
  const resolutions: Resolution[] = [];

  // Process each stream and determine quality
  streamsData.forEach(({ url, width, height }) => {
    let quality = 'sd';
    
    // Determine quality based on height if available
    if (height > 0) {
      if (height >= 2160) quality = '2160p';
      else if (height >= 1440) quality = '1440p';
      else if (height >= 1080) quality = '1080p';
      else if (height >= 720) quality = '720p';
      else if (height >= 480) quality = '480p';
      else if (height >= 360) quality = '360p';
      else if (height >= 240) quality = '240p';
      else quality = '144p';
    }

    resolutions.push({
      url,
      width: width || 0,
      height: height || 0,
      quality,
      format: 'mp4'
    });
  });

  // Sort by quality (highest first)
  const sortedResolutions = resolutions.sort((a, b) => {
    const qualityOrder: Record<string, number> = {
      '2160p': 6,
      '1440p': 5,
      '1080p': 4,
      '720p': 3,
      '480p': 2,
      '360p': 1,
      '240p': 0,
      '144p': -1,
      'sd': -2
    };
    return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
  });

  return {
    title: title || 'Facebook Video',
    thumbnail,
    resolutions: sortedResolutions
  };
}
