# ParkSphere 🌍

An interactive 3D web application showcasing U.S. National Parks with immersive exploration features.

![ParkSphere](https://img.shields.io/badge/Next.js-14-black) ![Three.js](https://img.shields.io/badge/Three.js-WebGL-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd parksphere

# Install dependencies
cd client
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

# Generate static data (first time only)
cd ../scripts
npm install
npm run build:all

# Start development server
cd ../client
pnpm dev
```

Visit http://localhost:3000 to see the app.

## 🌟 Features

### Core Features
- **3D Interactive Globe**: WebGL-powered Earth visualization with smooth controls
- **Park Markers**: Color-coded by biome type with hover effects
- **Park Information**: Detailed panels with stats, activities, and galleries
- **Search & Filter**: Find parks by name, biome, or activities
- **AI Park Mascots**: Chat with unique mascots for each park (Groq LLM)
- **Trail Visualization**: Interactive 3D trail paths on the globe
- **Performance Optimized**: 60 FPS with adaptive quality settings

### Technical Features
- Static site generation with pre-built data
- WebGL 2.0 with custom shaders
- GPU instancing for efficient rendering
- Progressive texture loading
- Responsive design

## 🏗️ Architecture

```
parksphere/
├── client/                 # Next.js frontend application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── src/engine/        # 3D rendering engine
│   └── public/            # Static assets
├── scripts/               # Data pipeline scripts
│   └── data-pipeline/     # Build scripts for static data
└── docs/                  # Documentation
```

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript
- **3D Graphics**: Three.js, React Three Fiber, WebGL 2.0
- **Styling**: Tailwind CSS, Glassmorphism effects
- **AI Integration**: Groq LLM for mascot chat
- **Data**: Static JSON, pre-processed at build time

### Data Loading Strategy
- **Initial**: Static data generated at build time
- **Progressive Updates**: Optional background refresh respecting API rate limits
- **Rate Limits**: 50/hr (Unsplash), 100/hr (NPS), 30/hr (NASA)
- **Caching**: Local storage with 1-hour refresh intervals

## 📊 Data Pipeline

The app uses a build-time data pipeline to generate optimized static files:

```bash
cd scripts
npm run build:all
```

This generates:
- `/public/data/parks.json` - Park information with trails
- `/public/data/search-index.json` - Search indices
- `/public/data/parks/[id]/` - Park-specific assets
- `/public/images/` - Optimized images
- `/public/textures/` - Earth textures

## 🎮 Usage

### Navigation
- **Drag** to rotate the globe
- **Scroll** to zoom in/out
- **Click** park markers to view details
- **Cmd/Ctrl + K** to open search

### Features
- Use the **Filter** button to filter parks by biome or activities
- Click **View Trails** in park info to see trail visualization
- Chat with park mascots for personalized recommendations
- Toggle between photo and satellite views in galleries

## 🛠️ Development

### Environment Variables
```env
# Required for AI mascot chat
GROQ_API_KEY=your_groq_api_key

# Optional
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Available Scripts
```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server

# Data Pipeline (in scripts/)
npm run build:all      # Generate all static data
npm run build:parks    # Generate parks data only
npm run build:textures # Generate textures only

# Testing
pnpm test         # Run tests (when implemented)
pnpm lint         # Run ESLint
pnpm type-check   # TypeScript checking
```

### Project Structure
```
client/
├── app/
│   ├── page.tsx           # Main app page
│   ├── test/page.tsx      # Test dashboard
│   └── api/mascot/        # AI chat endpoint
├── components/
│   ├── RealisticEarthGlobe.tsx  # Main 3D globe
│   ├── ParkInfoPanel.tsx        # Park details
│   ├── SearchPanel.tsx          # Search UI
│   ├── FilterPanel.tsx          # Filter UI
│   ├── ParkMascot.tsx          # AI mascot chat
│   └── TrailVisualization.tsx   # 3D trails
└── src/engine/
    ├── GlobeEngine.ts           # Core 3D engine
    ├── GlobeRenderer.ts         # WebGL renderer
    └── ParkMarkers.ts           # Instanced markers
```

## 🎨 Customization

### Adding New Parks
1. Add park data to `scripts/data-pipeline/parks-data.json`
2. Run `npm run build:all` in scripts directory
3. Add mascot SVG to `public/mascots/`

### Modifying Biome Colors
Edit biome colors in `components/RealisticEarthGlobe.tsx`:
```typescript
const biomeColors = {
  'desert': { primary: '#ff8c00', secondary: '#ff6600' },
  'alpine': { primary: '#6495ed', secondary: '#4169e1' },
  // Add more...
};
```

## 🐛 Troubleshooting

### Common Issues

**"Loading parks data..." stuck**
- Check browser console for errors
- Verify `/public/data/parks.json` exists
- Clear browser cache and hard refresh

**404 errors for data files**
- Run `npm run build:all` in scripts directory
- Ensure files are in `public/data/`
- Restart dev server

**Mascot chat not working**
- Verify `GROQ_API_KEY` is set in `.env.local`
- Check API endpoint at `/api/mascot`

**Poor performance**
- Enable performance monitor at `/test`
- Lower quality settings in OptimizedGlobe
- Check GPU acceleration in browser

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- Report issues at: https://github.com/anthropics/claude-code/issues
- Documentation: `/test` page for system diagnostics

---

Built with ❤️ using Next.js and Three.js