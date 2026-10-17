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
            // Index for date range filtering and analytics
            $table->index(['created_at', 'status'], 'idx_reservations_created_status');
        });

        Schema::table('payments', function (Blueprint $table) {
            // Index for financial collections filtering by date
            $table->index(['created_at', 'status'], 'idx_payments_created_status');
        });

        Schema::table('refunds', function (Blueprint $table) {
            // Index for refund tracking filtering by date
            $table->index(['created_at', 'status'], 'idx_refunds_created_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('idx_reservations_created_status');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_created_status');
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropIndex('idx_refunds_created_status');
        });
    }
};
