<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notices', function (Blueprint $table) {
            $table->id();
            $table->string('title', 150)->nullable();
            $table->text('body');
            $table->string('priority', 16)->default('info');
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->boolean('send_push')->default(false);
            $table->foreignId('created_by')->constrained('admins')->onDelete('restrict');
            $table->timestamps();
            $table->softDeletes();

            $table->index('created_by');
            $table->index(['is_active', 'starts_at', 'ends_at'], 'notices_visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notices');
    }
};
