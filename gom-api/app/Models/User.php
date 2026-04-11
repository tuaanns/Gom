<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens, HasFactory, Notifiable;
    protected $fillable = ['name','email','password','token_balance','free_predictions_used', 'avatar', 'phone'];
    protected $hidden = ['password','remember_token'];
    protected function casts(): array {
        return ['email_verified_at'=>'datetime','password'=>'hashed','token_balance'=>'decimal:1'];
    }
    public function payments() { return $this->hasMany(\App\Models\Payment::class); }
    public function tokenHistories() { return $this->hasMany(\App\Models\TokenHistory::class); }
}
