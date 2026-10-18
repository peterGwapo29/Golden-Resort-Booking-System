<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendCheckInRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'resort:send-check-in-reminders {--date= : Target check-in date in Y-m-d format (defaults to tomorrow)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated upcoming check-in reminder emails to guests arriving soon';

    public function handle(NotificationService $notificationService): int
    {
        $targetDate = $this->option('date') ?: Carbon::tomorrow()->toDateString();
        $this->info("Scanning reservations checking in on {$targetDate}...");

        $reservations = Reservation::query()
            ->with(['room', 'guest'])
            ->whereDate('check_in', $targetDate)
            ->whereIn('status', ['confirmed', 'pending'])
            ->get();

        if ($reservations->isEmpty()) {
            $this->info("No upcoming check-ins found for {$targetDate}.");

            return self::SUCCESS;
        }

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($reservations as $reservation) {
            $notification = $notificationService->sendCheckInReminder($reservation);
            if ($notification && $notification->wasRecentlyCreated) {
                $sentCount++;
                $this->line("Sent reminder for {$reservation->booking_reference} to {$notification->recipient_email}");
            } else {
                $skippedCount++;
            }
        }

        $this->info("Completed. Sent: {$sentCount}, Skipped (Already Sent): {$skippedCount}.");

        return self::SUCCESS;
    }
}
