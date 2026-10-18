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
        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number', 32)->unique();
            $table->string('title', 255);
            $table->text('description');
            $table->string('resource_type', 32)->index(); // room, villa, facility, equipment, other
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->string('resource_name', 255);
            $table->string('location', 255)->nullable();
            $table->string('priority', 32)->default('normal')->index(); // low, normal, high, urgent
            $table->string('status', 32)->default('reported')->index(); // reported, assessed, in_progress, on_hold, resolved, cancelled
            $table->decimal('cost_php', 10, 2)->default(0.00);
            $table->text('repair_notes')->nullable();
            $table->foreignId('reported_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reported_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'priority'], 'idx_mnt_status_priority');
            $table->index(['resource_type', 'status'], 'idx_mnt_resource_status');
        });

        Schema::create('maintenance_request_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')->constrained('maintenance_requests')->cascadeOnDelete();
            $table->string('file_path', 500);
            $table->string('file_name', 255);
            $table->string('file_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_request_attachments');
        Schema::dropIfExists('maintenance_requests');
    }
};
