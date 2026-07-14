# Guised Up — Complete Setup Guide

## Overview

This guide provides step-by-step instructions to run the complete Guised Up application locally:
- Backend: Laravel API + Python embedding service
- Frontend: React Native mobile app
- Database: PostgreSQL with pgvector
- Vector DB: pgvector (built into PostgreSQL)

## Prerequisites

- **Node.js** 18+
- **PHP** 8.1+
- **Python** 3.9+
- **PostgreSQL** 14+ with pgvector extension
- **Composer** (PHP dependency manager)
- **npm** or **yarn** (Node package manager)

### Installation on macOS (using Homebrew)

```bash
# Update Homebrew
brew update

# Install PHP
brew install php@8.1
brew install composer

# Install Node.js
brew install node

# Install PostgreSQL with pgvector
brew install postgresql@15
brew install pgvector
```

### Installation on Linux (Ubuntu/Debian)

```bash
# PHP
sudo apt-get install php8.1 php8.1-fpm composer

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo apt-get install postgresql-15-pgvector
```

---

## Database Setup

### 1. Start PostgreSQL

**macOS:**
```bash
brew services start postgresql@15
```

**Linux:**
```bash
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE guised_up;

# Create user
CREATE USER guised_up_user WITH PASSWORD 'secure_password';

# Grant privileges
ALTER ROLE guised_up_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE guised_up TO guised_up_user;

# Enable pgvector extension
\c guised_up
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

### 3. Verify Setup

```bash
psql -U guised_up_user -d guised_up -c "SELECT 1"
```

---

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd /Users/nehachauhan/Desktop/programming/assignment.3/backend
```

### 2. Install PHP Dependencies

```bash
composer install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=guised_up
DB_USERNAME=guised_up_user
DB_PASSWORD=secure_password

# Embeddings
EMBEDDINGS_SERVICE=local
OPENAI_API_KEY=  # Leave empty to use local embeddings
```

### 4. Generate Application Key

```bash
php artisan key:generate
```

### 5. Run Migrations

```bash
php artisan migrate --seed
```

This creates all tables and seeds 2 test users.

### 6. Start Python Embedding Service (in new terminal)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start Flask service
python -m flask run --port=5000
```

Output should show:
```
 * Running on http://127.0.0.1:5000
```

### 7. Start Laravel Development Server (in new terminal)

```bash
php artisan serve
```

Output:
```
Laravel development server started on [http://127.0.0.1:8000]
```

---

## Mobile Setup

### 1. Navigate to Mobile Directory

```bash
cd /Users/nehachauhan/Desktop/programming/assignment.3/mobile
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (if needed)

```bash
cp .env.example .env
```

Default API URL is `http://localhost:8000` which should work for local development.

### 4. Start Development Server

**For Expo (recommended):**
```bash
npx expo start --clear
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web

**For React Native CLI:**
```bash
npm start
```

Then in another terminal:
```bash
npm run ios    # or npm run android
```

---

## Testing the Application

### 1. Verify Backend API

```bash
# Health check
curl http://localhost:8000/api/health

# Login (should succeed with seeded user)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@guised.up",
    "password": "password"
  }'

# Response should include a token
```

### 2. Create Test Post

```bash
TOKEN="<token_from_login_response>"

curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Testing the Real Connections Feed!",
    "image_url": "https://via.placeholder.com/400"
  }'
```

### 3. Fetch Feed

```bash
curl -X GET "http://localhost:8000/api/feed?page=1" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Semantic Search

```bash
curl -X GET "http://localhost:8000/api/search?q=testing" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Open Mobile App

Once Expo/React Native is running, the app should:
1. Automatically connect to the backend
2. Login with test user credentials
3. Display the personalized feed
4. Allow search and interactions

---

## Database Queries

### View All Posts

```bash
psql -U guised_up_user -d guised_up

