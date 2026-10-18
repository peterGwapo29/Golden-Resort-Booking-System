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
        Schema::create('accommodation_restrictions', function (Blueprint $table) {
            $table->id();
            $table->string('restriction_number', 32)->unique();
            $table->foreignId('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->foreignId('maintenance_request_id')->nullable()->constrained('maintenance_requests')->nullOnDelete();
            $table->string('restriction_type', 32)->default('maintenance_block');
            $table->string('title', 255);
            $table->text('reason');
            $table->unsignedSmallInteger('blocked_units')->default(1);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_indefinite')->default(false);
            $table->string('status', 20)->default('active')->index(); // active, cleared, cancelled
            $table->json('affected_reservations_snapshot')->nullable();
            $table->string('handling_protocol', 50)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cleared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cleared_at')->nullable();
            $table->text('clearance_notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index(['room_id', 'status'], 'idx_acc_restr_room_status');
            $table->index(['start_date', 'end_date', 'status'], 'idx_acc_restr_dates_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accommodation_restrictions');
    }
};
