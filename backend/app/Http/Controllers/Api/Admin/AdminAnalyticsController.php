<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsReportService $analyticsService
    ) {}

    /**
     * Return comprehensive resort analytics and operational intelligence.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preset' => ['nullable', 'string', 'in:7d,30d,this_month,last_month,ytd,custom'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $preset = $validated['preset'] ?? '30d';
        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;

        $range = $this->analyticsService->resolveDateRange($preset, $startDate, $endDate);
        $data = $this->analyticsService->generateMetrics($range);

        return response()->json($data);
    }

    /**
     * Export analytics data to an RFC 4180 compliant CSV spreadsheet.
     */
    public function exportCsv(Request $request): Response
    {
        $validated = $request->validate([
            'preset' => ['nullable', 'string', 'in:7d,30d,this_month,last_month,ytd,custom'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $preset = $validated['preset'] ?? '30d';
        $startDate = $validated['start_date'] ?? null;
        $endDate = $validated['end_date'] ?? null;

        $range = $this->analyticsService->resolveDateRange($preset, $startDate, $endDate);
        $data = $this->analyticsService->generateMetrics($range);
        $csvContent = $this->analyticsService->generateCsv($data);

        $filename = sprintf(
            'golden-resort-analytics-%s-to-%s.csv',
            $data['range']['start_date'],
            $data['range']['end_date']
        );

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }
}
