<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Prediction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'image',
        'final_prediction',
        'country',
        'era',
        'result_json',
    ];

    protected $casts = [
        'result_json' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
