<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('estimate_system')->default('FIBONACCI')->after('description'); // FIBONACCI, TSHIRT, NUMERIC, NONE
        });

        Schema::table('work_items', function (Blueprint $table) {
            $table->string('estimate_value')->nullable()->after('estimate_points'); // Stores string e.g. "M", "5"
        });
    }

    public function down(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->dropColumn('estimate_value');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('estimate_system');
        });
    }
};
