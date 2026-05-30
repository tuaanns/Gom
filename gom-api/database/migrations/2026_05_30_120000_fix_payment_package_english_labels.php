<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('payment_packages')) {
            return;
        }

        $updates = [
            1 => ['name_en' => 'Basic', 'discount_en' => null],
            2 => ['name_en' => 'Popular', 'discount_en' => 'Save 20%'],
            3 => ['name_en' => 'Expert', 'discount_en' => '-30%'],
        ];

        foreach ($updates as $id => $values) {
            DB::table('payment_packages')
                ->where('id', $id)
                ->update($values);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('payment_packages')) {
            return;
        }

        DB::table('payment_packages')
            ->whereIn('id', [1, 2, 3])
            ->update([
                'name_en' => null,
                'discount_en' => null,
            ]);
    }
};
