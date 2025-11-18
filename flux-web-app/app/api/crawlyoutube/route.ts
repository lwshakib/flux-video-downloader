// Alias route for desktop app compatibility
// Redirects to /api/crawl/youtube
import { NextRequest, NextResponse } from "next/server";

// CORS headers helper
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the actual crawl endpoint
    const response = await fetch(
      new URL("/api/crawl/youtube", request.url),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: getCorsHeaders(),
    });
  } catch (error) {
    console.error("YouTube crawl error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

