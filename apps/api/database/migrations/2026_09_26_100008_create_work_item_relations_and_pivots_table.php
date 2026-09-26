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
        Schema::create('work_item_assignees', function (Blueprint $table) {
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->primary(['work_item_id', 'user_id']);
        });

        Schema::create('work_item_labels', function (Blueprint $table) {
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('label_id')->constrained('labels')->cascadeOnDelete();
            $table->primary(['work_item_id', 'label_id']);
        });

        Schema::create('work_item_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('source_id')->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('target_id')->constrained('work_items')->cascadeOnDelete();
            $table->string('relation_type')->default('RELATES_TO'); // BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATE_OF
            $table->timestamps();

            $table->unique(['source_id', 'target_id', 'relation_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_item_relations');
        Schema::dropIfExists('work_item_labels');
        Schema::dropIfExists('work_item_assignees');
    }
};
