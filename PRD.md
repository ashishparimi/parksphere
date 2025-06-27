# ParkSphere - Product Requirements Document

## Executive Summary

ParkSphere is a Google Earth-like interactive 3D web application that brings U.S. National Parks to life through immersive globe exploration. Built as a 10-park MVP demo, it provides a semi-realistic Earth visualization where users can discover parks by navigating the globe and clicking on glowing markers, creating an engaging, kid-friendly exploration experience without traditional scrolling.

## Vision & Goals

### Primary Goals
- Create a Google Earth-like interface with smooth globe navigation and zoom controls
- Provide educational content through interactive pop-ups and visual galleries
- Design a semi-realistic yet kid-friendly Earth visualization
- Enable discovery-based exploration by navigating the globe surface
- Eliminate traditional scrolling in favor of 3D navigation

### Target Audience
- **Primary**: Families with children (ages 8-14) interested in nature and national parks
- **Secondary**: Educators looking for interactive teaching tools
- **Tertiary**: Park enthusiasts and virtual travelers

## Core Features (MVP)

### 1. Google Earth-Style Globe Navigation
- **Description**: A semi-realistic Earth with smooth navigation and exploration
- **Functionality**: 
  - Mouse/touch-based globe rotation (drag to rotate)
  - Zoom in/out with scroll wheel or pinch gestures
  - Click and drag to navigate across Earth's surface
  - Glowing park markers visible from appropriate zoom levels
  - No vertical page scrolling - all interaction within 3D space
  - Smooth camera transitions when selecting parks
- **Visual Style**: Semi-realistic Earth texture with kid-friendly colors
- **Tech**: React Three Fiber, Three.js with OrbitControls

### 2. Park Information Pop-ups
- **Description**: Floating information panels that appear when clicking park markers
- **Behavior**: 
  - Appear as 3D-positioned overlays near selected park
  - Semi-transparent background for maintaining globe visibility
  - Close button or click-outside to dismiss
  - Smooth fade-in/out animations
- **Data Points**:
  - Park name and NPS code
  - Biome classification
  - Total acreage
  - Year established
  - Brief summary/description
- **Tech**: React components with Tailwind CSS styling

### 3. Photo Gallery
- **Description**: Visual showcase of each park
- **Features**:
  - 5 high-quality landscape photos per park
  - Horizontal scrollable strip
  - Low-resolution blur placeholders for fast loading
  - Full-screen view on click
- **Data Source**: Unsplash API

### 4. Satellite Imagery
- **Description**: Bird's eye view of each park
- **Features**:
  - NASA satellite tile for geographic context
  - Toggle between photo gallery and satellite view
- **Data Source**: NASA Earth Assets API

### 5. Optional 3D Mascot
- **Description**: Friendly park ranger character (if GLB model available)
- **Features**:
  - Animated idle states
  - Future: Conversational AI integration
- **Tech**: GLTF/GLB model loaded via Three.js

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 (TypeScript)
- **3D Rendering**: React Three Fiber (R3F)
- **Styling**: Tailwind CSS
- **State Management**: React Query for data fetching
- **Build Tool**: pnpm

### Backend Stack
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite (for caching)
- **APIs**: REST endpoints
- **Asset Processing**: Pillow for image manipulation

### External APIs
- **Unsplash**: Photo galleries
- **NASA Earth Assets**: Satellite imagery
- **NPS API**: Park information
- **Groq/Claude**: Future AI chat capabilities

### Data Flow
1. Ingest script fetches data from external APIs
2. Processes and stores assets locally
3. FastAPI serves processed data
4. React frontend consumes API endpoints
5. 3D visualization renders interactive experience

## Navigation Controls

### Mouse Controls
- **Left Click + Drag**: Rotate globe
- **Scroll Wheel**: Zoom in/out
- **Click Marker**: Open park information
- **Right Click + Drag**: Pan camera (optional)

### Touch Controls
- **Single Touch + Drag**: Rotate globe
- **Pinch**: Zoom in/out
- **Tap Marker**: Open park information
- **Two Finger Drag**: Pan camera

### Zoom Levels
- **Far (Default)**: See full Earth with all markers
- **Medium**: Regional view with larger markers
- **Close**: Detailed view of specific park area

