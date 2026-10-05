<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Repositorios de GitHub vinculados al proyecto (soporte Multi-Repo)
        Schema::create('project_github_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('repo_full_name'); // e.g. "empresa/sdi-api", "empresa/sdi-web"
            $table->string('label')->nullable(); // "Backend (API)", "Frontend (Web)"
            $table->string('repo_url')->nullable();
            $table->string('default_branch')->default('main');
            $table->string('webhook_secret', 128);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['project_id', 'repo_full_name']);
        });

        // 2. Configuración de reglas de GitHub por proyecto
        Schema::create('project_github_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained('projects')->cascadeOnDelete();
            $table->boolean('auto_start_on_pr')->default(true);
            $table->boolean('auto_complete_on_pr_merge')->default(true);
            $table->boolean('require_all_prs_merged')->default(true); // Multi-PR Gatekeeper
            $table->foreignId('started_state_id')->nullable()->constrained('states')->nullOnDelete();
            $table->foreignId('completed_state_id')->nullable()->constrained('states')->nullOnDelete();
            $table->timestamps();
        });

        // 3. Pull Requests vinculadas a Work Items (soporta N PRs por Work Item)
        Schema::create('github_pull_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('project_github_repo_id')->nullable()->constrained('project_github_repositories')->cascadeOnDelete();
            $table->string('repository_name'); // e.g. "sdi-api", "sdi-web"
            $table->string('repository_label')->nullable(); // "Backend", "Frontend"
            $table->integer('pr_number');
            $table->string('title');
            $table->string('state', 32)->default('open'); // open, closed, merged, draft
            $table->boolean('is_merged')->default(false);
            $table->string('preview_url')->nullable(); // Dokploy preview URL
            $table->string('head_branch')->nullable();
            $table->string('base_branch')->nullable();
            $table->string('html_url');
            $table->string('author_username')->nullable();
            $table->string('author_avatar_url')->nullable();
            $table->timestamp('merged_at')->nullable();
            $table->timestamps();

            $table->index(['work_item_id', 'state']);
            $table->unique(['work_item_id', 'html_url']);
        });

        // 4. Commits vinculados a Work Items
        Schema::create('github_commits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_item_id')->constrained('work_items')->cascadeOnDelete();
            $table->foreignId('project_github_repo_id')->nullable()->constrained('project_github_repositories')->cascadeOnDelete();
            $table->string('repository_label')->nullable();
            $table->string('sha', 40);
            $table->text('message');
            $table->string('author_name')->nullable();
            $table->string('html_url')->nullable();
            $table->timestamp('committed_at')->nullable();
            $table->timestamps();

            $table->unique(['work_item_id', 'sha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('github_commits');
        Schema::dropIfExists('github_pull_requests');
        Schema::dropIfExists('project_github_settings');
        Schema::dropIfExists('project_github_repositories');
    }
};
