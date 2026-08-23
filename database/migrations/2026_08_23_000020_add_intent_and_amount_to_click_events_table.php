<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('click_events', function (Blueprint $table) {
            // What the player intended when they clicked:
            //   'deposit'    — deposit contact (existing behavior)
            //   'withdrawal' — withdrawal contact via the amount flow
            //   'contact'    — plain "Contact" button (no transaction)
            // Kept nullable + defaulted so existing rows and the legacy
            // click_type column continue to work.
            $table->string('intent', 20)->nullable()->after('click_type');

            // The requested withdrawal amount (ETB), when intent = 'withdrawal'.
            // Null for deposits and plain contacts.
            $table->decimal('amount', 18, 4)->nullable()->after('intent');

            // Where the click originated in the widget: 'list', 'recent', etc.
            $table->string('source', 20)->nullable()->after('amount');

            $table->index(['intent', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('click_events', function (Blueprint $table) {
            $table->dropIndex(['intent', 'created_at']);
            $table->dropColumn(['intent', 'amount', 'source']);
        });
    }
};
