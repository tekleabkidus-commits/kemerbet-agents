<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            // Pinned agents are shown at the top of the agent lists.
            // Timestamp (not boolean) so multiple pinned agents have a stable
            // order: oldest pin first.
            $table->timestamp('pinned_at')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn('pinned_at');
        });
    }
};
