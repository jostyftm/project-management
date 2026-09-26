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
        Schema::create('work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedInteger('sequence_id');
            $table->string('title');
            $table->json('description_json')->nullable();
            $table->foreignId('state_id')->constrained('states')->cascadeOnDelete();
            $table->string('priority')->default('NONE'); // URGENT, HIGH, MEDIUM, LOW, NONE
            $table->foreignId('parent_id')->nullable()->constrained('work_items')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('estimate_points', 5, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('target_date')->nullable();
            $table->boolean('is_draft')->default(false);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'sequence_id']);
            $table->index(['workspace_id', 'state_id']);
            $table->index(['project_id', 'state_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_items');
    }
};
