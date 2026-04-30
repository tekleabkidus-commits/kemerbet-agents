<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('notification_type', 64);
            $table->timestamp('reference_timestamp');
            $table->jsonb('payload')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['agent_id', 'notification_type', 'reference_timestamp'], 'notification_log_dedup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_log');
    }
};
