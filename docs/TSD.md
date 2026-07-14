# Technical Solution Document — Real Connections Feed

## Executive Summary

The Real Connections Feed is a personalized content ranking system that moves away from engagement-driven algorithms (likes, shares, comments) toward authenticity-driven discovery. This document outlines the technical architecture, database design, vector embedding strategy, API design, and ranking algorithm.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                         │
│  (Feed Screen, Search, Infinite Scroll, Post Cards)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/REST (Sanctum Token Auth)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Laravel PHP API Layer                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │ POST /api/posts                                    │    │
│  │ GET /api/feed (with ranking logic)                │    │
│  │ GET /api/search (semantic search)                 │    │
│  │ POST /api/interactions (relationship tracking)    │    │
│  └────────────────────────────────────────────────────┘    │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
    ┌──────▼────────┐          ┌──────────▼─────────┐
    │  PostgreSQL   │          │  Python Service   │
    │  (Main DB)    │          │ (Embeddings Gen)  │
    │               │          │                   │
    │ • users       │          │ sentence-trans    │
    │ • posts       │          │ formers lib       │
    │ • interactions│          │                   │
    │ • relationships│         └──────────┬────────┘
    │ • authenticity│                    │
    │                                     │
    │ pgvector      │          ┌──────────▼─────────┐
    │ extension     │◄─────────│  Vector DB         │
    │ (embeddings)  │          │  (pgvector)        │
    │               │          │                    │
    └───────────────┘          │ Stores 384-dim     │
                               │ embeddings for     │
                               │ semantic search    │
                               └────────────────────┘
```

### Data Flow

1. **Post Creation**: User posts → Laravel API → Python embedding service → generate embedding → store in pgvector
2. **Feed Request**: User requests feed → Laravel fetches posts + calculates composite ranking score → returns top 20
3. **Search**: User enters natural language query → Python generates embedding → pgvector similarity search → returns results
4. **Interactions**: User views/reacts → Laravel logs interaction → updates relationship depth scores

---

## 2. Database Schema Design

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `posts`
```sql
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  image_url VARCHAR(255),
  
  -- Authenticity signals
  has_filters BOOLEAN DEFAULT false,
  image_polish_score FLOAT DEFAULT 0.5,  -- 0-1, lower is more authentic
  text_authenticity FLOAT DEFAULT 0.7,   -- 0-1, based on language analysis
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

#### `post_embeddings`
```sql
CREATE TABLE post_embeddings (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  embedding vector(384),  -- Using pgvector with 384-dim embeddings
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_post_embedding (post_id)
);

-- Create index for similarity search
CREATE INDEX idx_post_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops);
```

#### `interactions`
```sql
CREATE TABLE interactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  post_id BIGINT NOT NULL REFERENCES posts(id),
  interaction_type ENUM('view', 'reply', 'reaction') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_post (user_id, post_id),
  INDEX idx_user_created (user_id, created_at)
);
```

#### `relationships`
```sql
CREATE TABLE relationships (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  related_user_id BIGINT NOT NULL REFERENCES users(id),
  interaction_count INT DEFAULT 0,
  last_interaction TIMESTAMP,
  relationship_depth FLOAT DEFAULT 0.0,  -- 0-1 score
  
  UNIQUE INDEX idx_relationship (user_id, related_user_id),
  INDEX idx_depth (relationship_depth)
);
```

#### `authenticity_scores`
```sql
CREATE TABLE authenticity_scores (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id),
  filter_score FLOAT DEFAULT 1.0,        -- 1 = no filters, 0 = heavy filters
  polish_score FLOAT DEFAULT 0.5,        -- Image quality/editing
  text_score FLOAT DEFAULT 0.7,          -- Language genuineness
  composite_score FLOAT DEFAULT 0.7,     -- Weighted average
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE INDEX idx_post_authenticity (post_id)
);
```

### Relationships

```
users (1) ──── (M) posts
users (1) ──── (M) interactions
posts (1) ──── (1) post_embeddings
posts (1) ──── (M) interactions
posts (1) ──── (1) authenticity_scores
users (M) ──── (M) relationships
```

### Indexing Strategy

- **posts.created_at**: Fast time-based filtering
- **posts.user_id**: Quick user content lookup
- **interactions (user_id, post_id)**: Efficient relationship building
- **post_embeddings.embedding (HNSW)**: Fast vector similarity search
- **relationships.relationship_depth**: Sorting by relationship strength

---

