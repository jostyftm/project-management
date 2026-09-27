<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Initiatives
        Schema::create('initiatives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('target_date')->nullable();
            $table->string('status')->default('PLANNED'); // PLANNED, IN_PROGRESS, ACHIEVED, CANCELLED
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'status']);
        });

        Schema::create('initiative_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('initiative_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['initiative_id', 'project_id']);
        });

        // Teamspaces
        Schema::create('teamspaces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'slug']);
        });

        Schema::create('teamspace_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teamspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['teamspace_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teamspace_projects');
        Schema::dropIfExists('teamspaces');
        Schema::dropIfExists('initiative_projects');
        Schema::dropIfExists('initiatives');
    }
};
