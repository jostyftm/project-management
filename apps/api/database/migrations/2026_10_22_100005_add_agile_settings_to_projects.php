<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('auto_rollup_parent')->default(true)->after('target_date');
            $table->unsignedSmallInteger('aging_threshold_days')->default(5)->after('auto_rollup_parent');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['auto_rollup_parent', 'aging_threshold_days']);
        });
    }
};
