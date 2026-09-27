<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('status')->default('UPCOMING'); // DRAFT, UPCOMING, CURRENT, COMPLETED
            $table->foreignId('owned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['workspace_id', 'project_id', 'status']);
        });

        Schema::create('cycle_work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_id')->constrained('cycles')->cascadeOnDelete();
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->string('status_at_completion')->nullable(); // NULL, COMPLETED, TRANSFERRED_TO_BACKLOG
            $table->foreignId('transferred_to_cycle_id')->nullable()->constrained('cycles')->nullOnDelete();
            $table->timestamps();

            $table->unique(['cycle_id', 'work_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cycle_work_items');
        Schema::dropIfExists('cycles');
    }
};
