<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostEmbedding extends Model
{
    use HasFactory;

    protected $fillable = [
        'post_id',
        'embedding'
    ];

    protected $casts = [
        'embedding' => 'array'
    ];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }
}
