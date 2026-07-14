#!/bin/bash

# Guised Up — Quick Start Script
# This script automates the local setup process

set -e  # Exit on error

echo "🚀 Guised Up Quick Start"
echo "======================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v php >/dev/null 2>&1 || { echo "❌ PHP not found. Install PHP 8.1+"; exit 1; }
command -v composer >/dev/null 2>&1 || { echo "❌ Composer not found. Install from https://getcomposer.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL not found. Install from https://postgresql.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 not found. Install Python 3.9+"; exit 1; }

echo "✅ All prerequisites found!"
echo ""

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env"
fi

# Install Composer dependencies
echo "📦 Installing Composer dependencies..."
composer install --quiet

# Install Python dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install -r requirements.txt -q 2>/dev/null || true

echo "✅ Backend setup complete!"
echo ""

# Mobile setup
echo "🔧 Setting up mobile..."
cd ../mobile

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env"
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install --silent

echo "✅ Mobile setup complete!"
echo ""

# Database setup
echo "💾 Database Setup Instructions:"
echo "================================"
echo ""
echo "1. Create PostgreSQL database:"
echo "   psql postgres"
echo "   CREATE DATABASE guised_up;"
echo "   CREATE USER guised_up_user WITH PASSWORD 'password';"
echo "   ALTER ROLE guised_up_user CREATEDB;"
echo "   GRANT ALL PRIVILEGES ON DATABASE guised_up TO guised_up_user;"
echo "   \\c guised_up"
echo "   CREATE EXTENSION IF NOT EXISTS vector;"
echo "   \\q"
echo ""
echo "2. Update backend/.env with database credentials:"
echo "   DB_DATABASE=guised_up"
echo "   DB_USERNAME=guised_up_user"
echo "   DB_PASSWORD=password"
echo ""
echo "3. Run migrations from backend directory:"
echo "   cd backend"
echo "   php artisan key:generate"
echo "   php artisan migrate --seed"
echo ""

# Start commands
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "Start Backend (from backend/ directory):"
echo "  1. php artisan serve"
echo "  2. python3 -m flask run --port=5000 (in another terminal)"
echo ""
echo "Start Mobile (from mobile/ directory):"
echo "  1. npx expo start"
echo "  2. Press 'i' for iOS or 'a' for Android"
echo ""
echo "Test API (in terminal):"
echo "  curl http://localhost:8000/api/health"
echo ""
echo "Full setup details in SETUP_GUIDE.md"
echo ""

echo "✨ Setup complete! Follow the steps above to start developing."
