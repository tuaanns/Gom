<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            if (!Schema::hasColumn('predictions', 'lens_status')) {
                $table->json('lens_status')->nullable()->after('lens_results');
            }
        });
    }

    public function down(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            if (Schema::hasColumn('predictions', 'lens_status')) {
                $table->dropColumn('lens_status');
            }
        });
    }
};
