<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TokenHistory extends Model {
    protected $table = 'token_history';
    protected $fillable = ['user_id','type','amount','description'];
    public function user() { return $this->belongsTo(User::class); }
}
