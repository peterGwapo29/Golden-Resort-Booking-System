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
            $table->timestamp('checked_in_at')->nullable()->after('status');
            $table->timestamp('checked_out_at')->nullable()->after('checked_in_at');
            $table->foreignId('checked_in_by_user_id')->nullable()->after('checked_out_at')->constrained('users')->nullOnDelete();
            $table->foreignId('checked_out_by_user_id')->nullable()->after('checked_in_by_user_id')->constrained('users')->nullOnDelete();
            $table->text('check_in_notes')->nullable()->after('checked_out_by_user_id');
            $table->text('check_out_notes')->nullable()->after('check_in_notes');

            $table->index(['check_in', 'status'], 'idx_res_check_in_status');
            $table->index(['check_out', 'status'], 'idx_res_check_out_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('idx_res_check_in_status');
            $table->dropIndex('idx_res_check_out_status');
            $table->dropForeign(['checked_in_by_user_id']);
            $table->dropForeign(['checked_out_by_user_id']);
            $table->dropColumn([
                'checked_in_at',
                'checked_out_at',
                'checked_in_by_user_id',
                'checked_out_by_user_id',
                'check_in_notes',
                'check_out_notes',
            ]);
        });
    }
};
