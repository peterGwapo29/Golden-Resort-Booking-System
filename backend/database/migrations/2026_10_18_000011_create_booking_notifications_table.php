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
        Schema::create('booking_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('refund_id')->nullable()->constrained('refunds')->nullOnDelete();
            $table->string('recipient_email')->index();
            $table->string('recipient_type'); // 'guest' or 'staff'
            $table->string('notification_type'); // 'booking_confirmation', 'internal_new_booking', 'payment_confirmation', 'payment_reminder', 'checkin_reminder', 'booking_cancellation', 'refund_update'
            $table->string('channel')->default('mail');
            $table->string('subject');
            $table->string('status')->default('queued')->index(); // 'queued', 'sent', 'failed'
            $table->string('idempotency_key')->unique();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['reservation_id', 'notification_type'], 'idx_res_notif_type');
            $table->index(['status', 'created_at'], 'idx_notif_status_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_notifications');
    }
};
