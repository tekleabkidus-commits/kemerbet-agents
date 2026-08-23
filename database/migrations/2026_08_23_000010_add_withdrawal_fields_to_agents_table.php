<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            // Whether this agent handles withdrawals in addition to deposits.
            // false = deposit-only (agent never appears in withdrawal results).
            $table->boolean('accepts_withdrawals')->default(false)->after('pinned_at');

            // The largest single withdrawal this agent can currently pay out.
            // Agent-editable from their secret page; falls back to the global
            // default (withdrawal_max_default setting) when null at creation.
            $table->decimal('withdrawal_max', 18, 4)->nullable()->after('accepts_withdrawals');

            // The agent's payout identifier on the sportsbook side. ADMIN-ONLY:
            // the agent can view it but not edit it. An agent with
            // accepts_withdrawals=true but no withdrawal_id is treated as
            // deposit-only for listing purposes (no valid auto-message possible).
            $table->string('withdrawal_id')->nullable()->after('withdrawal_max');

            // Index the pair used by the withdrawal capacity filter.
            $table->index(['accepts_withdrawals', 'withdrawal_max'], 'agents_withdrawal_capacity_index');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex('agents_withdrawal_capacity_index');
            $table->dropColumn(['accepts_withdrawals', 'withdrawal_max', 'withdrawal_id']);
        });
    }
};
