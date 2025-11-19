# Flux Video Downloader

Flux is a free, cross-platform video downloader for YouTube, Facebook (public and private), TikTok, and more. Available as a web app, desktop application, and Chrome extension.

## Overview

Flux provides multiple ways to download videos:

- **Web App**: Browser-based video downloader with quality selection and server-side crawling
- **Desktop App**: Electron-based desktop application with advanced download management
- **Chrome Extension**: Seamlessly intercepts browser downloads and sends them to the desktop app

## Project Structure

This repository contains three main components, each with its own directory and can be developed independently:

### 🌐 flux-web-app

Next.js web application that provides a browser-based interface for downloading videos from various platforms.

**Features:**

- Platform-specific download pages (YouTube, Facebook, Facebook Private Video, TikTok)
- Quality selection and preview
- Server-side video crawling and processing
- Direct download proxy for Facebook videos (bypasses CORS)
- Modern UI with theme switching and mobile-friendly navigation
- Robust crawling layer with RapidAPI, Puppeteer, and custom HTML parsers

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

**Key Files:**

- `app/api/crawl/` - Platform-specific crawlers (YouTube, Facebook, TikTok)
- `app/api/download/` - Server-side download proxy
- `app/{platform}/` - Platform-specific download pages
- `utilities/facebook-utils.ts` - Facebook video parsing utilities

### 💻 flux-desktop-app

Electron desktop application for managing video downloads with advanced features.

**Features:**

- Download management (pause, resume, cancel)
- Real-time progress tracking with percentage and file size
- Custom download locations per file
- Chrome extension integration via HTTP server (port 8765)
- Platform-specific workflows (YouTube, Facebook, Facebook Private Video, TikTok)
- Settings management with persistent storage
- Cross-platform support (Windows, macOS, Linux)

**Tech Stack:** Electron, React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS v4

**Key Files:**

- `electron/main.ts` - Main process with download handlers and HTTP server
- `src/downloader_app.tsx` - Downloader window component
- `src/pages/` - Platform-specific pages and settings
- `src/components/` - UI components (shadcn/ui)

### 🔌 flux-chrome-extension

Chrome extension that intercepts video downloads and sends them to the desktop app.

**Features:**

- Automatic download interception
- Blob URL handling (converts to original source URLs)
- Platform detection (YouTube, Facebook, TikTok)
- Quality selection dropdown for supported platforms
- Video element detection with overlay download buttons
- Direct communication with desktop app via HTTP

**Tech Stack:** React 19, TypeScript, Vite, Chrome Extension Manifest V3, CRXJS

**Key Files:**

- `src/background/index.ts` - Background service worker for download interception
- `src/content/views/App.tsx` - Content script with video detection and quality selection
- `manifest.config.ts` - Chrome extension manifest configuration

## Supported Platforms

- **YouTube**: Full support with multiple quality options and audio extraction
- **Facebook**: Public and private video support with quality selection
- **TikTok**: Quality selection with authentication token handling
- **Other Platforms**: Direct download support for any video URL

## Key Features

- **Multi-platform Support**: Download from YouTube, Facebook, TikTok, and more
- **Quality Selection**: Choose from available resolutions and formats
- **Download Management**: Pause, resume, and cancel downloads (desktop app)
- **Chrome Integration**: Seamless browser-to-desktop workflow
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Cross-platform**: Web, desktop (Windows/macOS/Linux), and browser extension
- **Private Video Support**: Specialized handling for Facebook private videos
- **Server-side Processing**: Robust crawling with multiple fallback strategies

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Development

Each component has its own `package.json` and can be developed independently:

### Quick Start

1. **Web App**:

   ```bash
   cd flux-web-app
   npm install
   npm run dev
   ```

2. **Desktop App**:

   ```bash
   cd flux-desktop-app
   npm install
   npm run dev
   ```

3. **Chrome Extension**:
   ```bash
   cd flux-chrome-extension
   npm install
   npm run build
   # Load dist/ folder in Chrome as unpacked extension
   ```

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- For web app: RapidAPI key for YouTube crawling (optional, can use fallbacks)
- For desktop app: No additional requirements
- For Chrome extension: Chrome browser and Flux desktop app running

### Environment Variables

**Web App** (`.env.local`):

```env
RAPIDAPI_KEY=your_rapidapi_key  # or YOUTUBE_RAPIDAPI_KEY
```

**Chrome Extension** (`.env`):

```env
VITE_WEB_API_URL=http://localhost:3000
```

See individual README files in each directory for component-specific setup and development instructions.

## Architecture

### How Components Work Together

1. **Web App**: Provides browser-based interface and API endpoints for video crawling
2. **Desktop App**: Runs HTTP server on port 8765 to receive download requests
3. **Chrome Extension**: Intercepts browser downloads and sends URLs to desktop app

### Communication Flow

```
Browser Download → Chrome Extension → Desktop App (HTTP :8765) → Download Manager
```

The Chrome extension can also use the web app's API endpoints to fetch video metadata and quality options before sending to the desktop app.

## License

MIT License

Copyright (c) 2025 Shakib Khan

See [LICENSE](LICENSE) file for details.

## Related Projects

- [flux-web-app/README.md](flux-web-app/README.md) - Web application documentation
- [flux-desktop-app/README.md](flux-desktop-app/README.md) - Desktop application documentation
- [flux-chrome-extension/README.md](flux-chrome-extension/README.md) - Chrome extension documentation
