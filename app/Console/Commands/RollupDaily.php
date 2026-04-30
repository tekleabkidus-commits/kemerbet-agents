<?php

namespace App\Console\Commands;

use App\Services\DailyStatsService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class RollupDaily extends Command
{
    protected $signature = 'agents:rollup-daily
        {--date= : Specific date to rollup (YYYY-MM-DD in EAT)}
        {--days= : Backfill last N days}';

    protected $description = 'Aggregate raw events into daily_stats rows';

    public function handle(DailyStatsService $service): int
    {
        if ($date = $this->option('date')) {
            $service->rollupDay(Carbon::parse($date));

            return self::SUCCESS;
        }

        if ($days = $this->option('days')) {
            for ($i = (int) $days; $i >= 1; $i--) {
                $service->rollupDay(now()->subDays($i));
            }

            return self::SUCCESS;
        }

        $service->rollupDay(now()->subDay());

        return self::SUCCESS;
    }
}
