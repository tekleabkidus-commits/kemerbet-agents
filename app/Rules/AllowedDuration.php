<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates that a requested duration (in minutes) is permitted
 * based on the current time in Africa/Addis_Ababa.
 *
 * Daytime (7:00 AM – 10:59 PM): [15, 30, 45, 60, 120]
 * Sleeping hours (11:00 PM – 6:59 AM): [15, 30, 45, 60]
 *
 * Rule applies at REQUEST time, not session expiry time.
 * An agent requesting 120 min at 9:30 PM (daytime) is allowed
 * even though the session would end at 11:30 PM (sleeping hours).
 */
class AllowedDuration implements ValidationRule
{
    private const DAYTIME_DURATIONS = [15, 30, 45, 60, 120];

    private const SLEEPING_DURATIONS = [15, 30, 45, 60];

    /** Daytime starts at 7:00 AM Africa/Addis_Ababa */
    private const DAYTIME_START_HOUR = 7;

    /** Sleeping hours start at 11:00 PM (23:00) Africa/Addis_Ababa */
    private const SLEEPING_START_HOUR = 23;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $available = self::availableDurations();

        if (! in_array((int) $value, $available, true)) {
            $availableStr = implode(', ', $available);
            $fail("This duration is not available right now. Choose from: {$availableStr} minutes.");
        }
    }

    /**
     * Check whether the current time in Africa/Addis_Ababa is daytime.
     * Daytime: 7:00 AM to 10:59 PM (hour 7..22).
     * Sleeping: 11:00 PM to 6:59 AM (hour 23..6).
     */
    public static function isDaytime(): bool
    {
        $hour = now()->setTimezone('Africa/Addis_Ababa')->hour;

        return $hour >= self::DAYTIME_START_HOUR && $hour < self::SLEEPING_START_HOUR;
    }

    /**
     * Return the list of currently allowed durations.
     * Public static so AgentSecretController can reuse without duplicating logic.
     */
    public static function availableDurations(): array
    {
        return self::isDaytime() ? self::DAYTIME_DURATIONS : self::SLEEPING_DURATIONS;
    }

    /**
     * Return the recommended duration (120 during daytime, null during sleeping).
     */
    public static function recommendedDuration(): ?int
    {
        return self::isDaytime() ? 120 : null;
    }
}
