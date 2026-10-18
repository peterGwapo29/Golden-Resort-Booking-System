<?php

use App\Http\Controllers\Api\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminCalendarController;
use App\Http\Controllers\Api\Admin\AdminCheckInOutController;
use App\Http\Controllers\Api\Admin\AdminCustomerController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminHousekeepingController;
use App\Http\Controllers\Api\Admin\AdminMaintenanceController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\AdminPaymentController;
use App\Http\Controllers\Api\Admin\AdminReservationController;
use App\Http\Controllers\Api\Admin\AdminRestrictionController;
use App\Http\Controllers\Api\Admin\AdminRoomController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\Staff\StaffDashboardController;
use App\Http\Controllers\Api\Staff\StaffProfileController;
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
| Staff Portal Routes (Protected by Sanctum & Active Status)
|--------------------------------------------------------------------------
*/
Route::prefix('staff')->middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/dashboard', [StaffDashboardController::class, 'index']);
    Route::get('/profile', [StaffProfileController::class, 'show']);
    Route::put('/profile', [StaffProfileController::class, 'update']);
    Route::post('/profile/password', [StaffProfileController::class, 'changePassword']);
});

/*
|--------------------------------------------------------------------------
| Admin & Operations Management Routes (Protected by Sanctum & Active Status)
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->group(function () {
    // Authentication
    Route::post('/login', [AdminAuthController::class, 'login'])->middleware('throttle:6,1');

    // Protected endpoints for active staff & admins
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::get('/me', [AdminAuthController::class, 'me']);

        // Profile shortcut endpoints for admin portal
        Route::get('/profile', [StaffProfileController::class, 'show']);
        Route::put('/profile', [StaffProfileController::class, 'update']);
        Route::post('/profile/password', [StaffProfileController::class, 'changePassword']);

        // Staff accounts and role-based access management (admin only)
        Route::get('/staff', [AdminStaffController::class, 'index'])->middleware('admin');
        Route::post('/staff', [AdminStaffController::class, 'store'])->middleware('admin');
        Route::get('/staff/{id}', [AdminStaffController::class, 'show'])->middleware('admin');
        Route::put('/staff/{id}', [AdminStaffController::class, 'update'])->middleware('admin');
        Route::patch('/staff/{id}/toggle-active', [AdminStaffController::class, 'toggleActive'])->middleware('admin');
        Route::post('/staff/{id}/reset-password', [AdminStaffController::class, 'resetPassword'])->middleware('admin');

        // Executive & Financial endpoints (strictly admin only)
        Route::middleware('admin')->group(function () {
            Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
            Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
            Route::get('/analytics/export', [AdminAnalyticsController::class, 'exportCsv']);

            // Accommodations write operations
            Route::post('/rooms', [AdminRoomController::class, 'store']);
            Route::put('/rooms/{id}', [AdminRoomController::class, 'update']);
            Route::post('/rooms/{id}', [AdminRoomController::class, 'update']);
            Route::patch('/rooms/{id}/toggle-active', [AdminRoomController::class, 'toggleActive']);
            Route::delete('/rooms/{id}', [AdminRoomController::class, 'destroy']);

            // Payment records & status updates
            Route::get('/payments', [AdminPaymentController::class, 'index']);
            Route::post('/payments', [AdminPaymentController::class, 'store']);
            Route::patch('/payments/{id}/status', [AdminPaymentController::class, 'updateStatus']);

            // Refund management
            Route::post('/payments/{id}/refunds', [AdminPaymentController::class, 'storeRefund']);
            Route::get('/payments/{id}/refunds', [AdminPaymentController::class, 'refunds']);
            Route::get('/refunds', [AdminPaymentController::class, 'allRefunds']);
            Route::patch('/refunds/{id}/status', [AdminPaymentController::class, 'updateRefundStatus']);

            // Automated notification logs, read tracking & on-demand dispatch
            Route::get('/notifications', [AdminNotificationController::class, 'index']);
            Route::get('/notifications/unread-count', [AdminNotificationController::class, 'unreadCount']);
            Route::post('/notifications/mark-all-read', [AdminNotificationController::class, 'markAllAsRead']);
            Route::patch('/notifications/{id}/read', [AdminNotificationController::class, 'markAsRead']);
            Route::patch('/notifications/{id}/unread', [AdminNotificationController::class, 'markAsUnread']);
            Route::get('/reservations/{id}/notifications', [AdminNotificationController::class, 'reservationNotifications']);
            Route::post('/reservations/{id}/notifications/send', [AdminNotificationController::class, 'sendReservationNotification']);
            Route::post('/notifications/{id}/retry', [AdminNotificationController::class, 'retry']);
        });

        // Accommodations and calendar reading (permission: rooms.view)
        Route::middleware('permission:rooms.view')->group(function () {
            Route::get('/rooms', [AdminRoomController::class, 'index']);
            Route::get('/rooms/{id}', [AdminRoomController::class, 'show']);
            Route::get('/calendar/schedule', [AdminCalendarController::class, 'schedule']);
            Route::get('/calendar/quick-check', [AdminCalendarController::class, 'quickCheck']);
        });

        // Housekeeping & maintenance operations (permission: housekeeping.manage)
        Route::middleware('permission:housekeeping.manage')->group(function () {
            Route::get('/housekeeping/rooms', [AdminHousekeepingController::class, 'rooms']);
            Route::patch('/housekeeping/rooms/{id}/status', [AdminHousekeepingController::class, 'updateRoomStatus']);
            Route::get('/housekeeping/tasks', [AdminHousekeepingController::class, 'tasks']);
            Route::post('/housekeeping/tasks', [AdminHousekeepingController::class, 'storeTask']);
            Route::patch('/housekeeping/tasks/{id}/status', [AdminHousekeepingController::class, 'updateTaskStatus']);
            Route::get('/housekeeping/staff', [AdminHousekeepingController::class, 'staff']);
            Route::post('/housekeeping/tasks/{id}/start', [AdminHousekeepingController::class, 'start']);
            Route::post('/housekeeping/tasks/{id}/progress', [AdminHousekeepingController::class, 'progress']);
            Route::post('/housekeeping/tasks/{id}/submit-review', [AdminHousekeepingController::class, 'submitReview']);
            Route::post('/housekeeping/tasks/{id}/review', [AdminHousekeepingController::class, 'review']);
            Route::get('/housekeeping/tasks/{id}/history', [AdminHousekeepingController::class, 'history']);
        });

        // Front desk check-in and check-out management (permission: checkin.manage)
        Route::middleware('permission:checkin.manage')->group(function () {
            Route::get('/check-in-out/overview', [AdminCheckInOutController::class, 'overview']);
            Route::post('/check-in-out/{id}/check-in', [AdminCheckInOutController::class, 'checkIn']);
            Route::post('/check-in-out/{id}/check-out', [AdminCheckInOutController::class, 'checkOut']);
        });

        // Reservation & guest viewing (permission: reservations.view)
        Route::middleware('permission:reservations.view')->group(function () {
            Route::get('/reservations', [AdminReservationController::class, 'index']);
            Route::get('/reservations/{id}', [AdminReservationController::class, 'show']);
            Route::get('/customers', [AdminCustomerController::class, 'index']);
            Route::get('/customers/{id}', [AdminCustomerController::class, 'show']);
        });

        // Reservation creation & status modifications (permission: reservations.manage)
        Route::middleware('permission:reservations.manage')->group(function () {
            Route::post('/reservations', [AdminReservationController::class, 'store']);
            Route::patch('/reservations/{id}/status', [AdminReservationController::class, 'updateStatus']);
        });

        // Maintenance request viewing & staff workflow actions (permission: maintenance.view)
        Route::middleware('permission:maintenance.view')->group(function () {
            Route::get('/maintenance', [AdminMaintenanceController::class, 'index']);
            Route::get('/maintenance/stats', [AdminMaintenanceController::class, 'stats']);
            Route::get('/maintenance/assignees', [AdminMaintenanceController::class, 'assignees']);
            Route::get('/maintenance/{id}', [AdminMaintenanceController::class, 'show']);
            Route::get('/maintenance/{id}/history', [AdminMaintenanceController::class, 'history']);

            // Staff execution endpoints (validated by controller for assignment ownership or manager role)
            Route::post('/maintenance/{id}/acknowledge', [AdminMaintenanceController::class, 'acknowledge']);
            Route::post('/maintenance/{id}/start', [AdminMaintenanceController::class, 'start']);
            Route::post('/maintenance/{id}/progress', [AdminMaintenanceController::class, 'progress']);
            Route::post('/maintenance/{id}/submit-review', [AdminMaintenanceController::class, 'submitReview']);

            // Accommodation availability restriction viewing & conflict checking
            Route::get('/restrictions', [AdminRestrictionController::class, 'index']);
            Route::get('/restrictions/{id}', [AdminRestrictionController::class, 'show']);
            Route::post('/restrictions/check-conflicts', [AdminRestrictionController::class, 'checkConflicts']);
        });

        // Maintenance request management & administrative operations (permission: maintenance.manage)
        Route::middleware('permission:maintenance.manage')->group(function () {
            Route::post('/maintenance', [AdminMaintenanceController::class, 'store']);
            Route::put('/maintenance/{id}', [AdminMaintenanceController::class, 'update']);
            Route::post('/maintenance/{id}', [AdminMaintenanceController::class, 'update']);
            Route::patch('/maintenance/{id}/status', [AdminMaintenanceController::class, 'updateStatus']);
            Route::post('/maintenance/{id}/assign', [AdminMaintenanceController::class, 'assign']);
            Route::post('/maintenance/{id}/review', [AdminMaintenanceController::class, 'review']);
            Route::delete('/maintenance/{id}', [AdminMaintenanceController::class, 'destroy']);
            Route::delete('/maintenance/{id}/attachments/{attachmentId}', [AdminMaintenanceController::class, 'destroyAttachment']);

            // Accommodation availability restriction management & clearance
            Route::post('/restrictions', [AdminRestrictionController::class, 'store']);
            Route::post('/restrictions/{id}/clear', [AdminRestrictionController::class, 'clear']);
            Route::post('/restrictions/{id}/cancel', [AdminRestrictionController::class, 'cancel']);
        });
    });
});
