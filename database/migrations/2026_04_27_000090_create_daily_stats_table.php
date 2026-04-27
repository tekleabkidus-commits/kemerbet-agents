<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_stats', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->foreignId('agent_id')->nullable()->constrained('agents')->onDelete('set null');
            $table->integer('total_visits')->default(0);
            $table->integer('unique_visitors')->default(0);
            $table->integer('deposit_clicks')->default(0);
            $table->integer('chat_clicks')->default(0);
            $table->integer('minutes_live')->default(0);
            $table->integer('times_went_online')->default(0);
            $table->timestamp('created_at')->nullable();

            $table->unique(['date', 'agent_id']);
            $table->index('date');
            $table->index(['agent_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_stats');
    }
};
