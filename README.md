# Guised Up — Real Connections Feed

A full-stack social platform showcasing an authenticity-first feed ranking system powered by vector embeddings and semantic search.

## Project Structure

```
.
├── backend/               # Laravel PHP + Python backend
│   ├── app/              # Laravel application code
│   ├── database/
│   │   └── migrations/   # Database migrations
│   ├── routes/
│   ├── .env.example      # Environment variables template
│   └── requirements.txt   # Python dependencies
├── mobile/               # React Native frontend
│   ├── src/
│   │   ├── screens/      # Screen components
│   │   ├── components/   # Reusable components
│   │   └── utils/        # Utilities
│   ├── App.tsx
│   └── package.json
├── docs/                 # Documentation
│   └── TSD.md           # Technical Solution Document
├── sql/                  # SQL queries
│   └── queries.sql      # Challenge queries
└── README.md            # This file
```

## Features Implemented

### Part A: Technical Solution Document
- System architecture with vector DB integration
- Database schema with relationship depth tracking
- Ranking algorithm combining authenticity, relationships, semantic similarity, and recency
- Vector embedding strategy using pgvector / Weaviate

### Part B: Backend API Endpoints
- `POST /api/posts` — Create post with auto-generated embeddings
- `GET /api/feed` — Personalized feed with ranking logic
- `GET /api/search?q={query}` — Natural language semantic search
- `POST /api/interactions` — Track user interactions for relationship depth

### Part C: React Native Feed Screen
- Paginated feed display with infinite scroll
- Search bar with inline results
- Post cards with authenticity metrics
- Loading, empty, and error state handling

### Part D: SQL Queries
- D1: Top active users
- D2: Interaction-based post filtering
- D3: Anomaly detection (high views, zero reactions)
- D4: Spam detection (high post frequency)

## Quick Start

### Run the API (Python Flask)

```bash
# Install dependencies
pip install flask

# Start API server
python3 backend/api.py

# API will be available at http://localhost:8000
```

### Test All Endpoints

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@guised.up","password":"password"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# 2. Get feed
curl -X GET "http://localhost:8000/api/feed?page=1" \
  -H "Authorization: Bearer $TOKEN"

# 3. Create post
curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"My authentic moment!","image_url":null}'

# 4. Search
curl -X GET "http://localhost:8000/api/search?q=authentic" \
  -H "Authorization: Bearer $TOKEN"

# 5. Log interaction
curl -X POST http://localhost:8000/api/interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"post_id":1,"interaction_type":"view"}'
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL (optional, for production)

### Backend Setup (Production - Laravel)

```bash
cd backend

# Install PHP dependencies
composer install

# Install Python dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate --seed

# Start server
php artisan serve
```

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# For iOS
npx pod-install

# Start Expo development server
npx expo start

# Or for React Native CLI
npm start
```

## Environment Variables

Create `.env` files based on `.env.example` templates:

### Backend (.env)
```
APP_NAME=GuisedUp
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=guised_up
DB_USERNAME=postgres
DB_PASSWORD=

# Vector DB
VECTOR_DB_TYPE=weaviate  # or pgvector, pinecone, qdrant
VECTOR_DB_URL=http://localhost:8080

# Embeddings
EMBEDDING_MODEL=sentence-transformers  # or openai
OPENAI_API_KEY=
```

## Running Tests

```bash
cd backend

# Run all tests
php artisan test

# Run specific test
php artisan test --filter=FeedRankingTest
```

## API Documentation

### Authentication
All endpoints (except POST /api/auth/login) require Laravel Sanctum token:
```
Authorization: Bearer {token}
```

### Example Requests

#### Create Post
```bash
curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Just had an amazing coffee",
    "image_url": "https://example.com/coffee.jpg"
  }'
```

#### Get Feed
```bash
curl -X GET "http://localhost:8000/api/feed?page=1" \
  -H "Authorization: Bearer token"
```

#### Search
```bash
curl -X GET "http://localhost:8000/api/search?q=funny%20travel%20stories" \
  -H "Authorization: Bearer token"
```

#### Log Interaction
```bash
curl -X POST http://localhost:8000/api/interactions \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": 1,
    "interaction_type": "view"
  }'
```

## Database Schema

Key tables:
- `users` — User accounts
- `posts` — Post content with authenticity metrics
- `post_embeddings` — Vector embeddings for semantic search
- `interactions` — User interactions (views, replies, reactions)
- `relationships` — Relationship depth tracking
- `authenticity_scores` — Computed authenticity metrics

See `/sql/queries.sql` for full schema and test queries.

## AI Tools Used

This project was built with:
- **Claude Code** — Architecture planning, API design, database schema
- **GitHub Copilot** — Rapid boilerplate generation, code completion
- **Cursor** — Full-stack development with AI assistance

See `docs/TSD.md` for detailed explanation of AI-augmented workflow.

## Performance Considerations

- **Feed Ranking:** Composite score combining four weighted signals
- **Vector Search:** Efficient semantic search with pgvector or Weaviate
- **Pagination:** 20 posts per page with cursor-based pagination
- **Caching:** Redis caching for popular posts and user relationships
- **Indexes:** Optimized SQL indexes on created_at, user_id, interaction timestamps

## Trade-offs & Assumptions

1. **Vector DB Choice:** Using pgvector for simplicity vs. dedicated vector DB for scale
2. **Authenticity Scoring:** Simplified signals (filters, image polish) vs. ML model
3. **Mock Embeddings:** Can replace with OpenAI/Hugging Face on production
4. **Relationship Depth:** Interaction count as proxy vs. engagement duration

See `docs/TSD.md` for full analysis.

## Partial Implementation Notes

[If applicable, document what was completed and what ran out of time]

## Submission

- **GitHub Repo:** `Guised Up-assessment-[name]`
- **TSD:** See `/docs/TSD.md`
- **SQL Queries:** See `/sql/queries.sql`
- **Video Demo:** [Link to explanation video]

## License

Confidential — Guised Up © 2026
