# Deploying ParkSphere to Vercel

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Prepare the Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Configure Environment Variables

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables:

```
NEXT_PUBLIC_API_URL=https://your-api-url.com
GROQ_API_KEY=your_groq_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
UNSPLASH_SECRET_KEY=your_unsplash_secret_key
UNSPLASH_APPLICATION_ID=your_unsplash_app_id
NASA_API_KEY=your_nasa_api_key
NPS_API_KEY=your_nps_api_key
```

### 3. Deploy via Vercel CLI

```bash
cd parksphere/client

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow the prompts:
# - Link to existing project? No
# - What's your project's name? parksphere
# - In which directory is your code located? ./
# - Want to override the settings? No
```

### 4. Deploy via Git Integration (Recommended)

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `parksphere/client`
   - Build Command: `pnpm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
4. Add environment variables
5. Click "Deploy"

### 5. Production Build Locally (Testing)

```bash
# Test the production build locally
pnpm run build
pnpm run start
```

## Post-Deployment

### Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Performance Optimizations

The app is already optimized for Vercel with:
- Static asset optimization
- API route caching (30s max duration)
- Image optimization disabled (using external CDNs)
- Edge runtime compatible

### Monitoring

1. Check Function logs for API errors
2. Monitor Analytics for performance metrics
3. Set up alerts for function errors

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in package.json
3. Verify environment variables are set

### API Routes Not Working

1. Check function logs
2. Verify API keys are correctly set
3. Ensure CORS is properly configured

### Static Assets Not Loading

1. Verify files are in `/public` directory
2. Check `.vercelignore` isn't excluding needed files
3. Ensure file paths are correct (case-sensitive)

## Continuous Deployment

Every push to the main branch will trigger a new deployment automatically.

For preview deployments:
- Create a pull request
- Vercel will create a preview URL
- Test changes before merging

## Environment-Specific Settings

```javascript
// Detect Vercel environment
const isVercel = process.env.VERCEL === '1'
const isProd = process.env.NODE_ENV === 'production'
```

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js on Vercel: https://vercel.com/docs/frameworks/nextjs
- Support: https://vercel.com/support