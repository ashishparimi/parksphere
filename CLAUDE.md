# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines

1. **Always write tests** - Create unit tests for every new function and integration tests for API endpoints
2. **Provide high-level explanations** - After each task, briefly explain what changes were made without excessive detail
3. **Keep changes simple** - Make minimal, focused changes that impact the least amount of code possible. Prioritize simplicity over complexity
4. **Maintain progress tracking** - Update a `PROGRESS.md` file after each major milestone to track completed work
5. **Build in stages** - Develop components independently with clear interfaces so they can be tested in isolation and integrated with minimal breakage. Do an end to end test at each stage to make sure everything working.

## Project Overview

This hackathon workspace contains ParkSphere - an interactive 3D web application showcasing U.S. National Parks. It combines a Python FastAPI backend with a Next.js/React Three Fiber frontend to create an immersive park exploration experience.

## Architecture

The project follows a client-server architecture:
- **Backend**: FastAPI (Python) serving REST APIs and processing external data
- **Frontend**: Next.js 14 with React Three Fiber for 3D visualization
- **Data Storage**: SQLite for caching, local file system for assets

## Commands

### Backend Development
```bash
cd parksphere/server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000  # Run API server
```

### Frontend Development (when implemented)
```bash
cd parksphere/client
pnpm install
pnpm dev                # Development server on :3000
pnpm build             # Production build
```

### Data Ingestion
```bash
cd parksphere
cp .env.template .env  # Add your API keys
python server/ingest/fetch_assets_mvp.py --out public/z/assets --limit 10
```

## Project Structure

```
hackathon/
├── main.py                 # PyCharm template file
├── PRD.md                  # Product Requirements Document
├── parksphere/            # Main project directory
│   ├── server/
│   │   ├── main.py        # FastAPI application (to be created)
│   │   ├── requirements.txt
│   │   └── ingest/
│   │       ├── parks_mvp_seed.csv
│   │       └── fetch_assets_mvp.py (to be created)
│   ├── client/            # Next.js frontend (to be created)
│   └── public/
│       └── z/assets/      # Processed park assets
```

## API Design

- `GET /api/parks` - List all parks with basic info
- `GET /api/parks/{id}` - Detailed park data including gallery URLs
- `POST /api/ask` - AI chat endpoint (future feature)

## Data Flow (Development Order)

1. **Phase 1 - Backend Foundation**
   - Build FastAPI server with mock data endpoints
   - Test API responses with static JSON
   - Add CORS and basic error handling

2. **Phase 2 - Data Integration**
   - Create ingest script for external APIs (Unsplash, NASA, NPS)
   - Implement image processing pipeline (resize, blur placeholders)
   - Store processed data in SQLite and file system
   - Update API to serve real data

3. **Phase 3 - Frontend Basics**
   - Set up Next.js with TypeScript
   - Create basic UI components (cards, galleries)
   - Implement data fetching with React Query
   - Test with backend API

4. **Phase 4 - 3D Visualization** (Complex Component)
   - Integrate React Three Fiber
   - Build interactive globe with park markers
   - Add camera controls and animations
   - Optimize performance

5. **Phase 5 - AI Integration** (Complex Component)
   - Integrate Groq LLM with proper prompts
   - Create chat UI component
   - Implement streaming responses
   - Add context-aware park information 



## Development Environment

- **Python Version**: 3.10+ (FastAPI requires modern Python)
- **Node Version**: 18+ (for Next.js 14)
- **Package Manager**: pnpm (frontend), pip (backend)

## Project Constraints

- No need of mobile implementation. Stick to website