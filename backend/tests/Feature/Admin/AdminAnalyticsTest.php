<?php

namespace Tests\Feature\Admin;

use App\Models\Guest;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Room $deluxeRoom;
    private Room $suiteRoom;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Admin User
        $this->admin = User::factory()->create([
            'email' => 'admin@goldenresort.com',
            'role' => 'admin',
        ]);

        // Create Active Rooms
        $this->deluxeRoom = Room::create([
            'slug' => 'deluxe-ocean-villa',
            'name' => 'Deluxe Ocean Villa',
            'category' => 'villa',
            'tagline' => 'Luxury Villa overlooking the ocean',
            'description' => 'Ocean view villa',
            'long_description' => ['Spacious private patio with direct ocean views.'],
            'nightly_rate_php' => 5000.00,
            'total_inventory' => 2,
            'max_guests' => 4,
            'adults_capacity' => 4,
            'children_capacity' => 2,
            'bed_configuration' => '1 King Bed',
            'size_sqm' => 50,
            'view' => 'Ocean',
            'amenities' => ['Wi-Fi', 'Balcony', 'Air Conditioning'],
            'featured_image' => ['src' => '/images/villa.jpg', 'alt' => 'Deluxe Ocean Villa', 'source' => '/images/villa.jpg'],
            'gallery' => [],
            'is_active' => true,
        ]);

        $this->suiteRoom = Room::create([
            'slug' => 'royal-presidential-suite',
            'name' => 'Royal Presidential Suite',
            'category' => 'suite',
            'tagline' => 'The ultimate VIP sanctuary',
            'description' => 'Luxury suite',
            'long_description' => ['Opulent suites with bespoke service.'],
            'nightly_rate_php' => 12000.00,
            'total_inventory' => 1,
            'max_guests' => 6,
            'adults_capacity' => 4,
            'children_capacity' => 2,
            'bed_configuration' => '2 King Beds',
            'size_sqm' => 95,
            'view' => 'Panoramic',
            'amenities' => ['Wi-Fi', 'Private Jacuzzi'],
            'featured_image' => ['src' => '/images/suite.jpg', 'alt' => 'Royal Suite', 'source' => '/images/suite.jpg'],
            'gallery' => [],
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/admin/analytics');
        $response->assertUnauthorized();

        $export = $this->getJson('/api/admin/analytics/export');
        $export->assertUnauthorized();
    }

    public function test_admin_can_retrieve_analytics_with_default_range(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/admin/analytics');

        $response->assertOk()
            ->assertJsonStructure([
                'range' => ['start_date', 'end_date', 'preset', 'days_count'],
                'kpis' => [
                    'occupancy_rate_percent',
                    'total_room_nights_occupied',
                    'total_room_nights_available',
                    'adr_php',
                    'alos_nights',
                    'total_bookings',
                    'confirmed_stays',
                    'cancellations',
                    'cancellation_rate_percent',
                    'no_shows',
                    'no_show_rate_percent',
                ],
                'financials' => [
                    'gross_collections_php',
                    'completed_refunds_php',
                    'net_collections_php',
                    'outstanding_balances_php',
                    'currency',
                ],
                'occupancy_trends' => [
                    'daily',
                    'weekly',
                    'monthly',
                ],
                'room_type_performance',
            ]);

        $this->assertEquals('30d', $response->json('range.preset'));
    }

    public function test_occupancy_and_hospitality_kpis_calculation(): void
    {
        Sanctum::actingAs($this->admin);

        $today = Carbon::today()->format('Y-m-d');
        $guest = Guest::create([
            'full_name' => 'Maria Santos',
            'email' => 'maria@example.com',
            'phone' => '+639171234567',
        ]);

        // Reservation 1: 2 nights at Deluxe room (5,000/night = 10,000)
        $res1 = Reservation::create([
            'booking_reference' => 'GR-TEST-001',
            'room_id' => $this->deluxeRoom->id,
            'guest_id' => $guest->id,
            'check_in' => Carbon::parse($today)->subDays(2)->format('Y-m-d'),
            'check_out' => $today,
            'adults' => 2,
            'children' => 0,
            'total_guests' => 2,
            'nights' => 2,
            'nightly_rate_php' => 5000.00,
            'total_price_php' => 10000.00,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'guest_name_snapshot' => 'Maria Santos',
            'guest_email_snapshot' => 'maria@example.com',
            'guest_phone_snapshot' => '+639171234567',
        ]);

        // Reservation 2: 1 night at Suite room (12,000/night = 12,000), cancelled
        $res2 = Reservation::create([
            'booking_reference' => 'GR-TEST-002',
            'room_id' => $this->suiteRoom->id,
            'guest_id' => $guest->id,
            'check_in' => Carbon::parse($today)->subDays(1)->format('Y-m-d'),
            'check_out' => $today,
            'adults' => 2,
            'children' => 0,
            'total_guests' => 2,
            'nights' => 1,
            'nightly_rate_php' => 12000.00,
            'total_price_php' => 12000.00,
            'currency' => 'PHP',
            'status' => 'cancelled',
            'guest_name_snapshot' => 'Maria Santos',
            'guest_email_snapshot' => 'maria@example.com',
            'guest_phone_snapshot' => '+639171234567',
        ]);

        // Reservation 3: 1 night at Deluxe, no_show
        $res3 = Reservation::create([
            'booking_reference' => 'GR-TEST-003',
            'room_id' => $this->deluxeRoom->id,
            'guest_id' => $guest->id,
            'check_in' => Carbon::parse($today)->subDays(1)->format('Y-m-d'),
            'check_out' => $today,
            'adults' => 1,
            'children' => 0,
            'total_guests' => 1,
            'nights' => 1,
            'nightly_rate_php' => 5000.00,
            'total_price_php' => 5000.00,
            'currency' => 'PHP',
            'status' => 'no_show',
            'guest_name_snapshot' => 'Maria Santos',
            'guest_email_snapshot' => 'maria@example.com',
            'guest_phone_snapshot' => '+639171234567',
        ]);

        // Query analytics for 7d preset
        $response = $this->getJson('/api/admin/analytics?preset=7d');

        $response->assertOk();
        $kpis = $response->json('kpis');

        // Total bookings created in range = 3 (1 confirmed, 1 cancelled, 1 no_show)
        $this->assertEquals(3, $kpis['total_bookings']);
        $this->assertEquals(1, $kpis['cancellations']);
        $this->assertEquals(1, $kpis['no_shows']);
        $this->assertEquals(33.3, $kpis['cancellation_rate_percent']);
        $this->assertEquals(33.3, $kpis['no_show_rate_percent']);

        // Stays occupied = 2 room nights (res1 only; cancelled & no_show are excluded)
        $this->assertEquals(2, $kpis['total_room_nights_occupied']);
        // Available room nights in 7 days: (2 deluxe + 1 suite) * 7 = 21
        $this->assertEquals(21, $kpis['total_room_nights_available']);
        // 2 / 21 * 100 = 9.5%
        $this->assertEquals(9.5, $kpis['occupancy_rate_percent']);

        // ADR: 10,000 / 2 occupied nights = 5,000
        $this->assertEquals(5000.00, $kpis['adr_php']);
        // ALOS: 2 nights / 1 valid stay = 2.0
        $this->assertEquals(2.0, $kpis['alos_nights']);
    }

    public function test_financial_reconciliation_in_period(): void
    {
        Sanctum::actingAs($this->admin);

        $guest = Guest::create([
            'full_name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'phone' => '+639170001122',
        ]);

        $res = Reservation::create([
            'booking_reference' => 'GR-FIN-001',
            'room_id' => $this->deluxeRoom->id,
            'guest_id' => $guest->id,
            'check_in' => Carbon::today()->format('Y-m-d'),
            'check_out' => Carbon::today()->addDays(2)->format('Y-m-d'),
            'adults' => 2,
            'children' => 0,
            'total_guests' => 2,
            'nights' => 2,
            'nightly_rate_php' => 5000.00,
            'total_price_php' => 10000.00,
            'currency' => 'PHP',
            'status' => 'confirmed',
            'guest_name_snapshot' => 'Juan Dela Cruz',
            'guest_email_snapshot' => 'juan@example.com',
            'guest_phone_snapshot' => '+639170001122',
        ]);

        // Payment 1: completed 10,000
        $payment = Payment::create([
            'reservation_id' => $res->id,
            'payment_reference' => 'PAY-001',
            'amount' => 10000.00,
            'currency' => 'PHP',
            'payment_method' => 'gcash',
            'status' => 'completed',
            'recorded_by_user_id' => $this->admin->id,
        ]);

        // Refund: completed 2,000
        Refund::create([
            'payment_id' => $payment->id,
            'reservation_id' => $res->id,
            'refund_reference' => 'REF-001',
            'amount' => 2000.00,
            'currency' => 'PHP',
            'reason' => 'Guest adjusted itinerary',
            'status' => 'completed',
            'requested_by_user_id' => $this->admin->id,
            'approved_by_user_id' => $this->admin->id,
        ]);

        $response = $this->getJson('/api/admin/analytics?preset=30d');

        $response->assertOk();
        $financials = $response->json('financials');

        $this->assertEquals(10000.00, $financials['gross_collections_php']);
        $this->assertEquals(2000.00, $financials['completed_refunds_php']);
        $this->assertEquals(8000.00, $financials['net_collections_php']);
    }

    public function test_csv_export_returns_streamed_file_with_safe_formatting(): void
    {
        Sanctum::actingAs($this->admin);

        $response = $this->get('/api/admin/analytics/export?preset=7d');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment;', $response->headers->get('content-disposition'));
        $this->assertStringContainsString('golden-resort-analytics-', $response->headers->get('content-disposition'));

        $content = $response->getContent();
        $this->assertStringContainsString('Golden Resort - Business Intelligence & Operational Report', $content);
        $this->assertStringContainsString('EXECUTIVE SUMMARY METRICS', $content);
        $this->assertStringContainsString('ACCOMMODATION PERFORMANCE', $content);
        $this->assertStringContainsString('DAILY OCCUPANCY BREAKDOWN', $content);
        $this->assertStringContainsString('Deluxe Ocean Villa', $content);
        $this->assertStringContainsString('Royal Presidential Suite', $content);
    }

    public function test_custom_date_range_validation(): void
    {
        Sanctum::actingAs($this->admin);

        // Invalid format
        $response = $this->getJson('/api/admin/analytics?preset=custom&start_date=invalid-date&end_date=2026-10-18');
        $response->assertStatus(422);

        // Valid custom range
        $response = $this->getJson('/api/admin/analytics?preset=custom&start_date=2026-10-01&end_date=2026-10-15');
        $response->assertOk();
        $this->assertEquals('2026-10-01', $response->json('range.start_date'));
        $this->assertEquals('2026-10-15', $response->json('range.end_date'));
        $this->assertEquals(15, $response->json('range.days_count'));
    }
}
