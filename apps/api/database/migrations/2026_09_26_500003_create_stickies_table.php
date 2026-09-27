<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stickies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->text('content');
            $table->string('color')->default('yellow'); // yellow, green, blue, pink, purple
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_private')->default(false);
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'is_pinned']);
            $table->index(['workspace_id', 'created_by']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stickies');
    }
};
