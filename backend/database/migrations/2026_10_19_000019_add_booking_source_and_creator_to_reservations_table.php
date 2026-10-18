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
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('booking_source', 30)->default('website')->after('status')->index();
            $table->foreignId('created_by_user_id')->nullable()->after('booking_source')->constrained('users')->nullOnDelete();

            $table->index(['booking_source', 'created_at'], 'idx_res_source_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('idx_res_source_created');
            $table->dropForeign(['created_by_user_id']);
            $table->dropColumn(['booking_source', 'created_by_user_id']);
        });
    }
};
