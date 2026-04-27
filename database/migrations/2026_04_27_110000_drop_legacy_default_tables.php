<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }

    public function down(): void
    {
        // Not reversible — these tables were Laravel defaults we don't use.
        // Re-run 0001_01_01_000000_create_users_table.php if needed.
    }
};
