<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ceramic_lines', function (Blueprint $table) {
            $table->id();
            $table->string('name');           // Tên dòng gốm
            $table->string('origin');         // Địa phương / quốc gia
            $table->string('country');        // Quốc gia
            $table->string('era')->nullable();           // Niên đại
            $table->text('description')->nullable();     // Mô tả ngắn
            $table->string('image_url')->nullable();     // Ảnh đại diện
            $table->string('style')->nullable();         // Phong cách (men ngọc, hoa lam, ...)
            $table->boolean('is_featured')->default(false); // Nổi bật
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ceramic_lines');
    }
};
