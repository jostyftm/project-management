<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status')->default('PLANNED'); // PLANNED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED
            $table->foreignId('lead_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('target_date')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'project_id', 'status']);
        });

        Schema::create('module_work_items', function (Blueprint $table) {
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->primary(['module_id', 'work_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_work_items');
        Schema::dropIfExists('modules');
    }
};
