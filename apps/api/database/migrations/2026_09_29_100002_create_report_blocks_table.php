<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('report_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('workspace_reports')->cascadeOnDelete();
            $table->string('type'); // BlockType enum value
            $table->string('title')->nullable();
            $table->integer('position')->default(0);
            $table->integer('width')->default(12); // 1-12 columns
            $table->jsonb('config')->default('{}');
            $table->jsonb('data_cache')->nullable();
            $table->timestamp('cached_at')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->index('report_id');
            $table->index('position');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_blocks');
    }
};
