<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CeramicLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'name_en',
        'origin',
        'origin_en',
        'country',
        'country_en',
        'era',
        'era_en',
        'description',
        'description_en',
        'image_url',
        'style',
        'style_en',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
    ];
}
