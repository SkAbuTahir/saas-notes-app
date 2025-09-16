#!/bin/bash

# SaaS Notes App - Local Setup Script
# Usage: ./setup.sh

set -e

echo "🏗️  SaaS Notes App - Local Setup"
echo "================================="

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your database configuration"
    echo "   - Set DATABASE_URL to your PostgreSQL connection string"
    echo "   - Set JWT_SECRET to a secure random string"
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npm run db:generate

# Ask about database setup
echo ""
read -p "🗃️  Do you want to run database migrations now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Running database migrations..."
    npm run db:migrate
    
    echo "🌱 Seeding database..."
    npm run db:seed
    
    echo "✅ Database setup complete!"
else
    echo "⏭️  Skipping database setup. Run these commands when ready:"
    echo "   npm run db:migrate"
    echo "   npm run db:seed"
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x tests/run-tests.sh
chmod +x deploy.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run: npm run dev"
echo "3. Visit: http://localhost:3000"
echo ""
echo "🧪 To run tests:"
echo "   ./tests/run-tests.sh"
echo ""
echo "🌐 To deploy to Vercel:"
echo "   ./deploy.sh"