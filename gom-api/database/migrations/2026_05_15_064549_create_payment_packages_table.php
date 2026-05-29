<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('price', 15, 2);
            $table->integer('credits');
            $table->boolean('featured')->default(false);
            $table->string('discount')->nullable();
            $table->timestamps();
        });

        // Insert default packages
        DB::table('payment_packages')->insert([
            [
                'name' => 'Cơ Bản',
                'price' => 150000,
                'credits' => 10,
                'featured' => false,
                'discount' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Phổ Biến',
                'price' => 600000,
                'credits' => 50,
                'featured' => true,
                'discount' => 'Tiết kiệm 20%',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Chuyên Gia',
                'price' => 2000000,
                'credits' => 200,
                'featured' => false,
                'discount' => '-30%',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_packages');
    }
};
