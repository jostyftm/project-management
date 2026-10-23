<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->double('sort_order')->default(0)->after('priority');
            $table->index(['project_id', 'sort_order']);
        });

        // Backfill: ordenar según id actual multiplicado por 1000
        DB::statement('UPDATE work_items SET sort_order = id * 1000 WHERE sort_order = 0');
    }

    public function down(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->dropIndex(['project_id', 'sort_order']);
            $table->dropColumn('sort_order');
        });
    }
};
