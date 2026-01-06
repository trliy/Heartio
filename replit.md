# Heartio

## Overview
Heartio is a Stremio addon that provides radio streaming from iHeart Radio. It exposes a REST API that Stremio clients can use to discover and stream live radio stations.

## Project Structure
- `server.js` - Express server with Stremio addon endpoints
- `iheart.js` - iHeart Radio API wrapper for fetching stations and streams
- `package.json` - Node.js dependencies and scripts

## API Endpoints
- `GET /manifest.json` - Stremio addon manifest
- `GET /catalog/:type/:id.json` - List radio stations (supports `?search=` query)
- `GET /meta/:type/:id.json` - Get station metadata
- `GET /stream/:type/:id.json` - Get streaming URL for a station

## Running Locally
```bash
npm install
npm start
```

The server runs on port 5000 by default.

## Recent Changes
- 2026-01-06: Configured for Replit environment (port 5000, bind to 0.0.0.0)
