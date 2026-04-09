<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('package_id');
            $table->string('package_name');
            $table->decimal('amount_vnd', 12, 0);
            $table->integer('credit_amount');
            $table->string('hex_id', 20)->unique()->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->string('sepay_tx_id')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('payments'); }
};
