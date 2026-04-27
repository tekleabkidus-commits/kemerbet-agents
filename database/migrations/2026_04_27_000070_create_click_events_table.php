<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('click_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->onDelete('cascade');
            $table->string('click_type', 20);
            $table->string('visitor_id', 64);
            $table->string('ip_address', 45)->nullable();
            $table->text('referrer')->nullable();
            $table->timestamp('created_at');

            $table->index(['agent_id', 'created_at']);
            $table->index('created_at');
            $table->index(['visitor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('click_events');
    }
};
