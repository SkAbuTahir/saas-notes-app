#!/bin/bash

# SaaS Notes App - One-Command Deployment Script for Vercel
# Usage: ./deploy.sh

set -e

echo "🚀 SaaS Notes App - Deployment Script"
echo "======================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged into Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔑 Please log in to Vercel:"
    vercel login
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "1. Ensure you have a PostgreSQL database ready"
echo "2. Have your JWT_SECRET prepared"
echo "3. Your code is committed to Git"
echo ""

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

# Get the deployment URL
DEPLOYMENT_URL=$(vercel ls --limit=1 | grep -E "https://.*\.vercel\.app" | awk '{print $2}' | head -1)

if [ -z "$DEPLOYMENT_URL" ]; then
    echo "❌ Could not get deployment URL. Please check manually."
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo "🌐 URL: $DEPLOYMENT_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - DATABASE_URL (your PostgreSQL connection string)"
echo "   - JWT_SECRET (a secure random string)"
echo "   - NEXT_PUBLIC_API_BASE_URL ($DEPLOYMENT_URL)"
echo ""
echo "2. After setting env vars, run database setup:"
echo "   vercel env pull .env.local"
echo "   npx prisma migrate deploy"
echo "   npx prisma db seed"
echo ""
echo "3. Test your deployment:"
echo "   API_BASE_URL=$DEPLOYMENT_URL ./tests/run-tests.sh"
echo ""
echo "📖 Visit: $DEPLOYMENT_URL"