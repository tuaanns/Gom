<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('potteries', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('country')->nullable();
            $table->string('era')->nullable();
            $table->json('debate_data')->nullable(); // Save full debate result
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('potteries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['country', 'era', 'debate_data']);
        });
    }
};
