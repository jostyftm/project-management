<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('work_items', 'completed_at')) {
            Schema::table('work_items', function (Blueprint $table) {
                $table->timestamp('completed_at')->nullable()->after('target_date');
                $table->index(['workspace_id', 'completed_at']);
            });

            // Backfill existing completed work items with their updated_at timestamp
            $completedStateIds = DB::table('states')
                ->whereIn('group', ['COMPLETED', 'CANCELLED'])
                ->pluck('id');

            if ($completedStateIds->isNotEmpty()) {
                DB::table('work_items')
                    ->whereNull('completed_at')
                    ->whereIn('state_id', $completedStateIds)
                    ->update(['completed_at' => DB::raw('updated_at')]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('work_items', 'completed_at')) {
            Schema::table('work_items', function (Blueprint $table) {
                $table->dropIndex(['workspace_id', 'completed_at']);
                $table->dropColumn('completed_at');
            });
        }
    }
};
