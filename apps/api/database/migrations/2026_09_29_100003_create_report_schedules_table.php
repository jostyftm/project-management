<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('workspace_reports')->cascadeOnDelete();
            $table->string('frequency'); // daily|weekly|monthly|custom
            $table->string('cron_expression')->nullable();
            $table->jsonb('recipients')->default('[]'); // array of emails
            $table->timestamp('next_run_at')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('report_id');
            $table->index('next_run_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_schedules');
    }
};
