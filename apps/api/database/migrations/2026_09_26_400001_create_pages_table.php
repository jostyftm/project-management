<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('pages')->cascadeOnDelete();
            $table->string('title');
            $table->jsonb('content_json')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_locked')->default(false);
            $table->string('access')->default('WORKSPACE'); // PUBLIC, WORKSPACE, PRIVATE
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->integer('order')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('last_edited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'project_id']);
            $table->index(['workspace_id', 'parent_id']);
            $table->index(['workspace_id', 'is_published']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
