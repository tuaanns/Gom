<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('token_balance', 10, 1)->default(0)->after('password');
            $table->integer('free_predictions_used')->default(0)->after('token_balance');
        });
    }
    public function down(): void {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['token_balance', 'free_predictions_used']);
        });
    }
};
