<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pottery extends Model
{
    protected $fillable = [
        'user_id',
        'image_path',
        'predicted_label',
        'country',
        'era',
        'confidence',
        'debate_data',
    ];
}
