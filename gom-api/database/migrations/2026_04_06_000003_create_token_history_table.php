<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('token_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['in', 'out']);
            $table->decimal('amount', 10, 1);
            $table->string('description');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('token_history'); }
};
