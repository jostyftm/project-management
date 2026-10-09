<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_delivery_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('workspace_reports')->cascadeOnDelete();
            $table->foreignId('schedule_id')->nullable()->constrained('report_schedules')->nullOnDelete();
            $table->jsonb('recipients')->default('[]');
            $table->string('status')->default('pending'); // pending|sent|failed
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('report_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_delivery_logs');
    }
};
