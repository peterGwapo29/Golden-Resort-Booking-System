<?php

use App\Http\Controllers\Api\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminCalendarController;
use App\Http\Controllers\Api\Admin\AdminCheckInOutController;
use App\Http\Controllers\Api\Admin\AdminCustomerController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminHousekeepingController;
use App\Http\Controllers\Api\Admin\AdminPaymentController;
use App\Http\Controllers\Api\Admin\AdminReservationController;
use App\Http\Controllers\Api\Admin\AdminRoomController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes - Golden Resort Booking System (Phase 3)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{slug}', [RoomController::class, 'show']);
    Route::get('/availability', AvailabilityController::class)->middleware('throttle:30,1');
    Route::post('/reservations', [ReservationController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/reservations/{reference}', [ReservationController::class, 'show']);
});

// Root API endpoints without v1 prefix for direct frontend compatibility
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/rooms/{slug}', [RoomController::class, 'show']);
Route::get('/availability', AvailabilityController::class)->middleware('throttle:30,1');
Route::post('/reservations', [ReservationController::class, 'store'])->middleware('throttle:10,1');
Route::get('/reservations/{reference}', [ReservationController::class, 'show']);

/*
|--------------------------------------------------------------------------
| Admin Management Routes (Phase 4 - Protected by Sanctum & Admin Role)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->group(function () {
    // Authentication
    Route::post('/login', [AdminAuthController::class, 'login'])->middleware('throttle:6,1');

    // Protected endpoints
    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::get('/me', [AdminAuthController::class, 'me']);
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
        Route::get('/analytics/export', [AdminAnalyticsController::class, 'exportCsv']);

        // Accommodations management
        Route::get('/rooms', [AdminRoomController::class, 'index']);
        Route::post('/rooms', [AdminRoomController::class, 'store']);
        Route::get('/rooms/{id}', [AdminRoomController::class, 'show']);
        Route::put('/rooms/{id}', [AdminRoomController::class, 'update']);
        Route::post('/rooms/{id}', [AdminRoomController::class, 'update']);
        Route::patch('/rooms/{id}/toggle-active', [AdminRoomController::class, 'toggleActive']);
        Route::delete('/rooms/{id}', [AdminRoomController::class, 'destroy']);

        // Room availability calendar & schedule
        Route::get('/calendar/schedule', [AdminCalendarController::class, 'schedule']);
        Route::get('/calendar/quick-check', [AdminCalendarController::class, 'quickCheck']);

        // Housekeeping & maintenance operations
        Route::get('/housekeeping/rooms', [AdminHousekeepingController::class, 'rooms']);
        Route::patch('/housekeeping/rooms/{id}/status', [AdminHousekeepingController::class, 'updateRoomStatus']);
        Route::get('/housekeeping/tasks', [AdminHousekeepingController::class, 'tasks']);
        Route::post('/housekeeping/tasks', [AdminHousekeepingController::class, 'storeTask']);
        Route::patch('/housekeeping/tasks/{id}/status', [AdminHousekeepingController::class, 'updateTaskStatus']);
        Route::get('/housekeeping/staff', [AdminHousekeepingController::class, 'staff']);

        // Front desk check-in and check-out management
        Route::get('/check-in-out/overview', [AdminCheckInOutController::class, 'overview']);
        Route::post('/check-in-out/{id}/check-in', [AdminCheckInOutController::class, 'checkIn']);
        Route::post('/check-in-out/{id}/check-out', [AdminCheckInOutController::class, 'checkOut']);

        // Reservation management & status transitions
        Route::get('/reservations', [AdminReservationController::class, 'index']);
        Route::get('/reservations/{id}', [AdminReservationController::class, 'show']);
        Route::patch('/reservations/{id}/status', [AdminReservationController::class, 'updateStatus']);

        // Customer management
        Route::get('/customers', [AdminCustomerController::class, 'index']);
        Route::get('/customers/{id}', [AdminCustomerController::class, 'show']);

        // Payment records & status updates
        Route::get('/payments', [AdminPaymentController::class, 'index']);
        Route::post('/payments', [AdminPaymentController::class, 'store']);
        Route::patch('/payments/{id}/status', [AdminPaymentController::class, 'updateStatus']);

        // Refund management
        Route::post('/payments/{id}/refunds', [AdminPaymentController::class, 'storeRefund']);
        Route::get('/payments/{id}/refunds', [AdminPaymentController::class, 'refunds']);
        Route::get('/refunds', [AdminPaymentController::class, 'allRefunds']);
        Route::patch('/refunds/{id}/status', [AdminPaymentController::class, 'updateRefundStatus']);
    });
});
