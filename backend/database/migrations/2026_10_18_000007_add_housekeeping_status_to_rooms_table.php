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
        Schema::table('rooms', function (Blueprint $table) {
            $table->string('housekeeping_status')->default('clean')->after('is_active')->index();
            $table->timestamp('last_cleaned_at')->nullable()->after('housekeeping_status');
            $table->timestamp('last_inspected_at')->nullable()->after('last_cleaned_at');
            $table->text('housekeeping_notes')->nullable()->after('last_inspected_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropIndex(['housekeeping_status']);
            $table->dropColumn([
                'housekeeping_status',
                'last_cleaned_at',
                'last_inspected_at',
                'housekeeping_notes',
            ]);
        });
    }
};
