<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Relationship extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'related_user_id',
        'interaction_count',
        'relationship_depth',
        'last_interaction'
    ];

    protected $casts = [
        'interaction_count' => 'integer',
        'relationship_depth' => 'float',
        'last_interaction' => 'datetime'
    ];
}
