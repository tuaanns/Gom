<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            // 'debate' = AI multi-agent (mặc định), 'lens' = Google Lens + AI
            $table->string('source_type', 20)->default('debate')->after('result_json');
            $table->json('lens_results')->nullable()->after('source_type');
        });
    }

    public function down(): void
    {
        Schema::table('predictions', function (Blueprint $table) {
            $table->dropColumn(['source_type', 'lens_results']);
        });
    }
};
