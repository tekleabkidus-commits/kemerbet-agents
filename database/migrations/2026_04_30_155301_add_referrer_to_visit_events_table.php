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
        Schema::table('visit_events', function (Blueprint $table) {
            $table->string('referrer', 2000)->nullable()->after('user_agent');
        });
    }

    public function down(): void
    {
        Schema::table('visit_events', function (Blueprint $table) {
            $table->dropColumn('referrer');
        });
    }
};
