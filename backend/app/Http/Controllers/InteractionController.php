<?php

namespace App\Http\Controllers;

use App\Models\Interaction;
use App\Models\Relationship;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InteractionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'post_id' => 'required|exists:posts,id',
            'interaction_type' => ['required', Rule::in('view', 'reply', 'reaction')]
        ]);

        $interaction = Interaction::create([
            'user_id' => $request->user()->id,
            'post_id' => $validated['post_id'],
            'interaction_type' => $validated['interaction_type']
        ]);

        // Update relationship depth
        $this->updateRelationshipDepth(
            $request->user()->id,
            $validated['post_id'],
            $validated['interaction_type']
        );

        return response()->json([
            'id' => $interaction->id,
            'user_id' => $interaction->user_id,
            'post_id' => $interaction->post_id,
            'interaction_type' => $interaction->interaction_type,
            'created_at' => $interaction->created_at
        ], 201);
    }

    private function updateRelationshipDepth($userId, $postId, $interactionType)
    {
        $post = \App\Models\Post::find($postId);

        if ($post->user_id === $userId) {
            return; // Don't track self-interactions
        }

        // Weight by interaction type
        $weights = [
            'view' => 1,
            'reply' => 5,
            'reaction' => 2
        ];

        $weight = $weights[$interactionType] ?? 1;

        $relationship = Relationship::firstOrCreate(
            [
                'user_id' => $userId,
                'related_user_id' => $post->user_id
            ],
            ['interaction_count' => 0, 'relationship_depth' => 0]
        );

        $relationship->increment('interaction_count', $weight);
        $relationship->update([
            'last_interaction' => now(),
            'relationship_depth' => min(
                $relationship->interaction_count / 100,
                1.0
            )
        ]);
    }
}
