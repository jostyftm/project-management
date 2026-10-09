<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_github_repositories')) {
            Schema::table('project_github_repositories', function (Blueprint $table) {
                if (! Schema::hasColumn('project_github_repositories', 'default_branch')) {
                    $table->string('default_branch')->default('main')->after('repo_url');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('project_github_repositories')) {
            Schema::table('project_github_repositories', function (Blueprint $table) {
                if (Schema::hasColumn('project_github_repositories', 'default_branch')) {
                    $table->dropColumn('default_branch');
                }
            });
        }
    }
};
