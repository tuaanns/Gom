<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update payment_packages
        DB::table('payment_packages')->where('name', 'Cơ Bản')->update([
            'name_en' => 'Basic',
            'discount_en' => null,
        ]);
        DB::table('payment_packages')->where('name', 'Phổ Biến')->update([
            'name_en' => 'Popular',
            'discount_en' => 'Save 20%',
        ]);
        DB::table('payment_packages')->where('name', 'Chuyên Gia')->update([
            'name_en' => 'Expert',
            'discount_en' => '-30%',
        ]);

        // Update pages
        DB::table('pages')->where('slug', 'home')->update(['title_en' => 'Home']);
        DB::table('pages')->where('slug', 'ceramics')->update(['title_en' => 'Ceramic Lines']);
        DB::table('pages')->where('slug', 'history')->update(['title_en' => 'History']);
        DB::table('pages')->where('slug', 'contact')->update(['title_en' => 'Contact']);
        DB::table('pages')->where('slug', 'about')->update(['title_en' => 'About']);
        DB::table('pages')->where('slug', 'terms')->update(['title_en' => 'Terms']);
        DB::table('pages')->where('slug', 'privacy')->update(['title_en' => 'Privacy']);
    }

    public function down(): void
    {
        // Revert updates
        DB::table('payment_packages')->where('name', 'Cơ Bản')->update([
            'name_en' => null,
            'discount_en' => null,
        ]);
        DB::table('payment_packages')->where('name', 'Phổ Biến')->update([
            'name_en' => null,
            'discount_en' => null,
        ]);
        DB::table('payment_packages')->where('name', 'Chuyên Gia')->update([
            'name_en' => null,
            'discount_en' => null,
        ]);

        DB::table('pages')->whereIn('slug', ['home', 'ceramics', 'history', 'contact', 'about', 'terms', 'privacy'])->update([
            'title_en' => null,
        ]);
    }
};
