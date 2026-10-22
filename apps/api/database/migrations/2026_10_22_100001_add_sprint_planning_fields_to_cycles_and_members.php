<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cycles', function (Blueprint $table) {
            $table->text('sprint_goal')->nullable()->after('description');
            $table->float('capacity_points')->nullable()->after('sprint_goal');
        });

        Schema::table('project_members', function (Blueprint $table) {
            $table->float('capacity_points')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('cycles', function (Blueprint $table) {
            $table->dropColumn(['sprint_goal', 'capacity_points']);
        });

        Schema::table('project_members', function (Blueprint $table) {
            $table->dropColumn('capacity_points');
        });
    }
};