## MVP Implementation Plan

### Phase 1: Foundation (Tasks A-D)
1. **Project Setup**
   - Initialize Next.js frontend
   - Set up FastAPI backend
   - Create directory structure
   
2. **Data Preparation**
   - Create parks seed CSV with 10 parks
   - Set up environment variables
   - Build asset ingestion script

### Phase 2: Core Features (Tasks E-G)
1. **API Development**
   - Create park data endpoints
   - Implement CORS configuration
   - Add error handling

2. **UI Components**
   - Build reusable React components
   - Implement 3D globe visualization
   - Create responsive layouts

### Phase 3: Polish & Enhancement (Tasks L-P)
1. **Accessibility**
   - Kid-friendly UI theme
   - Large touch targets
   - Screen reader support

2. **Data Optimization**
   - SQLite integration
   - Lazy loading
   - Image optimization

3. **Interactive Features**
   - AI mascot chat (optional)
   - Educational overlays
   - Fun facts system

## Data Schema

### Park Data Model
```json
{
  "id": 1,
  "name": "Grand Canyon National Park",
  "nps_code": "grca",
  "coordinates": {
    "lat": 36.1069,
    "lon": -112.1129
  },
  "biome": "desert",
  "established": 1919,
  "area_acres": 1217262,
  "summary": "...",
  "gallery": [
    {
      "url": "/z/assets/1/gallery_0.jpg",
      "blur": "/z/assets/1/gallery_0_blur.jpg"
    }
  ],
  "satellite": "/z/assets/1/satellite.png"
}
```

## UI/UX Guidelines

### Design Principles
- **Google Earth-Like**: Intuitive globe navigation without scrolling
- **Semi-Realistic**: Balance between realistic Earth visuals and kid-friendly aesthetics
- **Discovery-Based**: Encourage exploration by navigating the globe
- **Responsive**: Touch-friendly controls for tablet and mobile
- **Performance**: Smooth 60 FPS globe interaction

### Visual Theme
- **Earth Rendering**: Semi-realistic textures with vibrant, kid-friendly colors
- **Markers**: Glowing dots with pulsing animations
- **UI Elements**: Floating panels with glassmorphism
- **Typography**: Clear, readable fonts optimized for 3D space
- **Atmosphere**: Soft atmospheric glow around Earth
- **Stars**: Subtle starfield background

## Success Metrics

### Technical Metrics
- Page load time < 3 seconds
- 60 FPS 3D rendering
- API response time < 200ms
- 90+ Lighthouse score

### User Engagement
- Average session duration > 3 minutes
- Gallery interaction rate > 70%
- Globe interaction rate > 90%
- Mascot chat engagement (if implemented)

## Future Enhancements

### Version 2.0 Ideas
- All 63 U.S. National Parks
- Virtual park tours with 3D terrain
- User accounts and favorites
- Educational quizzes and badges
- Seasonal content updates
- Mobile app version

### AI Integration
- Natural language park information queries
- Personalized recommendations
- Interactive learning experiences
- Voice-guided tours

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Cache responses, implement retry logic
- **3D Performance**: Progressive quality settings, fallback to 2D
- **Data Availability**: Graceful degradation when APIs unavailable

### Content Risks
- **Image Rights**: Use only licensed Unsplash content
- **Data Accuracy**: Verify against official NPS sources
- **Age Appropriateness**: Review all content for family-friendly standards

## Development Timeline

### Week 1: Foundation
- Days 1-2: Project setup and tooling
- Days 3-4: Data ingestion pipeline
- Days 5-7: Core API development

### Week 2: Frontend
- Days 8-9: 3D globe implementation
- Days 10-11: UI components
- Days 12-14: Integration and styling

### Week 3: Polish
- Days 15-16: Performance optimization
- Days 17-18: Accessibility improvements
- Days 19-21: Testing and bug fixes

## License & Attribution

- **Project License**: MIT License
- **Data Sources**: 
  - National Park Service (Public Domain)
  - NASA Earth Assets (Public Domain)
  - Unsplash (License per image)
- **3D Assets**: Custom or CC0 licensed

---

© 2025 ParkSphere Team - Building the future of virtual park exploration