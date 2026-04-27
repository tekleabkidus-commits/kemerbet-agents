<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $methods = [
                ['slug' => 'telebirr', 'display_name' => 'TeleBirr', 'display_order' => 10],
                ['slug' => 'mpesa', 'display_name' => 'M-Pesa', 'display_order' => 20],
                ['slug' => 'cbe_birr', 'display_name' => 'CBE Birr', 'display_order' => 30],
                ['slug' => 'dashen', 'display_name' => 'Dashen Bank', 'display_order' => 40],
                ['slug' => 'awash', 'display_name' => 'Awash Bank', 'display_order' => 50],
                ['slug' => 'boa', 'display_name' => 'Bank of Abyssinia', 'display_order' => 60],
                ['slug' => 'coop', 'display_name' => 'Cooperative Bank', 'display_order' => 70],
                ['slug' => 'wegagen', 'display_name' => 'Wegagen Bank', 'display_order' => 80],
            ];

            foreach ($methods as $method) {
                PaymentMethod::updateOrCreate(
                    ['slug' => $method['slug']],
                    [
                        'display_name' => $method['display_name'],
                        'display_order' => $method['display_order'],
                        'is_active' => true,
                    ]
                );
            }
        });
    }
}
