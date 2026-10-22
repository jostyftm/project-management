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
            $table->boolean('is_blocked')->default(false)->after('is_draft');
            $table->text('blocked_reason')->nullable()->after('is_blocked');
            $table->timestamp('blocked_at')->nullable()->after('blocked_reason');
            $table->foreignId('blocked_by_user_id')->nullable()->after('blocked_at')->constrained('users')->nullOnDelete();
            $table->timestamp('state_changed_at')->nullable()->after('completed_at');
        });

        // Backfill: inicializar state_changed_at con updated_at o created_at
        DB::statement('UPDATE work_items SET state_changed_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE state_changed_at IS NULL');
    }

    public function down(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->dropForeign(['blocked_by_user_id']);
            $table->dropColumn([
                'is_blocked',
                'blocked_reason',
                'blocked_at',
                'blocked_by_user_id',
                'state_changed_at',
            ]);
        });
    }
};
