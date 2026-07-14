<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Interaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $page = max(1, (int)$request->query('page', 1));
        $limit = 20;
        $offset = ($page - 1) * $limit;

        $posts = Post::with('user')
            ->select('posts.*', DB::raw('
                0.40 * authenticity_score +
                0.15 * (CASE WHEN EXTRACT(EPOCH FROM (NOW() - posts.created_at)) / 3600 < 72
                    THEN exp(-EXTRACT(EPOCH FROM (NOW() - posts.created_at)) / 3600 / 72)
                    ELSE 0 END) as ranking_score
            '))
            ->orderByRaw('ranking_score DESC')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->map(function ($post) use ($user) {
                $interactions = Interaction::where('post_id', $post->id)->count();
                $userInteracted = Interaction::where('post_id', $post->id)
                    ->where('user_id', $user->id)
                    ->exists();

                return [
                    'id' => $post->id,
                    'user_id' => $post->user_id,
                    'username' => $post->user?->username ?? 'Unknown',
                    'avatar_url' => null,
                    'text' => $post->text,
                    'image_url' => $post->image_url,
                    'time_ago' => $this->timeAgo($post->created_at),
                    'authenticity_score' => round($post->authenticity_score, 2),
                    'ranking_score' => round($post->ranking_score ?? 0.5, 2),
                    'interaction_count' => $interactions,
                    'user_has_interacted' => $userInteracted
                ];
            });

        $totalPosts = Post::count();
        $totalPages = ceil($totalPosts / $limit);

        return response()->json([
            'data' => $posts,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages
            ]
        ]);
    }

    private function timeAgo($date)
    {
        $now = now();
        $diff = $now->diffInSeconds($date);

        if ($diff < 60) return "$diff seconds ago";
        if ($diff < 3600) return (int)($diff / 60) . " minutes ago";
        if ($diff < 86400) return (int)($diff / 3600) . " hours ago";
        if ($diff < 604800) return (int)($diff / 86400) . " days ago";
        return $date->format('M d, Y');
    }
}
