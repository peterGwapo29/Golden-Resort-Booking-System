<?php

use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Golden Resort Booking System
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{slug}', [RoomController::class, 'show']);
    Route::get('/availability', AvailabilityController::class);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::get('/reservations/{reference}', [ReservationController::class, 'show']);
});

// Root API endpoints without v1 prefix for direct frontend compatibility
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{slug}', [RoomController::class, 'show']);
Route::get('/availability', AvailabilityController::class);
Route::post('/reservations', [ReservationController::class, 'store']);
Route::get('/reservations/{reference}', [ReservationController::class, 'show']);
