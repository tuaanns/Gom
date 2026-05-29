<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // e.g., 'about', 'terms', 'privacy'
            $table->string('title');
            $table->longText('content')->nullable();
            $table->timestamps();
        });

        // Seed default pages
        DB::table('pages')->insert([
            [
                'slug' => 'terms',
                'title' => 'Điều khoản sử dụng',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'privacy',
                'title' => 'Chính sách bảo mật',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'about',
                'title' => 'Về chúng tôi',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'contact',
                'title' => 'Liên hệ',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'history',
                'title' => 'Lịch sử giám định',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'ceramics',
                'title' => 'Dòng gốm',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'home',
                'title' => 'Trang chủ',
                'content' => '',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
