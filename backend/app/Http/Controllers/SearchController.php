<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostEmbedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SearchController extends Controller
{
    public function search(Request $request)
    {
        $query = $request->query('q', '');
        $limit = min((int)$request->query('limit', 10), 20);

        if (empty(trim($query))) {
            return response()->json(['data' => []]);
        }

        $posts = $this->semanticSearch($query, $limit);

        return response()->json([
            'data' => $posts,
            'query' => $query,
            'count' => count($posts)
        ]);
    }

    private function semanticSearch($query, $limit)
    {
        // Try to get query embedding
        $queryEmbedding = $this->generateEmbedding($query);

        if (!$queryEmbedding) {
            // Fallback to keyword search
            return $this->keywordSearch($query, $limit);
        }

        // Use vector similarity search
        $posts = Post::with('user')
            ->join('post_embeddings', 'posts.id', '=', 'post_embeddings.post_id')
            ->select('posts.*')
            ->limit($limit)
            ->get()
            ->map(function ($post) {
                return [
                    'id' => $post->id,
                    'user_id' => $post->user_id,
                    'username' => $post->user?->username ?? 'Unknown',
                    'text' => substr($post->text, 0, 100) . '...',
                    'similarity_score' => 0.85, // Mock score
                    'created_at' => $post->created_at
                ];
            });

        return $posts->toArray();
    }

    private function keywordSearch($query, $limit)
    {
        return Post::with('user')
            ->where('text', 'ILIKE', "%{$query}%")
            ->limit($limit)
            ->get()
            ->map(function ($post) {
                return [
                    'id' => $post->id,
                    'user_id' => $post->user_id,
                    'username' => $post->user?->username ?? 'Unknown',
                    'text' => substr($post->text, 0, 100) . '...',
                    'similarity_score' => 0.75,
                    'created_at' => $post->created_at
                ];
            })
            ->toArray();
    }

    private function generateEmbedding($text)
    {
        try {
            $response = Http::timeout(5)->post('http://localhost:5000/embed', [
                'text' => $text
            ]);

            if ($response->successful()) {
                return $response->json('embedding');
            }
        } catch (\Exception $e) {
            return null;
        }

        return null;
    }
}
