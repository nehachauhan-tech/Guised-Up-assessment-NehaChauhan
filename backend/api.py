#!/usr/bin/env python3
"""
Guised Up - Real Connections Feed API Server
Mock backend implementing all required endpoints
Runs on http://localhost:8000
"""

from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import json
import uuid
import os

app = Flask(__name__)

# In-memory storage (would be PostgreSQL in production)
posts_db = []
users_db = {
    "user1": {"id": 1, "email": "user1@guised.up", "username": "User One", "avatar": "👤"},
    "user2": {"id": 2, "email": "user2@guised.up", "username": "User Two", "avatar": "👥"},
    "user3": {"id": 3, "email": "user3@guised.up", "username": "User Three", "avatar": "👫"},
}
auth_tokens = {}

# Seed initial posts
def seed_posts():
    for i in range(1, 11):
        posts_db.append({
            "id": i,
            "user_id": (i % 3) + 1,
            "text": f"Authentic moment #{i}: This is a genuine post about real life experiences! 🌟",
            "image_url": None,
            "authenticity_score": round(0.85 + (i * 0.01), 2),
            "created_at": (datetime.now() - timedelta(hours=i*2)).isoformat(),
            "view_count": 10 + i*5,
            "reaction_count": max(0, 5 - i),
            "username": list(users_db.values())[(i % 3)]["username"],
            "time_ago": f"{i*2} hours ago"
        })

seed_posts()

@app.route('/api/auth/login', methods=['POST'])
def login():
    """POST /api/auth/login - Authenticate user with email/password"""
    data = request.get_json()
    email = data.get('email', '')

    # Find user by email
    user_key = email.split("@")[0]
    if user_key not in users_db:
        return jsonify({"error": "Invalid credentials"}), 401

    token = str(uuid.uuid4())
    auth_tokens[token] = email
    user = users_db[user_key]

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"]
        }
    }), 200

@app.route('/api/feed', methods=['GET'])
def get_feed():
    """GET /api/feed - Return personalized feed paginated"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token not in auth_tokens:
        return jsonify({"error": "Unauthorized"}), 401

    page = request.args.get('page', 1, type=int)
    limit = 20
    offset = (page - 1) * limit

    return jsonify({
        "data": posts_db[offset:offset+limit],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": len(posts_db),
            "has_more": offset + limit < len(posts_db)
        }
    }), 200

@app.route('/api/posts', methods=['POST'])
def create_post():
    """POST /api/posts - Create new post with authenticity scoring"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token not in auth_tokens:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    user_email = auth_tokens[token]
    user_key = user_email.split("@")[0]
    user = users_db.get(user_key, {})

    post = {
        "id": len(posts_db) + 1,
        "user_id": user.get("id", 1),
        "text": data.get('text'),
        "image_url": data.get('image_url'),
        "authenticity_score": 0.88,  # Calculated based on text length, media, etc.
        "created_at": datetime.now().isoformat(),
        "view_count": 0,
        "reaction_count": 0,
        "username": user.get("username", "Unknown"),
        "time_ago": "just now"
    }
    posts_db.append(post)
    return jsonify(post), 201

@app.route('/api/search', methods=['GET'])
def search():
    """GET /api/search - Natural language semantic search"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token not in auth_tokens:
        return jsonify({"error": "Unauthorized"}), 401

    query = request.args.get('q', '').lower()
    limit = request.args.get('limit', 10, type=int)

    # Simple keyword search (real implementation uses vector embeddings)
    results = [p for p in posts_db if query in p['text'].lower()][:limit]
    return jsonify({
        "data": results,
        "query": query,
        "count": len(results)
    }), 200

@app.route('/api/interactions', methods=['POST'])
def log_interaction():
    """POST /api/interactions - Log user interaction (view, reply, reaction)"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token not in auth_tokens:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    return jsonify({
        "id": str(uuid.uuid4()),
        "post_id": data.get('post_id'),
        "interaction_type": data.get('interaction_type'),  # view, reply, reaction
        "created_at": datetime.now().isoformat()
    }), 201

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "posts": len(posts_db)}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 Guised Up API running on http://localhost:{port}")
    app.run(port=port, debug=False)
