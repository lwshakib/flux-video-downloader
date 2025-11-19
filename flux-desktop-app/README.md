# Flux Video Downloader - Desktop App

Flux is a free, cross-platform desktop video downloader for YouTube, Facebook (public and private), TikTok, and more. Download videos with quality selection, pause/resume support, and seamless Chrome extension integration.

## Features

- **Multi-platform Support**: Download videos from YouTube, Facebook (public and private), TikTok, and other platforms
- **Chrome Extension Integration**: Seamlessly intercept downloads from your browser and send them to the desktop app
- **Quality Selection**: Choose from available video resolutions and formats
- **Download Management**:
  - Pause and resume downloads (for supported platforms)
  - Cancel downloads at any time
  - Real-time progress tracking
  - Custom download location per file
- **Modern UI**: Built with React, TypeScript, and shadcn/ui components
- **Cross-platform**: Available for Windows, macOS, and Linux

## Tech Stack

- **Framework**: Electron + React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **State Management**: React Hooks
- **Icons**: Lucide React

## Project Structure

```
flux-desktop-app/
├── electron/              # Electron main process
│   └── main.ts          # Main process entry point, download handlers, IPC
├── src/                  # React renderer process
│   ├── App.tsx          # Main application component
│   ├── downloader_app.tsx  # Downloader window component
│   ├── components/      # UI components (shadcn/ui)
│   ├── pages/           # Page components (Home, YouTube, Facebook, TikTok, Settings)
│   └── constants/       # App constants and content
├── public/              # Static assets and icons
├── dist/                # Built renderer files
├── dist-electron/       # Built Electron main process
└── electron-builder.json5  # Electron Builder configuration
```

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build

### Development Mode

When running in development mode (`npm run dev`), DevTools will automatically open for debugging. In production builds, DevTools are disabled.

## Key Features

### Download Management

- **Pause/Resume**: Pause and resume downloads for platforms that support it (not available for YouTube/TikTok fetch-based downloads)
- **Cancel**: Cancel any download at any time (except after completion)
- **Progress Tracking**: Real-time download progress with percentage and file size
- **Custom Location**: Select a custom download location for individual files without changing default settings

### Chrome Extension Integration

The desktop app runs an HTTP server on port 8765 to receive download requests from the Chrome extension. When you download a video in your browser, the extension intercepts it and sends the URL to the desktop app for handling.

### Platform Support

- **YouTube**: Full support with quality selection
- **Facebook**: Public and private video support
- **TikTok**: Quality selection with authentication tokens
- **Other Platforms**: Direct download support

## Build Configuration

The app is configured to build for:

- **Windows**: NSIS installer (x64)
- **macOS**: DMG package
- **Linux**: AppImage

Build outputs are placed in `release/${version}/` directory.

## Settings

User settings are stored in `~/.flux/settings.json` and include:

- Default download location
- Theme preferences
- Other user preferences

## License

Copyright © 2026 Flux
