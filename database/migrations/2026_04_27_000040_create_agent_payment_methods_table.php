<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_payment_methods', function (Blueprint $table) {
            $table->foreignId('agent_id')->constrained('agents')->onDelete('cascade');
            $table->foreignId('payment_method_id')->constrained('payment_methods')->onDelete('restrict');
            $table->timestamp('created_at')->nullable();

            $table->primary(['agent_id', 'payment_method_id']);
            $table->index('agent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_payment_methods');
    }
};
