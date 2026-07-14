<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostEmbedding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PostController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'text' => 'required|string|max:2000',
            'image_url' => 'nullable|url'
        ]);

        $post = Post::create([
            'user_id' => $request->user()->id,
            'text' => $validated['text'],
            'image_url' => $validated['image_url'] ?? null,
            'authenticity_score' => $this->calculateAuthenticityScore($validated['text']),
            'has_filters' => false,
            'image_polish_score' => 0.5,
            'text_authenticity' => 0.8
        ]);

        // Generate embedding asynchronously (or mock for now)
        $embedding = $this->generateEmbedding($validated['text']);

        PostEmbedding::create([
            'post_id' => $post->id,
            'embedding' => $embedding
        ]);

        return response()->json([
            'id' => $post->id,
            'user_id' => $post->user_id,
            'text' => $post->text,
            'image_url' => $post->image_url,
            'authenticity_score' => $post->authenticity_score,
            'created_at' => $post->created_at
        ], 201);
    }

    private function generateEmbedding($text)
    {
        // Try to call Python embedding service
        try {
            $response = Http::timeout(5)->post('http://localhost:5000/embed', [
                'text' => $text
            ]);

            if ($response->successful()) {
                return $response->json('embedding');
            }
        } catch (\Exception $e) {
            // Fallback: mock embedding (384-dimensional vector)
        }

        // Mock embedding - return random vector for testing
        return array_fill(0, 384, rand(0, 100) / 100);
    }

    private function calculateAuthenticityScore($text)
    {
        $score = 0.7;

        // Simple heuristic: longer, more varied text = more authentic
        $word_count = str_word_count($text);
        $unique_words = count(array_unique(explode(' ', strtolower($text))));

        if ($word_count > 50) {
            $score += 0.1;
        }

        if ($unique_words / $word_count > 0.8) {
            $score += 0.1;
        }

        return min($score, 1.0);
    }
}
