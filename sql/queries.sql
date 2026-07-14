-- ============================================
-- Guised Up — SQL Challenge Queries
-- Database: PostgreSQL with pgvector extension
-- ============================================

-- ============================================
-- PART D1: Top 10 Most Active Users (Last 7 Days)
-- ============================================
-- Rank users by total interactions (views + replies + reactions) in last 7 days
-- Useful for: Identifying power users, community engagement analysis

SELECT
    u.id,
    u.username,
    u.email,
    COUNT(i.id) as total_interactions,
    COUNT(CASE WHEN i.interaction_type = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN i.interaction_type = 'reply' THEN 1 END) as reply_count,
    COUNT(CASE WHEN i.interaction_type = 'reaction' THEN 1 END) as reaction_count,
    MAX(i.created_at) as last_active
FROM
    users u
    LEFT JOIN interactions i ON u.id = i.user_id
        AND i.created_at >= NOW() - INTERVAL '7 days'
GROUP BY
    u.id, u.username, u.email
HAVING
    COUNT(i.id) > 0  -- Only users with interactions
ORDER BY
    total_interactions DESC
LIMIT 10;

-- ============================================
-- PART D2: Posts from Most-Interacted Users (Last 30 Days)
-- ============================================
-- For a given user_id, return all posts from users they interact with most
-- Useful for: Relationship-based feed ranking, suggesting power connections

-- Variable: Replace {user_id} with actual user ID (e.g., 5)
SELECT
    p.id,
    p.user_id,
    u.username,
    u.email,
    p.text,
    p.image_url,
    p.created_at,
    p.authenticity_score,
    COUNT(DISTINCT i2.id) as total_interactions_with_author
FROM
    posts p
    INNER JOIN users u ON p.user_id = u.id
    INNER JOIN interactions i ON p.user_id = i.user_id
        AND i.user_id = {user_id}  -- The viewing user
        AND i.created_at >= NOW() - INTERVAL '30 days'
    LEFT JOIN interactions i2 ON i2.user_id = {user_id}
        AND i2.post_id = p.id
WHERE
    p.created_at >= NOW() - INTERVAL '30 days'
    AND p.user_id != {user_id}  -- Exclude user's own posts
GROUP BY
    p.id, p.user_id, u.username, u.email, p.text,
    p.image_url, p.created_at, p.authenticity_score
ORDER BY
    total_interactions_with_author DESC,
    p.created_at DESC;

-- ============================================
-- PART D3: Posts with High Views but Zero Reactions (Anomaly Detection)
-- ============================================
-- Find posts with >100 views but 0 reactions
-- Useful for: Identifying engagement anomalies, potential bot content,
--             spam detection, content quality audit

SELECT
    p.id as post_id,
    p.user_id as author_id,
    u.username,
    u.email,
    p.text,
    p.created_at,
    COUNT(CASE WHEN i.interaction_type = 'view' THEN 1 END) as view_count,
    COUNT(CASE WHEN i.interaction_type = 'reaction' THEN 1 END) as reaction_count,
    COUNT(CASE WHEN i.interaction_type = 'reply' THEN 1 END) as reply_count,
    ROUND(
        100.0 * COUNT(CASE WHEN i.interaction_type = 'reaction' THEN 1 END)
        / NULLIF(COUNT(CASE WHEN i.interaction_type = 'view' THEN 1 END), 0),
        2
    ) as reaction_rate
FROM
    posts p
    INNER JOIN users u ON p.user_id = u.id
    LEFT JOIN interactions i ON p.id = i.post_id
GROUP BY
    p.id, p.user_id, u.username, u.email, p.text, p.created_at
HAVING
    COUNT(CASE WHEN i.interaction_type = 'view' THEN 1 END) > 100
    AND COUNT(CASE WHEN i.interaction_type = 'reaction' THEN 1 END) = 0
ORDER BY
    view_count DESC,
    p.created_at DESC;

-- ============================================
-- PART D4: Spam Detection — High Post Frequency (Last 24 Hours)
-- ============================================
-- Identify users who have created >20 posts in last 24 hours
-- Useful for: Spam/abuse detection, rate limit enforcement, content moderation

SELECT
    u.id as user_id,
    u.username,
    u.email,
    COUNT(p.id) as post_count_24h,
    MAX(p.created_at) as last_post_time,
    MIN(p.created_at) as first_post_time,
    ROUND(
        COUNT(p.id)::numeric
        / EXTRACT(EPOCH FROM (MAX(p.created_at) - MIN(p.created_at)))
        * 3600,  -- posts per hour
        2
    ) as posts_per_hour,
    STRING_AGG(p.id::text, ', ' ORDER BY p.created_at DESC) as recent_post_ids
FROM
    users u
    INNER JOIN posts p ON u.id = p.user_id
        AND p.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY
    u.id, u.username, u.email
HAVING
    COUNT(p.id) > 20
ORDER BY
    post_count_24h DESC,
    MAX(p.created_at) DESC;

-- ============================================
-- BONUS: Supporting Queries for Algorithm Implementation
-- ============================================

-- Calculate authenticity score for a post (used in feed ranking)
SELECT
    p.id,
    p.user_id,
    p.authenticity_score,
    COUNT(i.id) as total_views,
    (COUNT(CASE WHEN i.interaction_type = 'reaction' THEN 1 END)::float
     / NULLIF(COUNT(i.id), 0)) as engagement_ratio
FROM
    posts p
    LEFT JOIN interactions i ON p.id = i.post_id
WHERE
    p.created_at >= NOW() - INTERVAL '7 days'
GROUP BY
    p.id, p.user_id, p.authenticity_score
ORDER BY
    p.authenticity_score DESC;

-- Get relationship depth between two users (for feed personalization)
-- Replace {user_a_id} and {user_b_id} with actual IDs
SELECT
    COALESCE(r.user_id, {user_a_id}) as user_a,
    COALESCE(r.related_user_id, {user_b_id}) as user_b,
    COALESCE(r.interaction_count, 0) as interaction_count,
    COALESCE(r.relationship_depth, 0.0) as relationship_depth,
    r.last_interaction,
    COUNT(DISTINCT i.id) as recent_interactions_last_7d
FROM
    relationships r
    LEFT JOIN interactions i ON (
        (i.user_id = {user_a_id} AND i.post_id IN (
            SELECT id FROM posts WHERE user_id = {user_b_id}
        ))
        AND i.created_at >= NOW() - INTERVAL '7 days'
    )
WHERE
    (r.user_id = {user_a_id} AND r.related_user_id = {user_b_id})
    OR (r.user_id = {user_b_id} AND r.related_user_id = {user_a_id})
GROUP BY
    r.user_id, r.related_user_id, r.interaction_count,
    r.relationship_depth, r.last_interaction;

-- ============================================
-- Performance Index Verification
-- ============================================
-- Verify critical indexes are in place

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    tablename IN ('posts', 'interactions', 'relationships', 'users', 'post_embeddings')
ORDER BY
    tablename, indexname;

-- Query execution time benchmarks (EXPLAIN ANALYZE)
-- Run these to verify performance targets (<200ms for feed, <500ms for search)

-- EXPLAIN ANALYZE
-- SELECT p.* FROM posts p
-- WHERE p.created_at >= NOW() - INTERVAL '7 days'
-- ORDER BY p.created_at DESC
-- LIMIT 20;

-- EXPLAIN ANALYZE
-- SELECT COUNT(*) as interaction_count
-- FROM interactions
-- WHERE user_id = 5
--   AND created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY interaction_type;
