<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_item_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('check-square');
            $table->string('color')->default('#6366f1');
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['workspace_id', 'project_id']);
        });

        Schema::table('work_items', function (Blueprint $table) {
            $table->foreignId('type_id')->nullable()->after('state_id')->constrained('work_item_types')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->dropForeign(['type_id']);
            $table->dropColumn('type_id');
        });

        Schema::dropIfExists('work_item_types');
    }
};
