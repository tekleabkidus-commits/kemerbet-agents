<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agent pairing memory: every agent a player has ever been shown, kept
     * twice — once under the player's DEVICE (random id in the browser) and
     * once under the player's PLAYER ID (from the logged-in account). Reading
     * both lists together is what lets a new account on the same device, or
     * the same account on a new device, get the same agents back.
     */
    public function up(): void
    {
        Schema::create('player_agent_assignments', function (Blueprint $table) {
            $table->id();
            // 'device' | 'player'
            $table->string('subject_type', 10);
            // device: random id generated in the browser; player: site player ID
            $table->string('subject_key', 64);
            $table->foreignId('agent_id')->constrained('agents')->onDelete('cascade');
            // When this agent was first given to the player (never moves).
            $table->timestamp('first_assigned_at');
            // When this agent was last shown to the player (deposit or
            // withdrawal) — "most recently shown first" among previous agents.
            $table->timestamp('last_shown_at')->nullable();
            // When this agent was last shown on the DEPOSIT list. Ranks first,
            // so the player's deposit agents stay their deposit agents (and
            // are tried first for withdrawals) even after a withdrawal had to
            // bring in someone new.
            $table->timestamp('last_deposit_shown_at')->nullable();

            // Also serves lookups by (subject_type, subject_key).
            $table->unique(['subject_type', 'subject_key', 'agent_id'], 'paa_subject_agent_unique');
            $table->index('agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('player_agent_assignments');
    }
};
