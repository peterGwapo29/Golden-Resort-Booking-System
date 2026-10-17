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
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('category'); // room, suite, villa
            $table->string('tagline');
            $table->text('description');
            $table->json('long_description');
            $table->decimal('nightly_rate_php', 10, 2);
            $table->unsignedInteger('total_inventory')->default(1);
            $table->unsignedSmallInteger('max_guests');
            $table->unsignedSmallInteger('adults_capacity');
            $table->unsignedSmallInteger('children_capacity');
            $table->string('bed_configuration');
            $table->unsignedSmallInteger('size_sqm');
            $table->string('view');
            $table->json('amenities');
            $table->json('featured_image');
            $table->json('gallery');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
