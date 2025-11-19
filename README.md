# Flux Video Downloader

Flux is a free, cross-platform video downloader for YouTube, Facebook (public and private), TikTok, and more. Available as a web app, desktop application, and Chrome extension.

## Overview

Flux provides multiple ways to download videos:
- **Web App**: Browser-based video downloader with quality selection
- **Desktop App**: Electron-based desktop application with download management
- **Chrome Extension**: Seamlessly intercepts browser downloads and sends them to the desktop app

## Project Structure

This repository contains three main components:

### 🌐 flux-web-app
Next.js web application that provides a browser-based interface for downloading videos from various platforms.

**Features:**
- Platform-specific download pages (YouTube, Facebook, TikTok)
- Quality selection and preview
- Server-side video crawling and processing
- Modern UI with theme switching

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4

### 💻 flux-desktop-app
Electron desktop application for managing video downloads with advanced features.

**Features:**
- Download management (pause, resume, cancel)
- Real-time progress tracking
- Custom download locations per file
- Chrome extension integration via HTTP server
- Cross-platform support (Windows, macOS, Linux)

**Tech Stack:** Electron, React 18, TypeScript, Vite, shadcn/ui

### 🔌 flux-chrome-extension
Chrome extension that intercepts video downloads and sends them to the desktop app.

**Features:**
- Automatic download interception
- Blob URL handling (converts to original source URLs)
- Platform detection (YouTube, Facebook, TikTok)
- Quality selection dropdown for supported platforms
- Direct communication with desktop app

**Tech Stack:** React 19, TypeScript, Vite, Chrome Extension Manifest V3

## Supported Platforms

- **YouTube**: Full support with multiple quality options and audio extraction
- **Facebook**: Public and private video support
- **TikTok**: Quality selection with authentication
- **Other Platforms**: Direct download support

## Key Features

- **Multi-platform Support**: Download from YouTube, Facebook, TikTok, and more
- **Quality Selection**: Choose from available resolutions and formats
- **Download Management**: Pause, resume, and cancel downloads
- **Chrome Integration**: Seamless browser-to-desktop workflow
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Cross-platform**: Web, desktop (Windows/macOS/Linux), and browser extension

## Development

Each component has its own `package.json` and can be developed independently:

- `flux-web-app/` - Next.js web application
- `flux-desktop-app/` - Electron desktop application  
- `flux-chrome-extension/` - Chrome extension

See individual README files in each directory for component-specific setup and development instructions.

## License

Copyright © 2026 Flux
