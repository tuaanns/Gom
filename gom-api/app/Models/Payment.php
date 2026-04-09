<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Payment extends Model {
    protected $fillable = ['user_id','package_id','package_name','amount_vnd','credit_amount','hex_id','status','sepay_tx_id','expired_at'];
    protected $casts = ['expired_at'=>'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}
