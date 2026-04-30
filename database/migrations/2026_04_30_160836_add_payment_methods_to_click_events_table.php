<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('click_events', function (Blueprint $table) {
            $table->jsonb('payment_methods')->nullable()->after('referrer');
        });
    }

    public function down(): void
    {
        Schema::table('click_events', function (Blueprint $table) {
            $table->dropColumn('payment_methods');
        });
    }
};
