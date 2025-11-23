# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smartphone Banana is a PWA (Progressive Web App) for AI image generation using the fal-ai/nano-banana-pro API. It's a client-side only application with no backend server.

## Local Development

Run a local web server from the webapp directory:
```bash
python3 -m http.server 8000
```

Access at `http://localhost:8000`

## Version Management

**CRITICAL**: Every code change must increment the patch version in `index.html`:
- Current format: `v0.1.x` where x increments with each change
- Location: `<h1>Smartphone Banana <span class="version">v0.1.x</span></h1>`
- Update the version number in the h1 tag for ANY modification
- Current version: v0.1.28

## Architecture

### Core Files
- `index.html` - Main UI with accordion-based API settings
- `app.js` - FAL API integration and image generation logic
- `style.css` - Responsive design with dark mode support
- `sw.js` - Service Worker for PWA offline functionality
- `manifest.json` - PWA configuration

### FAL API Integration Flow

The app supports two modes:

#### Normal Mode (Text-to-Image)
- API endpoint: `https://queue.fal.run/fal-ai/nano-banana-pro`
- Used when no reference images are uploaded

#### Edit Mode (Image-to-Image)
- API endpoint: `https://queue.fal.run/fal-ai/nano-banana-pro/edit`
- Used when 1-4 reference images are uploaded
- Images uploaded to FAL CDN first, then URLs sent via `image_urls` parameter
- Fallback to base64 data URIs if upload fails

Both modes use a 3-step async process:

1. **Submit Request** → POST to API endpoint
   - Returns `request_id` and `status_url`

2. **Poll Status** → GET `status_url` every 5 seconds
   - Check for `status: "COMPLETED"` or `status: "FAILED"`

3. **Fetch Result** → GET `/requests/{request_id}` when completed
   - Returns final JSON with `images` array containing `url`, `content_type`, `file_name`

**Important**: Must fetch the result endpoint after completion - the status endpoint does not contain the actual image data.

### API Response Structure
```javascript
{
  "images": [
    {
      "url": "https://...",
      "content_type": "image/png",
      "file_name": "...",
      "file_size": null,
      "width": null,
      "height": null
    }
  ],
  "description": ""
}
```

Handle both `result.data` and direct `result` for compatibility.

### State Management

- API keys stored in localStorage as `fal_api_key` (plaintext, not encrypted)
- Accordion state managed via CSS classes (`.active`)
- Loading state toggles button text/spinner visibility
- Image uploads stored in memory as `uploadedImages[]` array with `file` and `dataUrl` properties

### Service Worker Caching

Cache name follows app version: `smartphone-banana-v0.1.x`
- **IMPORTANT**: When updating app version in index.html, also update CACHE_NAME in sw.js to match
- Example: v0.1.28 in index.html → `const CACHE_NAME = 'smartphone-banana-v0.1.28';` in sw.js
- This ensures cache invalidation on every version update
- Current cached files: index.html, style.css, app.js, manifest.json, icons

## Key Components

### Accordion API Settings
- CSS: `.accordion-content.active` with `max-height: 300px`
- Toggle via `apiKeyToggle` button click
- Adjust max-height if content exceeds 300px

### Image Upload (Reference Images)
- File selection via click or drag & drop
- Max 4 images allowed
- Preview grid: `repeat(auto-fill, minmax(80px, 1fr))`
- Remove button (×) on each preview
- Images uploaded to FAL CDN storage before generation
- 2-stage upload: Initiate → Upload with multiple endpoint fallbacks
- Automatic fallback to base64 data URIs if CDN upload fails

#### FAL CDN Upload Flow
1. **Initiate Upload** → POST to `https://rest.alpha.fal.ai/storage/upload/initiate`
   - Tries: `fal-cdn-v3`, `fal-cdn`, default (in order)
   - Returns `upload_url` and `file_url`

2. **Upload File** → PUT to `upload_url`
   - Sends blob with `Content-Type` header
   - Uses `file_url` from step 1 for API requests

3. **Fallback** → FormData upload to legacy endpoints
   - `https://api.fal.ai/v1/storage/upload`
   - Multiple alternative endpoints tried in sequence

4. **Final Fallback** → Base64 data URI if all uploads fail

### Generated Image Display
- Grid layout: `repeat(auto-fill, minmax(300px, 1fr))`
- Each image has download link with `target="_blank"`

## API Configuration

### Normal Mode API
URL: `https://queue.fal.run/fal-ai/nano-banana-pro`

### Edit Mode API
URL: `https://queue.fal.run/fal-ai/nano-banana-pro/edit`

Supported parameters (both modes):
- `prompt` (string, required)
- `num_images` (integer, 1-4)
- `aspect_ratio` (enum: "1:1", "16:9", "9:16", etc.)
- `resolution` (enum: "1K", "2K", "4K")
- `output_format` (enum: "png", "jpeg", "webp")
- `sync_mode` (boolean, always false in this app)
- `image_urls` (array of strings, edit mode only) - FAL CDN URLs or base64 data URIs

## Deployment

GitHub Pages deployment from root folder (not `/webapp`):
1. Push to GitHub
2. Settings > Pages > Source: main branch, root folder
3. App will be available at `https://username.github.io/smartphone-banana/`
