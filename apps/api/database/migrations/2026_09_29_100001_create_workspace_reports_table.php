<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('visibility')->default('draft'); // draft|private|workspace|public
            $table->jsonb('theme')->default('{}');
            $table->jsonb('layout_config')->default('{}');
            $table->string('public_token')->nullable()->unique();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('workspace_id');
            $table->index('owner_id');
            $table->index('visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_reports');
    }
};
