<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'text',
        'image_url',
        'authenticity_score',
        'has_filters',
        'image_polish_score',
        'text_authenticity'
    ];

    protected $casts = [
        'authenticity_score' => 'float',
        'has_filters' => 'boolean',
        'image_polish_score' => 'float',
        'text_authenticity' => 'float'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function embedding()
    {
        return $this->hasOne(PostEmbedding::class);
    }

    public function interactions()
    {
        return $this->hasMany(Interaction::class);
    }
}
