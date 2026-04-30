<?php

namespace Database\Factories;

use App\Models\NotificationLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NotificationLog>
 */
class NotificationLogFactory extends Factory
{
    protected $model = NotificationLog::class;

    public function definition(): array
    {
        return [
            'notification_type' => $this->faker->randomElement(NotificationLog::TYPES),
            'reference_timestamp' => now(),
            'payload' => null,
        ];
    }
}
