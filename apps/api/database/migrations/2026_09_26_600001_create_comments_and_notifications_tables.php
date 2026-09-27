<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('work_item_id')->nullable()->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('page_id')->nullable()->constrained('pages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('content');
            $table->json('mentioned_user_ids')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'work_item_id']);
            $table->index(['workspace_id', 'page_id']);
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type'); // MENTION, ASSIGNMENT, STATUS_CHANGE, COMMENT
            $table->string('entity_type'); // WORK_ITEM, PAGE, RELEASE, etc.
            $table->unsignedBigInteger('entity_id');
            $table->string('title');
            $table->text('message');
            $table->string('target_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->index(['workspace_id', 'recipient_id', 'is_read']);
            $table->index(['workspace_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('comments');
    }
};
