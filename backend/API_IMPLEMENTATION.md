# Backend API Implementation Guide

## Quick Start

This guide outlines how to implement the Laravel API endpoints for the Guised Up Real Connections Feed.

## Project Setup

### 1. Install Laravel

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

### 2. Configure Database

Edit `.env`:
```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_DATABASE=guised_up
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
```

Create database:
```bash
createdb guised_up
```

### 3. Enable PostgreSQL pgvector

```bash
# Connect to PostgreSQL
psql -d guised_up

# Install pgvector extension
CREATE EXTENSION vector;

# Verify
\dx vector
```

## Database Migrations

### Create Migration Files

```bash
php artisan make:migration create_users_table
php artisan make:migration create_posts_table
php artisan make:migration create_post_embeddings_table
php artisan make:migration create_interactions_table
php artisan make:migration create_relationships_table
php artisan make:migration create_authenticity_scores_table
```

### Migration Content Examples

**users migration:**
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('username')->unique();
    $table->string('email')->unique();
    $table->string('password');
    $table->timestamps();
});
```

**posts migration:**
```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->text('text');
    $table->string('image_url')->nullable();
    $table->boolean('has_filters')->default(false);
    $table->float('image_polish_score')->default(0.5);
    $table->float('text_authenticity')->default(0.7);
    $table->timestamps();
    $table->index('user_id');
    $table->index('created_at');
});
```

**post_embeddings migration:**
```php
Schema::create('post_embeddings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('post_id')->constrained('posts')->onDelete('cascade');
    $table->vector('embedding', 384);  // pgvector
    $table->timestamps();
    $table->unique('post_id');
});
DB::statement('CREATE INDEX idx_embedding_hnsw ON post_embeddings USING hnsw (embedding vector_cosine_ops)');
```

**interactions migration:**
```php
Schema::create('interactions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained();
    $table->foreignId('post_id')->constrained();
    $table->enum('interaction_type', ['view', 'reply', 'reaction']);
    $table->timestamps();
    $table->index(['user_id', 'post_id']);
    $table->index(['user_id', 'created_at']);
});
```

### Run Migrations

```bash
php artisan migrate
php artisan migrate:seed
```

## Models

Create Eloquent models for each table:

```bash
php artisan make:model User
php artisan make:model Post
php artisan make:model PostEmbedding
php artisan make:model Interaction
php artisan make:model Relationship
php artisan make:model AuthenticityScore
```

## API Endpoints Implementation

### 1. Authentication (Sanctum)

**Route:** `POST /api/auth/login`
**Request:**
```json
{
  "email": "user1@guised.up",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "1|...",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user1@guised.up"
  }
}
```

### 2. Create Post

**Route:** `POST /api/posts`
**Auth:** Required (Sanctum)

**Implementation Steps:**
1. Validate request (text required, image_url optional)
2. Calculate authenticity scores (filter detection, image polish, text analysis)
3. Store post in database
4. **Async Job:** Generate embeddings using Python service
5. Store embeddings in pgvector
6. Return post with embedding status

**Python Embedding Service:**
```python
from sentence_transformers import SentenceTransformer

def embed_post(text: str) -> list:
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embedding = model.encode(text, convert_to_tensor=True).numpy()
    return embedding.tolist()

@app.post('/embed')
def generate_embedding(request: dict):
    post_text = request.get('text')
    embedding = embed_post(post_text)
    return {'embedding': embedding}
```

### 3. Get Personalized Feed

**Route:** `GET /api/feed?page=1&limit=20`
**Auth:** Required

**Implementation:**
1. Get authenticated user
2. Fetch 20 most recent posts (limit to 50 candidates)
3. **For each post, calculate ranking score:**
   ```
   ranking_score = (
       0.40 * authenticity_score +
       0.30 * relationship_depth_score +
       0.15 * semantic_relevance +
       0.15 * time_decay
   )
   ```
4. Sort by ranking_score descending
5. Include pagination metadata

**Query Optimization:**
- Use raw SQL for complex ranking (avoid N+1)
- Cache popular feeds for 5 minutes
- Denormalize ranking scores on post table

### 4. Semantic Search

**Route:** `GET /api/search?q=funny+travel+stories`
**Auth:** Required

**Implementation:**
1. Receive search query
2. Send query to Python service to generate embedding
3. Use pgvector similarity search:
   ```sql
   SELECT * FROM posts p
   JOIN post_embeddings pe ON p.id = pe.post_id
   WHERE pe.embedding <-> $1 < 0.5
   ORDER BY pe.embedding <-> $1
   LIMIT 10
   ```
4. Return results with similarity scores

### 5. Log Interactions

**Route:** `POST /api/interactions`
**Auth:** Required

**Implementation:**
1. Validate post_id exists
2. Log interaction in database
3. Update relationship_depth table:
   - Increment interaction_count for user pair
   - Recalculate relationship_depth score
   - Update last_interaction timestamp
4. Return confirmation

## Testing

Create feature tests for critical flows:

```php
// tests/Feature/FeedTest.php

class FeedTest extends TestCase {
    public function test_authenticated_user_can_fetch_feed() {
        $user = User::factory()->create();
        Post::factory(30)->create();
        
        $response = $this->actingAs($user)
            ->getJson('/api/feed');
        
        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['*' => ['id', 'text', 'ranking_score']]])
            ->assertJsonCount(20, 'data');
    }

    public function test_search_returns_semantically_relevant_posts() {
        // Implementation
    }

    public function test_interactions_update_relationship_depth() {
        // Implementation
    }
}
```

## Deployment Checklist

- [ ] Environment variables configured (.env)
- [ ] Database migrations executed
- [ ] pgvector extension installed and enabled
- [ ] Test users seeded
- [ ] API endpoints tested with Postman/curl
- [ ] Python embedding service running
- [ ] CORS headers configured for mobile app
- [ ] Rate limiting enabled
- [ ] Logging configured

## Troubleshooting

**pgvector not found:**
```bash
psql -d guised_up -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Embedding service timeout:**
- Check Python service is running on correct port
- Verify async jobs processing correctly
- Increase timeout in .env

**Migration failures:**
- Check database permissions
- Verify pgvector syntax (PHP package up-to-date)
- Run migrations individually to identify issue

## Related Files

- See `/docs/TSD.md` for database schema details
- See `/sql/queries.sql` for complex SQL examples
- See `requirements.txt` for Python dependencies
