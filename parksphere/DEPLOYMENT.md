# ParkSphere Deployment Guide

## Overview
ParkSphere is containerized and ready for deployment on Render. The application consists of:
- **Backend**: FastAPI server with SQLite databases
- **Frontend**: Next.js application with 3D globe visualization

## Prerequisites
- Docker installed locally (for testing)
- Render account
- Git repository with the code

## Local Testing with Docker

1. Build and run with docker-compose:
```bash
cd parksphere
docker-compose up --build
```

2. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Deployment to Render

### Method 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)

2. In Render Dashboard:
   - Click "New" → "Blueprint"
   - Connect your Git repository
   - Render will detect the `render.yaml` file
   - Review and deploy

3. Set environment variables in Render Dashboard:
   - `UNSPLASH_ACCESS_KEY` (optional - for image fetching)
   - `NASA_API_KEY` (optional - for satellite images)
   - `NPS_API_KEY` (optional - for park data)

### Method 2: Manual Deployment

#### Backend Deployment:
1. Create a new Web Service in Render
2. Connect your repository
3. Settings:
   - Root Directory: `parksphere/server`
   - Environment: Docker
   - Docker Path: `./Dockerfile`
   - Add environment variables as needed

#### Frontend Deployment:
1. Create another Web Service
2. Connect same repository
3. Settings:
   - Root Directory: `parksphere/client`
   - Environment: Docker
   - Docker Path: `./Dockerfile`
   - Environment Variable:
     - `NEXT_PUBLIC_API_URL`: Your backend service URL

## Important Notes

1. **Database**: The SQLite databases (`parks.db`, `world_parks.db`) are included in the Docker image
2. **Textures**: Earth textures are included in the frontend public folder
3. **CORS**: The backend is configured to accept requests from any origin
4. **Health Check**: Backend has `/api/health` endpoint for monitoring

## Environment Variables

### Backend (Optional):
- `UNSPLASH_ACCESS_KEY`: For fetching park images
- `NASA_API_KEY`: For satellite imagery
- `NPS_API_KEY`: For National Park Service data

### Frontend:
- `NEXT_PUBLIC_API_URL`: Backend API URL (automatically set in Dockerfile)

## Scaling Considerations

- The SQLite database is suitable for read-heavy workloads
- For production with heavy traffic, consider:
  - Using PostgreSQL instead of SQLite
  - Adding Redis for caching
  - Using a CDN for static assets

## Troubleshooting

1. **Frontend can't connect to backend**:
   - Verify `NEXT_PUBLIC_API_URL` is correct
   - Check CORS settings in backend

2. **Missing textures**:
   - Ensure public folder is properly copied in Dockerfile
   - Check browser console for 404 errors

3. **Slow initial load**:
   - Normal due to texture loading
   - Consider implementing progressive loading