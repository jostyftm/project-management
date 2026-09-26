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
        Schema::create('states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 10)->default('#60A5FA');
            $table->string('group')->default('UNSTARTED'); // BACKLOG, UNSTARTED, STARTED, COMPLETED, CANCELLED
            $table->integer('sequence')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['project_id', 'group']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('states');
    }
};
