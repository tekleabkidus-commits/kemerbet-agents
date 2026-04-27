<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->integer('display_number')->unique();
            $table->string('telegram_username', 100);
            $table->string('status', 20)->default('active');
            $table->decimal('min_birr', 18, 4)->default(25.0000);
            $table->decimal('max_birr', 18, 4)->default(25000.0000);
            $table->text('notes')->nullable();
            $table->timestamp('live_until')->nullable();
            $table->timestamp('last_status_change_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Partial index for querying visible agents
            $table->index('live_until'); // Laravel doesn't support partial indexes natively; we'll add via raw
            $table->index(['status', 'deleted_at']);
        });

        // Partial index: only active, non-deleted agents — used by public endpoint
        DB::statement('CREATE INDEX agents_live_until_partial ON agents (live_until) WHERE deleted_at IS NULL AND status = \'active\'');
    }

    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
