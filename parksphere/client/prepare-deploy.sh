#!/bin/bash

echo "🚀 Preparing ParkSphere for Vercel deployment..."

# Check if required files exist
echo "✓ Checking configuration files..."
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Check for environment variables
echo "✓ Checking environment setup..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Make sure to set environment variables in Vercel dashboard."
fi

# Build the project
echo "✓ Running production build..."
pnpm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

# Check build output
echo "✓ Verifying build output..."
if [ -d ".next" ]; then
    echo "✅ Build output verified"
else
    echo "❌ Build output not found!"
    exit 1
fi

echo "
✨ ParkSphere is ready for deployment!

Next steps:
1. Commit all changes: git add . && git commit -m 'Prepare for Vercel deployment'
2. Push to repository: git push origin main
3. Deploy with Vercel CLI: vercel
   OR
   Connect repository at: https://vercel.com/new

Remember to set environment variables in Vercel dashboard!
"