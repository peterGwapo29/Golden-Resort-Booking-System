<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateReservationRequest;
use App\Http\Resources\ReservationResource;
use App\Models\Guest;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationController extends Controller
{
    /**
     * Create a new reservation with concurrency locking and server-calculated pricing.
     */
    public function store(CreateReservationRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $reservation = DB::transaction(function () use ($validated) {
            // Lock room record for update to serialize availability checks for this accommodation
            $room = Room::query()
                ->where('slug', $validated['room_slug'])
                ->lockForUpdate()
                ->first();

            if (! $room || ! $room->is_active) {
                abort(422, 'The selected accommodation is currently inactive or unavailable for booking.');
            }

            $checkIn = Carbon::parse($validated['check_in']);
            $checkOut = Carbon::parse($validated['check_out']);
            $nights = (int) $checkIn->diffInDays($checkOut);

            if ($nights <= 0) {
                abort(422, 'Check-out date must be at least one day after check-in.');
            }

            // Count overlapping reservations that block inventory
            $overlappingCount = Reservation::query()
                ->where('room_id', $room->id)
                ->blocksInventory()
                ->overlapping($validated['check_in'], $validated['check_out'])
                ->count();

            if ($overlappingCount >= $room->total_inventory) {
                abort(409, 'The selected accommodation is no longer available for the requested dates.');
            }

            // Server-derived financial calculation
            $nightlyRate = $room->nightly_rate_php;
            $totalPrice = bcmul((string) $nightlyRate, (string) $nights, 2);

            $adults = (int) $validated['adults'];
            $children = (int) ($validated['children'] ?? 0);
            $totalGuests = $adults + $children;

            // Resolve or record guest
            $email = strtolower(trim($validated['guest_email']));
            $guest = Guest::firstOrCreate(
                ['email' => $email],
                [
                    'full_name' => trim($validated['guest_full_name']),
                    'phone' => trim($validated['guest_phone']),
                ]
            );

            // Generate unique, non-sequential public booking reference
            do {
                $randomSuffix = strtoupper(Str::random(4));
                $bookingReference = 'GR-'.$checkIn->format('Ymd').'-'.$randomSuffix;
            } while (Reservation::where('booking_reference', $bookingReference)->exists());

            // Persist reservation record with audit snapshots
            return Reservation::create([
                'booking_reference' => $bookingReference,
                'room_id' => $room->id,
                'guest_id' => $guest->id,
                'check_in' => $validated['check_in'],
                'check_out' => $validated['check_out'],
                'adults' => $adults,
                'children' => $children,
                'total_guests' => $totalGuests,
                'nights' => $nights,
                'nightly_rate_php' => $nightlyRate,
                'total_price_php' => $totalPrice,
                'currency' => 'PHP',
                'status' => 'pending',
                'special_requests' => $validated['special_requests'] ?? null,
                'guest_name_snapshot' => trim($validated['guest_full_name']),
                'guest_email_snapshot' => $email,
                'guest_phone_snapshot' => trim($validated['guest_phone']),
            ]);
        });

        $reservation->load(['room', 'guest']);

        return (new ReservationResource($reservation))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Retrieve a reservation using unguessable reference and guest email verification.
     */
    public function show(Request $request, string $reference): ReservationResource
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $reservation = Reservation::query()
            ->with(['room', 'guest'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        $providedEmail = strtolower(trim($request->input('email')));
        $storedEmail = strtolower(trim($reservation->guest_email_snapshot));

        if ($providedEmail !== $storedEmail) {
            abort(404, 'Reservation not found.');
        }

        return new ReservationResource($reservation);
    }
}