## 3. Vector Embeddings & Semantic Search

### Choice: PostgreSQL + pgvector

**Why pgvector:**
- Eliminates operational complexity of separate vector DB
- Leverages existing PostgreSQL infrastructure
- HNSW index provides competitive performance (< 100ms for similarity search on 100K posts)
- Atomic transactions (post creation + embedding storage in one transaction)
- Cost-efficient (no additional service to maintain)

**Alternative considered:** Weaviate (standalone vector DB)
- Pros: Specialized vector search, built-in reranking, multi-tenancy
- Cons: Additional infrastructure, separate API, sync complexity
- Verdict: For MVP, pgvector sufficient; migrate to Weaviate at scale

### Embedding Strategy

**Model:** `sentence-transformers/all-MiniLM-L6-v2`
- 384-dimensional embeddings
- Fast inference (~50ms per post)
- Open-source (no API costs)
- Pre-trained on semantic similarity tasks

**Process:**
1. When post created: concatenate `text + hashtags` → feed to embedding model → store in pgvector
2. When user searches: embed query → similarity search (cosine distance) → return top 10

**Pseudocode:**
```python
def embed_post(post_text: str) -> np.ndarray:
    """Generate 384-dim embedding for post"""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    return model.encode(post_text, convert_to_tensor=True).numpy()

def search_posts(query: str, user_id: int, limit: int = 10) -> List[Post]:
    """Semantic search with filtering"""
    query_embedding = embed_post(query)
    results = db.query("""
        SELECT p.* FROM posts p
        JOIN post_embeddings pe ON p.id = pe.post_id
        WHERE pe.embedding <-> %s < 0.5  -- cosine distance threshold
        ORDER BY pe.embedding <-> %s
        LIMIT %s
    """, [query_embedding, query_embedding, limit])
    return results
```

---

## 4. API Design

### Authentication
- **Method**: Laravel Sanctum (token-based)
- **Flow**: Login → receive token → include in `Authorization: Bearer {token}` header
- **Test Users**: Seeded in migrations (email: `user1@guised.up`, password: `password`)

### Endpoints

#### POST /api/posts
**Purpose**: Create a new post
**Auth**: Required (Bearer token)
**Request**:
```json
{
  "text": "Just finished a 10km run!",
  "image_url": "https://example.com/run.jpg"
}
```
**Response** (201):
```json
{
  "id": 1,
  "user_id": 5,
  "text": "Just finished a 10km run!",
  "image_url": "https://example.com/run.jpg",
  "authenticity_score": 0.82,
  "created_at": "2026-07-14T10:30:00Z"
}
```
**Side Effects**: 
- Generate and store vector embedding
- Calculate authenticity scores
- Trigger async indexing for search

---

#### GET /api/feed?page=1&limit=20
**Purpose**: Return personalized feed for authenticated user
**Auth**: Required
**Response** (200):
```json
{
  "data": [
    {
      "id": 42,
      "user_id": 3,
      "username": "sarah_adventure",
      "avatar_url": "...",
      "text": "Found this hidden cafe in old Delhi",
      "image_url": "...",
      "time_ago": "2 hours ago",
      "authenticity_score": 0.91,
      "ranking_score": 0.87,
      "interaction_count": 23,
      "user_has_interacted": true
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "has_next": true
  }
}
```
**Ranking**: See Section 5 (Feed Ranking Algorithm)

---

#### GET /api/search?q=funny+travel+stories&limit=10
**Purpose**: Natural language semantic search
**Auth**: Required
**Response** (200):
```json
{
  "data": [
    {
      "id": 17,
      "user_id": 2,
      "username": "james_travel",
      "text": "Accidentally ordered a whole goat at the Bangkok market...",
      "similarity_score": 0.89,
      "created_at": "2026-07-12T14:22:00Z"
    }
  ]
}
```

---

#### POST /api/interactions
**Purpose**: Log user interaction (for relationship depth)
**Auth**: Required
**Request**:
```json
{
  "post_id": 42,
  "interaction_type": "view"  // "view", "reply", or "reaction"
}
```
**Response** (201):
```json
{
  "id": 1001,
  "user_id": 5,
  "post_id": 42,
  "interaction_type": "view",
  "created_at": "2026-07-14T10:35:00Z"
}
```
**Side Effects**:
- Increment interaction count for user pair
- Update relationship_depth score
- Log for analytics

---

## 5. Feed Ranking Algorithm

### Plain English Explanation

