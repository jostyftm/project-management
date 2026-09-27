<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add is_instance_admin to users
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_instance_admin')->default(false)->after('password');
        });

        // Create instance_settings table for global instance governance
        Schema::create('instance_settings', function (Blueprint $table) {
            $table->id();
            $table->string('instance_name')->default('Plane Enterprise SDI');
            $table->string('company_name')->nullable();
            $table->string('app_url')->default('http://localhost:3000');
            $table->boolean('allow_signups')->default(true);
            $table->boolean('invite_only')->default(false);
            $table->json('allowed_domains')->nullable();
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->nullable();
            $table->string('smtp_username')->nullable();
            $table->string('smtp_password')->nullable();
            $table->string('smtp_from_email')->nullable();
            $table->string('smtp_from_name')->nullable();
            $table->string('smtp_encryption')->nullable(); // tls, ssl
            $table->integer('max_upload_size_mb')->default(25);
            $table->boolean('enable_telemetry')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instance_settings');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_instance_admin');
        });
    }
};
