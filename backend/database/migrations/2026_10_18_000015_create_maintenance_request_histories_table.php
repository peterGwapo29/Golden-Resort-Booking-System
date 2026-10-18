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
        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dateTime('due_date')->nullable()->after('priority');
            $table->timestamp('assigned_at')->nullable()->after('reported_at');
            $table->timestamp('acknowledged_at')->nullable()->after('assigned_at');
            $table->timestamp('started_at')->nullable()->after('acknowledged_at');
            $table->timestamp('submitted_for_review_at')->nullable()->after('started_at');

            $table->index(['assigned_to_user_id', 'status'], 'idx_mnt_assigned_status');
            $table->index('due_date', 'idx_mnt_due_date');
        });

        Schema::create('maintenance_request_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')->constrained('maintenance_requests')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);
            $table->string('from_status', 32)->nullable();
            $table->string('to_status', 32)->nullable();
            $table->foreignId('from_assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('to_assigned_to_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['maintenance_request_id', 'created_at'], 'idx_mnh_request_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_request_histories');

        Schema::table('maintenance_requests', function (Blueprint $table) {
            $table->dropIndex('idx_mnt_assigned_status');
            $table->dropIndex('idx_mnt_due_date');

            $table->dropColumn([
                'due_date',
                'assigned_at',
                'acknowledged_at',
                'started_at',
                'submitted_for_review_at',
            ]);
        });
    }
};
