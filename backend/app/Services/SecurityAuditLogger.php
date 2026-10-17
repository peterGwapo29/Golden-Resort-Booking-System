<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class SecurityAuditLogger
{
    /**
     * Log a security or administrative action in a structured, sanitized format.
     *
     * @param string $event Event identifier (e.g. 'auth.login.success', 'payment.status_updated')
     * @param string $action Human-readable description
     * @param array<string, mixed> $context Additional non-sensitive context
     */
    public static function log(string $event, string $action, array $context = []): void
    {
        $request = request();

        // Strip any potential sensitive keys
        $sanitizedContext = self::sanitize($context);

        $payload = [
            'event' => $event,
            'action' => $action,
            'timestamp' => now()->toIso8601String(),
            'user_id' => $request?->user()?->id,
            'user_role' => $request?->user()?->role,
            'ip' => $request?->ip(),
            'user_agent' => substr((string) $request?->userAgent(), 0, 255),
            'context' => $sanitizedContext,
        ];

        Log::info("[SECURITY_AUDIT] {$event}: {$action}", $payload);
    }

    /**
     * Sanitize context data to ensure sensitive fields are never logged.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    protected static function sanitize(array $data): array
    {
        $sensitiveKeys = [
            'password',
            'password_confirmation',
            'token',
            'plainTextToken',
            'api_key',
            'card_number',
            'cvv',
            'secret',
        ];

        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys, true)) {
                $data[$key] = '***REDACTED***';
            } elseif (is_array($value)) {
                $data[$key] = self::sanitize($value);
            }
        }

        return $data;
    }
}
