## Flux Video Downloader

Flux is a multi-platform video downloader focused on a polished UI, reliable scraping pipelines, and transparent APIs. It supports YouTube, Facebook (public + private), TikTok, and any future providers that follow the same patterns.

### Feature Highlights

- **Modern App Router UI** – Next.js 16 + React 19, Tailwind CSS v4 presets, shadcn/ui components, theme switching, and mobile-friendly navigation.
- **Platform-specific workflows** – Individual pages under `app/{platform}` guide users through URL capture, crawling, previewing, and downloading.
- **Robust crawling layer** – Server actions in `app/api/crawl/*` combine RapidAPI (YouTube), Puppeteer/axios fallbacks (Facebook), and HTML parsing (TikTok) to normalize metadata and stream URLs.
- **Direct downloads** – `/api/download` streams Facebook CDN assets server-side to bypass CORS limits and preserves headers for clean filenames.
- **Utility toolbox** – `utilities/facebook-utils.ts` handles parsing, normalization, and quality labeling for dozens of stream variations.

### Tech Stack

- Next.js 16.0 App Router, TypeScript, React 19, next-themes
- Tailwind CSS v4 (via `@tailwindcss/postcss`) with shadcn/ui (`components/ui/*`)
- Axios, Puppeteer, and custom HTML parsers for crawl operations
- Lucide icons, Radix primitives, Sonner toasts, React Hook Form (future forms)

### Repository Layout

- `app/` – Route tree (marketing page, per-platform downloaders, API routes, global layout)
  - `app/api/crawl/{youtube|facebook|facebook-private-video|tiktok}` – platform scrapers
  - `app/api/download` – server-side proxy for binary downloads
  - `app/api/health` – simple uptime check
- `components/` – Header, footer, responsive menu, theme switch, and shadcn-based UI primitives
- `hooks/` – Client hooks such as `use-mobile`
- `utilities/facebook-utils.ts` – Parsing helpers for MP4 extraction, DASH manifest decoding, metadata formatting
- `public/` – Logos and static SVGs used across the marketing site
- `.next/` – Build artifacts (ignored by git)

### API Overview

| Route                               | Method | Purpose                                                                                           | Notes                                                                 |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/api/crawl/youtube`                | POST   | Fetches RapidAPI metadata + adaptive formats                                                      | Requires `RAPIDAPI_KEY` or `YOUTUBE_RAPIDAPI_KEY`                     |
| `/api/crawl/facebook`               | POST   | Uses Puppeteer (if available) then axios to pull fully rendered HTML and extract MP4/M3U8 streams | Relies on regex + manifest parsing from `utilities/facebook-utils.ts` |
| `/api/crawl/facebook-private-video` | POST   | Specialized logic for private URLs (shares utilities)                                             | Designed for authenticated session data                               |
| `/api/crawl/tiktok`                 | POST   | Scrapes embedded JSON in `__UNIVERSAL_DATA_FOR_REHYDRATION__`                                     | Preserves msToken/ttChainToken for follow-up requests                 |
| `/api/download`                     | GET    | Proxies Facebook CDN video responses server-side                                                  | Adds `Content-Disposition` for consistent filenames                   |
| `/api/health`                       | GET    | Returns `{ status: "ok" }` for uptime checks                                                      | Useful for monitoring                                                 |

### Environment Variables

Create `.env.local` with:

```
RAPIDAPI_KEY=xxxx             # or YOUTUBE_RAPIDAPI_KEY=xxxx
```

Only YouTube crawling depends on RapidAPI today. Facebook/TikTok routes scrape directly but may require additional secrets (cookies, proxy settings) based on your deployment environment.

### Getting Started

1. Install dependencies: `npm install`
2. Launch dev server: `npm run dev` (defaults to `http://localhost:3000`)
3. Build for production: `npm run build`
4. Run production preview: `npm run start`
5. Lint all files: `npm run lint`

> Node.js 18.17+ is recommended (matching the Next.js 16 requirement). When using Puppeteer locally, ensure Chrome dependencies are available or fall back to axios-only crawling.

### Development Notes

- **Component styling** – Tailwind utilities live in `app/globals.css`; shadcn tokens/components expect the “new-york” theme defined in `components.json`.
- **Client vs server** – UI pages dealing with form state are client components (`"use client"`). API routes run on the Edge/Node runtime (default) and can use Node APIs, Puppeteer, or file system access.
- **Extending providers** – Add a new UI page under `app/{provider}` and register a scraper under `app/api/crawl/{provider}`. Reuse `lib/utils.ts` helpers for class merging and share UI primitives via `components/ui`.
- **Testing crawlers** – Hit `/api/health` to confirm runtime, then POST JSON `{ "url": "<video url>" }` to the relevant crawl endpoint. Inspect the JSON response for `resolutions`, `mimeType`, and derived tokens before wiring into the UI.

### Deployment Tips

- Disable Puppeteer when not supported by the hosting platform, or bundle `puppeteer-core` with a compatible Chrome binary.
- Consider adding rate limiting and API key validation before exposing crawl routes publicly.
- Cache responses (e.g., via Redis or Next.js Route Handlers with `revalidate`) to avoid repeated RapidAPI calls for the same video ID.

Flux is intentionally modular—use the existing providers as a blueprint to onboard additional platforms or tailor the UI for your brand.
