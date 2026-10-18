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
        Schema::table('booking_notifications', function (Blueprint $table) {
            $table->foreignId('maintenance_request_id')->nullable()->after('refund_id')->constrained('maintenance_requests')->nullOnDelete();
            $table->index(['maintenance_request_id', 'notification_type'], 'idx_mnt_notif_type');
        });

        Schema::table('maintenance_request_histories', function (Blueprint $table) {
            $table->string('actor_role', 32)->nullable()->after('user_id');
            $table->json('changes_payload')->nullable()->after('notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_notifications', function (Blueprint $table) {
            $table->dropForeign(['maintenance_request_id']);
            $table->dropIndex('idx_mnt_notif_type');
            $table->dropColumn('maintenance_request_id');
        });

        Schema::table('maintenance_request_histories', function (Blueprint $table) {
            $table->dropColumn(['actor_role', 'changes_payload']);
        });
    }
};