The feed is ranked by a **composite score** combining four signals:

1. **Authenticity Score (40% weight)**
   - Posts with fewer filters, less-polished images, and genuine language rank higher
   - Score ranges 0-1 (1 = highly authentic)
   - Derived from image metadata, text analysis, and community feedback

2. **Relationship Depth (30% weight)**
   - Posts from users you genuinely interact with (view, reply, react) rank higher
   - Tracks cumulative interaction count between two users
   - Friends' posts surface before strangers' posts
   - Decays over time (recent interactions weighted higher)

3. **Semantic Relevance (15% weight)**
   - Posts semantically similar to your past interactions surface higher
   - Uses vector embeddings to understand topic preferences
   - If you often interact with travel content, travel posts rank higher

4. **Recency (15% weight)**
   - Newer posts preferred, but not at expense of relevance
   - Time decay factor: `decay(age) = e^(-age_hours / 72)`
   - A 3-day-old highly relevant post outranks a 1-hour-old irrelevant post

### Pseudocode

```python
def calculate_feed_ranking_score(
    post: Post,
    user: User,
    user_interactions: List[Interaction],
    all_user_topics: List[str]
) -> float:
    """
    Calculate composite ranking score for a post in a user's feed.
    
    Returns: Score 0-1 (higher = should rank higher)
    """
    
    # 1. Authenticity Score (40%)
    authenticity = post.authenticity_score  # Already precomputed
    
    # 2. Relationship Depth (30%)
    # Count interactions between user and post author in last 30 days
    interaction_count = count_recent_interactions(
        user.id, 
        post.user_id, 
        days=30
    )
    # Convert count to 0-1 score (sigmoid function)
    relationship_depth = sigmoid(interaction_count, midpoint=5)
    
    # 3. Semantic Relevance (15%)
    # Calculate cosine similarity between post embedding and user's preference embedding
    user_preference_embedding = compute_user_topic_preference(user.id)
    semantic_similarity = cosine_similarity(
        post.embedding,
        user_preference_embedding
    )
    
    # 4. Recency (15%)
    hours_old = (now() - post.created_at).total_seconds() / 3600
    recency = math.exp(-hours_old / 72)  # Decay over 72 hours
    
    # Composite score (weighted sum)
    composite = (
        0.40 * authenticity +
        0.30 * relationship_depth +
        0.15 * semantic_similarity +
        0.15 * recency
    )
    
    return composite


def sigmoid(x: float, midpoint: float = 5.0, steepness: float = 0.5) -> float:
    """Smooth 0-1 curve. At midpoint, returns 0.5."""
    return 1 / (1 + math.exp(-steepness * (x - midpoint)))


def compute_user_topic_preference(user_id: int) -> np.ndarray:
    """
    Average embedding of posts user has interacted with.
    Represents user's semantic topic preference.
    """
    recent_interactions = db.query("""
        SELECT pe.embedding FROM interactions i
        JOIN post_embeddings pe ON i.post_id = pe.post_id
        WHERE i.user_id = %s
          AND i.created_at > now() - interval '30 days'
        ORDER BY i.created_at DESC
        LIMIT 50
    """, [user_id])
    
    embeddings = [row['embedding'] for row in recent_interactions]
    return np.mean(embeddings, axis=0) if embeddings else default_embedding()
```

### Algorithm Flow in GET /api/feed

```
1. Fetch posts from users (excluding blocked, filtered by recency)
2. For each post, calculate ranking score using function above
3. Sort by ranking score (descending)
4. Apply pagination (offset, limit 20)
5. Return with interaction counts, user relationship signals
6. Frontend loads next page when user reaches bottom (infinite scroll)
```

---

## 6. AI Tools Used & Workflow

### Claude Code
**How Used:**
- Initial architecture brainstorming (system design diagram)
- Database schema optimization (indexing strategy, query planning)
- API endpoint specification (request/response contracts)
- Feed ranking algorithm design (weighting decisions, pseudocode)
- Documentation (TSD, README, code comments)

**Time Saved:** ~2 hours of design thinking + architecture review

### GitHub Copilot (In Cursor)
**How Used:**
- Laravel migration file generation (90% faster than manual writing)
- React Native component scaffolding (FlatList, SearchBar, Card components)
- SQL query writing (D1-D4 challenges)
- Test file boilerplate
- Repetitive API endpoint handlers

**Time Saved:** ~1.5 hours of repetitive coding

