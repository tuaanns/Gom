<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentPackage extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_en',
        'price',
        'credits',
        'featured',
        'discount',
        'discount_en',
    ];

    protected $casts = [
        'price' => 'float',
        'credits' => 'integer',
        'featured' => 'boolean',
    ];
}
