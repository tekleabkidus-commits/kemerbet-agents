<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notices', function (Blueprint $table) {
            // Who sees this notice: 'agent' (agent secret page), 'player'
            // (public widget home), or 'both'. Existing rows default to 'agent'
            // so nothing already created suddenly shows to players.
            $table->string('audience', 10)->default('agent')->after('priority');
            // Optional YouTube URL rendered inside the player notice board.
            $table->string('video_url', 500)->nullable()->after('audience');
            $table->index('audience');
        });
    }

    public function down(): void
    {
        Schema::table('notices', function (Blueprint $table) {
            $table->dropIndex(['audience']);
            $table->dropColumn(['audience', 'video_url']);
        });
    }
};