### Cursor IDE
**How Used:**
- Multi-file editing (jump between schema, migrations, API routes)
- AI-assisted debugging (error message analysis)
- Code completion for framework-specific patterns (Eloquent, React Native)
- Full-file generation from outline comments

**Time Saved:** ~1 hour of manual context switching + IDE navigation

### Why These Tools Mattered
- **Speed**: Reached 80%+ efficiency by letting AI handle boilerplate
- **Accuracy**: Schema design reviewed by AI before implementation
- **Iteration**: Quick pivots on algorithm weights, embedding choice
- **Confidence**: AI verification of SQL correctness, API design

**Honest Assessment:** Without these tools, this project would take 12-16 hours solo. With tools, achievable in 8.

---

## 7. Trade-offs & Assumptions

### Trade-off 1: Authenticity Scoring
**What We Did:** Simplified signals (image metadata, text analysis)
**Alternative:** Train ML model on manual authenticity labels
**Why:** Time constraint + data scarcity. Simplified approach sufficient for MVP.
**Migration Path:** Collect user feedback on authenticity → train classifier later

### Trade-off 2: Vector DB Choice
**What We Did:** PostgreSQL + pgvector (single database)
**Alternative:** Weaviate (dedicated vector search service)
**Why:** Operational simplicity + cost. Scales to ~1M posts before migration needed.
**When to Reconsider:** At 10M+ posts, latency > 200ms, or need cross-database sync

### Trade-off 3: Embeddings
**What We Did:** Sentence-transformers (local, open-source)
**Alternative:** OpenAI embeddings API
**Why:** Cost control + no API dependency + fast iteration
**Production Note:** Can swap to OpenAI for better quality (use adapter pattern)

### Trade-off 4: Relationship Depth
**What We Did:** Simple interaction count with time decay
**Alternative:** Graph-based relationship scoring (PageRank-style)
**Why:** Simpler to compute, good enough for MVP
**Trade-off:** Misses deep but inactive relationships

### Assumption 1: Interaction Types Equally Weighted
We treat "view", "reply", "reaction" identically.
**Reality:** Replies > reactions > views
**Fix:** Assign weights (view: 1x, reaction: 2x, reply: 5x)

### Assumption 2: Topics Don't Overlap
We embed entire posts but don't segment topics.
**Reality:** Posts span multiple topics
**Fix:** Multi-label topic extraction + weighted embedding average

### Assumption 3: No Spam/Manipulation
Algorithm assumes good-faith interactions.
**Reality:** Bots, engagement manipulation exist
**Fix:** Add anomaly detection (D4 query), rate limiting, community reporting

---

## 8. Handling Edge Cases

### Empty Feed (New User)
- No interaction history → use default preference embedding (global trending)
- Return popular recent posts to bootstrap
- Track what they interact with for personalization

### No Search Results
- Return helpful empty state with trending hashtags
- Suggest related searches
- Fall back to keyword search if vector search returns nothing

### High Latency Search
- Cache popular query embeddings
- Implement query timeout (return partial results after 500ms)
- Fall back to keyword search if vector DB unavailable

### Relationship Decay
- Old interactions decay but never fully disappear
- User can "refresh" relationship by new interaction
- Prevents cold-start when users reunite after absence

---

## 9. Performance Metrics

**Target SLAs:**
- GET /api/feed: < 200ms (p95)
- GET /api/search: < 500ms (p95)
- POST /api/posts: < 100ms (embedding async job)
- DB Query: < 50ms (p95)

**Scaling Strategy:**
- Feed: Pagination + Redis caching → serves 10K concurrent users
- Search: pgvector HNSW index → serves 50K QPS on single instance
- Write: Async embedding job queue → batch 100 posts per batch
- Beyond 100K posts: Consider Weaviate or Milvus

---

## 10. What I Would Do With More Time

1. **ML-Powered Authenticity**: Train classifier on community labels
2. **Real-time Personalization**: WebSocket feed updates as user interacts
3. **Advanced Search**: Query expansion, entity recognition, image similarity
4. **Moderation**: Spam detection, NSFW filtering, fraud signals
5. **Analytics Dashboard**: User engagement trends, feed diversity metrics
6. **Mobile Performance**: Offline caching, optimistic updates, compression
7. **A/B Testing**: Compare ranking algorithms, measure engagement/satisfaction
8. **Privacy**: End-to-end encryption, data minimization, GDPR compliance

---

**Document Version:** 1.0  
**Date:** July 14, 2026  
**Status:** Complete
