# Guised Up API - Testing & Demo Script

## ✅ API Status: FULLY WORKING

All 4 required endpoints are implemented and tested.

## Start the API

```bash
python3 backend/api.py
```

Server runs on: `http://localhost:8000`

## Complete Test Workflow

### 1. Authentication
```bash
# Test login with user1
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@guised.up","password":"password"}'

# Response:
# {
#   "token": "d3ebc6fd-5916-4f96-aa4c-90d177a91138",
#   "user": {
#     "id": 1,
#     "email": "user1@guised.up",
#     "username": "User One"
#   }
# }

# Save token for next requests
export TOKEN="<paste_token_here>"
```

### 2. Get Feed (Personalized, Paginated)
```bash
curl -X GET "http://localhost:8000/api/feed?page=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Response: 10 seeded posts with:
# - authenticity_score (0.85-0.95)
# - view_count, reaction_count
# - created_at timestamps
# - pagination metadata
```

### 3. Create Post (Auto Authenticity Scoring)
```bash
curl -X POST http://localhost:8000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Just had coffee at a local café! ☕ Love these quiet moments.",
    "image_url": null
  }' | python3 -m json.tool

# Response: New post with:
# - id: 11
# - authenticity_score: 0.88
# - created_at: current timestamp
# - view_count: 0
# - reaction_count: 0
```

### 4. Search (Semantic)
```bash
# Search for posts mentioning "authentic" or "genuine"
curl -X GET "http://localhost:8000/api/search?q=authentic&limit=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Response: Filtered posts matching query
# - Query results ranked by relevance
# - Pagination metadata
# - Count of results
```

### 5. Log Interactions (Views, Reactions)
```bash
# Log a view interaction
curl -X POST http://localhost:8000/api/interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": 1,
    "interaction_type": "view"
  }' | python3 -m json.tool

# Log a reaction
curl -X POST http://localhost:8000/api/interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": 1,
    "interaction_type": "reaction"
  }'

# Log a reply
curl -X POST http://localhost:8000/api/interactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": 1,
    "interaction_type": "reply"
  }'
```

## Test Users

```
User 1: user1@guised.up / password
User 2: user2@guised.up / password
User 3: user3@guised.up / password
```

## Seeded Data

- 10 test posts across 3 users
- Authenticity scores: 0.87 - 0.95
- Created over last 20 hours
- Various view/reaction counts

## API Response Format

All endpoints return JSON:

```json
{
  "data": [...],           // Main response data
  "pagination": {          // If applicable
    "page": 1,
    "limit": 20,
    "total": 50,
    "has_more": true
  },
  "timestamp": "...",      // ISO 8601
  "error": null            // Error message if failed
}
```

## Error Handling

### Unauthorized (401)
```json
{"error": "Unauthorized"}
```

### Invalid Request (400)
```json
{"error": "Invalid request"}
```

## Implementation Notes

- ✅ All 4 endpoints working
- ✅ Authentication with tokens
- ✅ Paginated feed (20 per page)
- ✅ Authenticity scoring (0-1)
- ✅ Semantic search (keyword matching)
- ✅ Interaction tracking
- ✅ Error handling

## Next Steps for Production

1. Replace mock storage with PostgreSQL
2. Implement vector embeddings (pgvector or Weaviate)
3. Build frontend (React Native/Web)
4. Add caching layer (Redis)
5. Deploy to production

## Architecture

```
Request
  ↓
auth_tokens lookup
  ↓
Route to endpoint
  ↓
In-memory storage operations
  ↓
JSON response
```

All logic ready to scale to production with database backend.
