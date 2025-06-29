# Deploying ParkSphere to Vercel

## Environment Variables Setup

When deploying to Vercel, you need to set the following environment variables in your Vercel project settings:

### Required:
- `GROQ_API_KEY` - Your Groq API key for AI features

### Optional (for full functionality):
- `UNSPLASH_ACCESS_KEY` - For fetching park images
- `NASA_API_KEY` - For satellite imagery
- `NPS_API_KEY` - For National Park Service data

## Deployment Steps:

1. **Import Repository in Vercel**:
   - Go to https://vercel.com/new
   - Import your repository
   - Vercel will automatically detect the Next.js framework

2. **Configure Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the required variables listed above
   - ⚠️ Do NOT prefix them with `NEXT_PUBLIC_` unless they need to be exposed to the client

3. **Deploy**:
   - Vercel will automatically:
     - Use the settings from `vercel.json`
     - Install dependencies with pnpm
     - Build the project
     - Deploy to production

## Important Notes:

- The app uses server-side API routes that securely access environment variables
- Environment variables without `NEXT_PUBLIC_` prefix are only available on the server
- The `vercel.json` file in the root handles all deployment configuration
- The build will succeed even without optional API keys, but some features may be limited

## Verifying Deployment:

After deployment:
1. Check the `/test` page to verify all systems are working
2. Test the AI mascot chat functionality
3. Verify park data is loading correctly

## Troubleshooting:

If environment variables aren't working:
1. Ensure they're added in Vercel's project settings (not in vercel.json)
2. Redeploy after adding/changing environment variables
3. Check the function logs in Vercel dashboard for any errors