SELECT id, username, text, created_at FROM posts JOIN users ON posts.user_id = users.id;
```

### Run SQL Challenge Queries

```bash
psql -U guised_up_user -d guised_up < sql/queries.sql
```

---

## Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
php artisan serve --port=8001
# Update mobile app API URL accordingly
```

**Database connection error:**
```bash
# Verify PostgreSQL is running
psql -U guised_up_user -d guised_up -c "SELECT 1"

# Check .env database credentials
cat .env | grep DB_
```

**Migration fails:**
```bash
# Rollback and retry
php artisan migrate:reset
php artisan migrate --seed
```

**pgvector not found:**
```bash
# Reconnect and enable extension
psql -d guised_up -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Mobile Issues

**"Cannot connect to backend" error:**
- Verify Laravel server is running: `http://localhost:8000/api/health`
- Check mobile `.env` has correct API_BASE_URL
- On Android emulator, use `http://10.0.2.2:8000` instead of `localhost`

**"Failed to authenticate" error:**
- Check test user exists: `psql -U guised_up_user -d guised_up -c "SELECT * FROM users;"`
- Verify migrations ran: `php artisan migrate:status`
- Check Laravel logs: `tail -f storage/logs/laravel.log`

**Slow search/feed loading:**
- Check if Python embedding service is running
- Verify pgvector index exists: `\d post_embeddings` in psql
- Check database query performance: run EXPLAIN ANALYZE on feed query

### Python Service Issues

**"Module not found" error:**
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

**Embedding timeout:**
- Check memory: `free -h` (Linux) or `vm_stat` (macOS)
- Increase timeout in .env: `API_TIMEOUT=20000`
- Pre-compute embeddings for first 100 posts

---

## Project Structure Reference

```
assignment.3/
├── backend/                    # Laravel API
│   ├── app/
│   ├── database/
│   │   └── migrations/
│   ├── routes/
│   ├── .env.example
│   ├── composer.json
│   └── requirements.txt
├── mobile/                     # React Native
│   ├── src/
│   │   └── screens/
│   │       └── FeedScreen.tsx
│   ├── App.tsx
│   ├── package.json
│   └── .env.example
├── docs/
│   └── TSD.md                 # Technical Solution Document
├── sql/
│   └── queries.sql            # SQL Challenge Queries
├── README.md                  # Project Overview
└── SETUP_GUIDE.md             # This file
```

---

## Running Tests

### Backend Unit Tests

```bash
cd backend
php artisan test

# Specific test file
php artisan test tests/Feature/FeedTest.php
```

### SQL Query Tests

```bash
# Run against local database
psql -U guised_up_user -d guised_up < sql/queries.sql
```

---

## Making a Demonstration Video

### What to Show

1. **Feed Loading**: Infinite scroll through posts
2. **Search**: Type "travel" or similar, show semantic results
3. **Interactions**: React to a post, show relationship depth updating
4. **Ranking**: Explain how authenticity + relationship depth affects order
5. **Backend**: Show API response in browser dev tools

### Using Simple Tools

**macOS:**
```bash
# Record screen with QuickTime
# File > New Screen Recording
# Stop with Cmd+Ctrl+Esc
```

**Linux:**
```bash
# Using built-in recorder
gnome-screenshot --interactive
```

**Any OS:**
- Use browser dev tools (F12) → Network tab to show API calls
- Slow down network (DevTools → Network) to demonstrate loading states

---

## Next Steps

1. ✅ Complete database setup
2. ✅ Start backend API server
3. ✅ Start Python embedding service
4. ✅ Start mobile app
5. ✅ Test endpoints manually
6. ✅ Record demonstration video
7. 📝 Push to GitHub repo: `Guised Up-assessment-[yourname]`

---

## Support & Contact

For blockers or questions:
- Check error logs: `storage/logs/laravel.log`
- Verify all services running: `ps aux | grep -E 'artisan|flask|node'`
- Review TSD for architecture context: `/docs/TSD.md`

Good luck! 🚀
