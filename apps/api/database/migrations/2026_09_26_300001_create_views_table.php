<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('filters')->nullable(); // e.g. {"priorities": ["URGENT"], "state_ids": [1,2]}
            $table->json('display_filters')->nullable(); // e.g. {"group_by": "priority", "layout": "kanban"}
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['workspace_id', 'created_by']);
            $table->index(['project_id', 'created_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('views');
    }
};
