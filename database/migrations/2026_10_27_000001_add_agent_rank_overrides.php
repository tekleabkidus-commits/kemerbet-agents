<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            // No override means Level 5. Expired overrides also resolve to Level 5.
            $table->unsignedSmallInteger('rank_override_level')->nullable();
            $table->timestampTz('rank_override_expires_at')->nullable();
        });

        Schema::create('agent_rank_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('action', 24);
            $table->unsignedSmallInteger('previous_level');
            $table->unsignedSmallInteger('new_level');
            $table->timestampTz('expires_at')->nullable();
            $table->string('reason', 500);
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_rank_audits');
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn(['rank_override_level', 'rank_override_expires_at']);
        });
    }
};
