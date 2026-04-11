<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CeramicLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'origin',
        'country',
        'era',
        'description',
        'image_url',
        'style',
        'is_featured',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
    ];
}
