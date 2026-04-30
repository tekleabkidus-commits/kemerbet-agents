<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->text('endpoint');
            $table->string('p256dh_key', 88);
            $table->string('auth_key', 24);
            $table->string('user_agent', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('failed_at')->nullable();

            $table->unique(['agent_id', 'endpoint']);
            $table->index(['agent_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
