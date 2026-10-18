<?php

namespace App\Console\Commands;

use App\Models\Reservation;
use App\Services\FinancialCalculationService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendPaymentRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'resort:send-payment-reminders {--days=3 : Days threshold ahead of check-in to remind guests with balance}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated payment reminder emails to guests with upcoming stays and outstanding balance';

    public function handle(
        NotificationService $notificationService,
        FinancialCalculationService $financialService
    ): int {
        $days = (int) $this->option('days');
        $today = Carbon::today()->toDateString();
        $thresholdDate = Carbon::today()->addDays($days)->toDateString();

        $this->info("Scanning upcoming reservations between {$today} and {$thresholdDate} with outstanding balance...");

        $reservations = Reservation::query()
            ->with(['room', 'guest', 'payments', 'refunds'])
            ->whereBetween('check_in', [$today, $thresholdDate])
            ->whereIn('status', ['confirmed', 'pending'])
            ->get();

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($reservations as $reservation) {
            $remaining = $financialService->outstandingBalance($reservation);
            if ($remaining <= 0) {
                continue;
            }

            $notification = $notificationService->sendPaymentReminder($reservation);
            if ($notification && $notification->wasRecentlyCreated) {
                $sentCount++;
                $this->line("Sent payment reminder for {$reservation->booking_reference} (Balance: ₱".number_format($remaining, 2).')');
            } else {
                $skippedCount++;
            }
        }

        $this->info("Completed. Sent: {$sentCount}, Skipped: {$skippedCount}.");

        return self::SUCCESS;
    }
}
