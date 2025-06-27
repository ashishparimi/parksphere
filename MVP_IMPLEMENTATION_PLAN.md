# ParkSphere MVP Implementation Plan - 4 Hour Hackathon

## 🎯 Overview
This plan outlines a focused implementation of ParkSphere MVP for a 4-hour hackathon. We'll build a working demo with core features, prioritizing what can be realistically achieved.

## ⏱️ Timeline: 4 Hours Total

### Hour 1: Backend API & Mock Data (0:00-1:00)
### Hour 2: Basic Frontend & Data Display (1:00-2:00)  
### Hour 3: 3D Globe Implementation (2:00-3:00)
### Hour 4: Integration & Demo Polish (3:00-4:00)

---

## Hour 1: Backend Foundation (0:00-1:00)

### 0:00-0:30 - FastAPI Setup (30 min)
- [ ] Create `parksphere/server/main.py` with FastAPI app
- [ ] Add CORS middleware for frontend
- [ ] Create 2 endpoints with mock data:
  - [ ] `GET /api/parks` - Return list of 10 parks
  - [ ] `GET /api/parks/{id}` - Return single park details
- [ ] Use hardcoded JSON data from `parks_mvp_seed.csv`
- [ ] Test endpoints with browser/curl

### 0:30-1:00 - Mock Data & Asset Prep (30 min)
- [ ] Convert parks CSV to JSON format
- [ ] Add mock gallery URLs (5 per park)
- [ ] Add mock satellite image URLs
- [ ] Create sample response structure:
  ```json
  {
    "id": 1,
    "name": "Grand Canyon",
    "coordinates": {"lat": 36.1069, "lon": -112.1129},
    "biome": "desert",
    "gallery": ["url1", "url2", "url3", "url4", "url5"],
    "satellite": "satellite_url"
  }
  ```
- [ ] Start uvicorn server on port 8000

---

## Hour 2: Frontend Foundation (1:00-2:00)

### 1:00-1:30 - Next.js Setup (30 min)
- [ ] Initialize Next.js in `parksphere/client` directory
- [ ] Install essential packages:
  ```bash
  npx create-next-app@latest client --typescript --tailwind --app
  cd client
  pnpm add @react-three/fiber @react-three/drei three
  ```
- [ ] Create basic layout with header
- [ ] Set up API_URL environment variable
- [ ] Test connection to backend

### 1:30-2:00 - Basic UI Components (30 min)
- [ ] Create park list page showing all 10 parks
- [ ] Build simple ParkCard component:
  - [ ] Park name
  - [ ] Biome type
  - [ ] Thumbnail image (placeholder)
- [ ] Add click handler to show park details
- [ ] Style with Tailwind (kid-friendly colors)
- [ ] Fetch data from backend API

---

## Hour 3: 3D Globe Implementation (2:00-3:00)

### 2:00-2:45 - 3D Globe Setup (45 min)
- [ ] Create Globe component with React Three Fiber
- [ ] Add basic sphere geometry for Earth
- [ ] Use simple blue color (no texture for speed)
- [ ] Add OrbitControls for rotation
- [ ] Place 10 markers at park coordinates:
  - [ ] Red spheres for park locations
  - [ ] Labels with park names
- [ ] Add click handler on markers
- [ ] Basic lighting setup

### 2:45-3:00 - Globe Interactions (15 min)
- [ ] Connect marker clicks to show park details
- [ ] Add hover effect (scale up marker)
- [ ] Auto-rotate globe when idle
- [ ] Ensure 60 FPS performance

---

## Hour 4: Integration & Polish (3:00-4:00)

### 3:00-3:30 - Feature Integration (30 min)
- [ ] Create split view: globe + park details
- [ ] Add photo gallery for selected park:
  - [ ] Use placeholder images from Unsplash
  - [ ] Horizontal scroll layout
- [ ] Add biome filter buttons
- [ ] Ensure all interactions work smoothly

### 3:30-4:00 - Demo Preparation (30 min)
- [ ] Fix any critical bugs
- [ ] Add "ParkSphere" branding
- [ ] Ensure kid-friendly styling:
  - [ ] Large fonts (18px+)
  - [ ] Bright colors
  - [ ] Fun park facts
- [ ] Test full user flow:
  - [ ] Load page → See globe → Click park → View details
- [ ] Prepare demo talking points

---

## 🚀 Hackathon Deliverables

### Must Have (Core Demo)
- ✓ Working FastAPI backend with park data
- ✓ Next.js frontend showing park list
- ✓ Interactive 3D globe with clickable markers
- ✓ Park detail view with basic info
- ✓ Responsive design that works on laptop

### Nice to Have (If Time Allows)
- [ ] Real images from Unsplash
- [ ] Smooth animations
- [ ] Biome filtering
- [ ] Photo gallery
- [ ] Sound effects on click
- [ ] Database integration
- [ ] Real data ingestion pipeline
- [ ] AI chat features

### Bonus (If Time Allows)

- [ ] 3D mascot


---

## 📊 Success Criteria

### Minimum Viable Demo
- [ ] Can load the application
- [ ] Can see 10 parks on globe
- [ ] Can click a park and see details
- [ ] No console errors
- [ ] Runs at 30+ FPS

### Stretch Goals
- [ ] Smooth 60 FPS performance
- [ ] Beautiful UI polish
- [ ] Multiple interaction types
- [ ] Mobile responsive

---

## 🔧 Quick Start Commands

```bash
# Terminal 1 - Backend
cd parksphere/server
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend  
cd parksphere/client
pnpm dev

# Open http://localhost:3000
```

---

## 💡 Hackathon Tips

1. **Start Simple**: Get a working demo first, polish later
2. **Mock Data**: Use hardcoded data to save time
3. **Skip Complex Features**: No auth, no database, no real APIs
4. **Focus on Demo**: Make it look good for presentation
5. **Test Often**: Check each feature works before moving on

---

## 📝 Presentation Points

1. **Problem**: Kids need engaging ways to learn about National Parks
2. **Solution**: Interactive 3D globe with park exploration
3. **Demo Flow**: 
   - Show spinning globe
   - Click on Grand Canyon
   - Show park details and photos
   - Highlight kid-friendly design
4. **Tech Stack**: FastAPI + Next.js + Three.js
5. **Future Vision**: All 63 parks, AI guide