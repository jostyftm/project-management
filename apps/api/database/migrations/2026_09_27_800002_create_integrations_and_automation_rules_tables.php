<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Integraciones generales del Workspace (Slack, webhooks externos)
        Schema::create('integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->string('provider', 32); // 'SLACK', 'GITHUB', 'CUSTOM'
            $table->string('name');
            $table->json('config'); // e.g. webhook_url, channel_name, secret_token
            $table->json('events_subscribed')->nullable(); // ['work_item.created', 'release.published', etc.]
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'provider']);
        });

        // 2. Reglas dinámicas de automatización
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('trigger_event'); // 'WORK_ITEM_CREATED', 'STATE_CHANGED', 'DUE_DATE_PASSED', etc.
            $table->json('trigger_conditions')->nullable(); // { "priority": "URGENT", "state_id": 2 }
            $table->json('actions'); // { "change_state_to": 3, "assign_to_user": 5, "add_labels": [1, 2] }
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_executed_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'trigger_event', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_rules');
        Schema::dropIfExists('integrations');
    }
};
