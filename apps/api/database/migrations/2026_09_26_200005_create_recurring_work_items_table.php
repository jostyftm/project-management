<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->json('work_item_template'); // title, priority, state_id, type_id, labels, assignees
            $table->string('cron_expression')->default('0 9 * * 1'); // Defaults to weekly on Monday
            $table->string('frequency')->default('WEEKLY'); // DAILY, WEEKLY, MONTHLY, CUSTOM
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['workspace_id', 'project_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_work_items');
    }
};
