<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('related_user_id')->constrained('users')->onDelete('cascade');
            $table->integer('interaction_count')->default(0);
            $table->float('relationship_depth')->default(0.0);
            $table->timestamp('last_interaction')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'related_user_id']);
            $table->index('relationship_depth');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relationships');
    }
};
