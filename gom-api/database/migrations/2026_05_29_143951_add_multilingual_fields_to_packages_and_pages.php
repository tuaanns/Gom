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
        Schema::table('payment_packages', function (Blueprint $table) {
            $table->string('name_en', 255)->nullable()->after('name');
            $table->string('discount_en', 255)->nullable()->after('discount');
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->string('title_en', 255)->nullable()->after('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_packages', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'discount_en']);
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn('title_en');
        });
    }
};
