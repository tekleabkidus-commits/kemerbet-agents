<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

use function Laravel\Prompts\password;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            try {
                $pw = password(label: 'Admin password for kidus@kemerbet.com', required: true);
            } catch (\Throwable) {
                // Non-interactive mode (CI, testing, migrate:fresh --seed)
                $pw = 'secret-password';
                $this->command?->warn('Using default password (non-interactive mode).');
            }

            Admin::updateOrCreate(
                ['email' => 'kidus@kemerbet.com'],
                [
                    'name' => 'Kidus',
                    'password' => $pw,
                ]
            );
        });
    }
}
