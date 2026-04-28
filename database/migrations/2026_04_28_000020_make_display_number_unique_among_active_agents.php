<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE agents DROP CONSTRAINT agents_display_number_unique');
        DB::statement('CREATE UNIQUE INDEX agents_display_number_unique ON agents (display_number) WHERE deleted_at IS NULL');
    }

    public function down(): void
    {
        // Rollback may fail if soft-deleted agents share display_number values
        // with active agents. This is acceptable — the partial index is the
        // correct long-term state for a soft-delete-aware unique constraint.
        DB::statement('DROP INDEX agents_display_number_unique');
        DB::statement('ALTER TABLE agents ADD CONSTRAINT agents_display_number_unique UNIQUE (display_number)');
    }
};
