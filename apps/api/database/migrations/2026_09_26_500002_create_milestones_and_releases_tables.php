<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Milestones
        Schema::create('milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('target_date')->nullable();
            $table->string('status')->default('PENDING'); // PENDING, COMPLETED, DELAYED
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
        });

        Schema::create('milestone_work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('milestone_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_item_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['milestone_id', 'work_item_id']);
        });

        // Releases
        Schema::create('releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('version');
            $table->text('description')->nullable();
            $table->text('changelog')->nullable();
            $table->string('status')->default('DRAFT'); // DRAFT, PUBLISHED, ARCHIVED
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
        });

        Schema::create('release_work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('release_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_item_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['release_id', 'work_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('release_work_items');
        Schema::dropIfExists('releases');
        Schema::dropIfExists('milestone_work_items');
        Schema::dropIfExists('milestones');
    }
};
