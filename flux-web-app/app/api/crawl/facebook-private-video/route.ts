import { NextResponse } from 'next/server';
import { 
  extractMp4LinksFromContent, 
  extractVideoTitle, 
  extractThumbnail, 
  formatVideoData,
  type StreamData,
  type Resolution,
  type VideoData,
  extractDashManifestStreams,
  parseDashXml
} from '../facebook/utils';

export async function POST(request: Request) {
  try {
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'HTML content is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('Processing Facebook video page source...');

    // Extract video streams using multiple methods
    let streamsData: StreamData[] = [];
    
    // Method 1: Extract from DASH manifest if available
    const dashStreams = extractDashManifestStreams(html);
    if (dashStreams.length > 0) {
      streamsData = [...dashStreams];
    }
    
    // Method 2: Fallback to direct MP4 link extraction
    if (streamsData.length === 0) {
      const directLinks = extractMp4LinksFromContent(html);
      streamsData = [...directLinks];
    }

    // Method 3: Try to extract from JSON data
    if (streamsData.length === 0) {
      const jsonPattern = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      
      while ((match = jsonPattern.exec(html)) !== null) {
        try {
          const jsonData = JSON.parse(match[1]);
          const jsonStr = JSON.stringify(jsonData);
          const additionalStreams = extractMp4LinksFromContent(jsonStr);
          streamsData = [...streamsData, ...additionalStreams];
        } catch {
          // Skip invalid JSON
        }
      }
    }

    if (streamsData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No video streams found in the provided HTML',
          debug: {
            htmlLength: html.length,
            hasVideoTag: html.toLowerCase().includes('<video'),
            hasMp4: html.toLowerCase().includes('.mp4'),
            hasDashManifest: html.includes('dash_manifest')
          }
        },
        { status: 200 }
      );
    }

    // Extract title and thumbnail
    const title = extractVideoTitle(html) || 'Facebook Video';
    const thumbnail = extractThumbnail(html);

    // Format video data with available qualities
    const videoData = formatVideoData(streamsData, title, thumbnail);
    
    // Group by quality and select the best stream for each quality
    const qualityMap = new Map<string, Resolution>();
    videoData.resolutions.forEach(res => {
      const existing = qualityMap.get(res.quality);
      if (!existing || (res.width * res.height) > (existing.width * existing.height)) {
        qualityMap.set(res.quality, res);
      }
    });

    // Create a sorted list of qualities (highest first)
    const qualityOrder = ['8k', '4k', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p', 'sd'];
    const sortedQualities = Array.from(qualityMap.entries())
      .sort(([a], [b]) => {
        const indexA = qualityOrder.indexOf(a) !== -1 ? qualityOrder.indexOf(a) : Infinity;
        const indexB = qualityOrder.indexOf(b) !== -1 ? qualityOrder.indexOf(b) : Infinity;
        return indexA - indexB;
      });

    // Prepare the response with sorted qualities
    const responseData = {
      success: true,
      data: {
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration || null,
        qualities: Object.fromEntries(
          sortedQualities.map(([quality, res]) => [
            quality,
            {
              url: res.url,
              width: res.width,
              height: res.height,
              format: res.format || 'mp4',
              quality: res.quality
            }
          ])
        )
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error processing page source:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
