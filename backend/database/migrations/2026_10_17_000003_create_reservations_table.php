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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->string('booking_reference')->unique();
            $table->foreignId('room_id')->constrained('rooms')->restrictOnDelete();
            $table->foreignId('guest_id')->constrained('guests')->restrictOnDelete();
            $table->date('check_in')->index();
            $table->date('check_out')->index();
            $table->unsignedSmallInteger('adults');
            $table->unsignedSmallInteger('children')->default(0);
            $table->unsignedSmallInteger('total_guests');
            $table->unsignedSmallInteger('nights');
            $table->decimal('nightly_rate_php', 10, 2);
            $table->decimal('total_price_php', 10, 2);
            $table->string('currency', 3)->default('PHP');
            $table->string('status')->default('pending')->index(); // pending, confirmed, cancelled, completed
            $table->text('special_requests')->nullable();
            $table->string('guest_name_snapshot');
            $table->string('guest_email_snapshot');
            $table->string('guest_phone_snapshot');
            $table->timestamps();

            $table->index(['room_id', 'status', 'check_in', 'check_out'], 'idx_room_status_dates');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
