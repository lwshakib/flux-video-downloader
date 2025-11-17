import {
  extractMp4LinksFromContent,
  extractThumbnail,
  extractVideoTitle,
  formatVideoData,
} from "@/utilities/facebook-utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { html, pageSource } = body;

    // Support both 'html' and 'pageSource' parameter names for compatibility
    const source = html || pageSource;

    if (!source || typeof source !== "string") {
      return NextResponse.json(
        { error: "html or pageSource is required and must be a string" },
        { status: 400 }
      );
    }

    console.log("Processing Facebook video page source...");

    // Extract video streams
    const streamsData = extractMp4LinksFromContent(source);

    if (streamsData.length === 0) {
      return NextResponse.json(
        {
          error: "No video streams found in the provided page source",
        },
        { status: 404 }
      );
    }

    // Extract title and thumbnail
    const title = extractVideoTitle(source);
    const thumbnail = extractThumbnail(source);

    // Format video data
    const videoData = formatVideoData(streamsData, title, thumbnail);

    return NextResponse.json(videoData);
  } catch (error) {
    console.error("Error processing page source:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
