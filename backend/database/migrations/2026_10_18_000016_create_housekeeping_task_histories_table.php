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
        // 1. Add workflow timestamps and evidence columns to housekeeping_tasks
        Schema::table('housekeeping_tasks', function (Blueprint $table) {
            $table->timestamp('submitted_for_review_at')->nullable()->after('completed_at');
            $table->string('evidence_url', 255)->nullable()->after('submitted_for_review_at');
        });

        // 2. Create audit and history trail for housekeeping task lifecycle
        Schema::create('housekeeping_task_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('housekeeping_task_id')->constrained('housekeeping_tasks')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50); // assigned, started, progress_updated, submitted_for_review, approved, rejected, status_changed
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            $table->text('notes')->nullable();
            $table->string('evidence_url', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['housekeeping_task_id', 'created_at'], 'idx_hk_history_task_time');
            $table->index('actor_user_id', 'idx_hk_history_actor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('housekeeping_task_histories');

        Schema::table('housekeeping_tasks', function (Blueprint $table) {
            $table->dropColumn(['submitted_for_review_at', 'evidence_url']);
        });
    }
};
