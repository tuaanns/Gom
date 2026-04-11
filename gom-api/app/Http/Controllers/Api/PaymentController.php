<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\TokenHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class PaymentController extends Controller
{
    const SECRET_XOR_KEY = 0x5EAFB;
    const FREE_LIMIT = 5;
    const PACKAGES = [
        1 => ['name'=>'Goi Co Ban',    'amount_vnd'=>150000,  'credit'=>10],
        2 => ['name'=>'Goi Pho Bien',  'amount_vnd'=>600000,  'credit'=>50],
        3 => ['name'=>'Goi Chuyen Gia','amount_vnd'=>2000000, 'credit'=>200],
    ];

    private function encodeId(int $id): string {
        return strtoupper(dechex($id ^ self::SECRET_XOR_KEY));
    }

    public function getStatus(Request $request) {
        $user = auth()->user();
        return response()->json([
            'token_balance'         => (float)$user->token_balance,
            'free_predictions_used' => (int)$user->free_predictions_used,
            'free_limit'            => self::FREE_LIMIT,
            'can_predict'           => $user->free_predictions_used < self::FREE_LIMIT || $user->token_balance > 0,
        ]);
    }

    public function getPackages() {
        return response()->json(['packages' => self::PACKAGES]);
    }

    public function getHistory(Request $request) {
        $history = TokenHistory::where('user_id', auth()->id())->latest()->take(30)->get();
        return response()->json(['data' => $history]);
    }

    public function createPayment(Request $request) {
        $request->validate(['package_id' => 'required|integer|in:1,2,3']);
        $pkg = self::PACKAGES[$request->package_id];
        $payment = Payment::create([
            'user_id'      => auth()->id(),
            'package_id'   => $request->package_id,
            'package_name' => $pkg['name'],
            'amount_vnd'   => $pkg['amount_vnd'],
            'credit_amount'=> $pkg['credit'],
            'status'       => 'pending',
            'expired_at'   => Carbon::now()->addMinutes(60),
        ]);
        $hexId = $this->encodeId($payment->id);
        $payment->update(['hex_id' => $hexId]);
        $siteName = env('SEPAY_SITE_NAME', 'GOMAI');
        return response()->json([
            'payment_id'       => $payment->id,
            'hex_id'           => $hexId,
            'package'          => $pkg,
            'transfer_content' => strtoupper($siteName).'NAPTOKEN'.$hexId,
            'bank_info'        => [
                'bank'    => env('SEPAY_BANK_NAME', 'MB Bank'),
                'account' => env('SEPAY_BANK_ACCOUNT', '0123456789'),
                'owner'   => env('SEPAY_BANK_OWNER', 'NGUYEN VAN A'),
            ],
            'expired_at' => $payment->expired_at,
        ]);
    }

    public function checkStatus(Request $request, $paymentId) {
        $payment = Payment::where('id', $paymentId)->where('user_id', auth()->id())->firstOrFail();
        if ($payment->status === 'completed') {
            return response()->json(['status'=>'completed','credit_amount'=>$payment->credit_amount]);
        }
        if ($payment->status === 'failed' || ($payment->expired_at && Carbon::now()->gt($payment->expired_at))) {
            $payment->update(['status'=>'failed']);
            return response()->json(['status'=>'failed']);
        }
        // Poll SePay
        $apiKey = env('SEPAY_API_KEY', '');
        if ($apiKey) {
            try {
                $resp = Http::withHeaders(['Authorization'=>'Bearer '.$apiKey])
                    ->get('https://my.sepay.vn/userapi/transactions/list', ['limit'=>20]);
                if ($resp->successful()) {
                    $siteName = strtoupper(env('SEPAY_SITE_NAME', 'GOMAI'));
                    foreach (($resp->json()['transactions'] ?? []) as $tx) {
                        $content = strtoupper($tx['transaction_content'] ?? '');
                        if (str_contains($content, $siteName.'NAPTOKEN'.$payment->hex_id)) {
                            if ((float)($tx['amount_in'] ?? 0) >= (float)$payment->amount_vnd) {
                                $payment->update(['status'=>'completed','sepay_tx_id'=>$tx['id'] ?? null]);
                                $user = auth()->user();
                                $user->increment('token_balance', $payment->credit_amount);
                                TokenHistory::create(['user_id'=>$user->id,'type'=>'in','amount'=>$payment->credit_amount,'description'=>'Nap tien: '.$payment->package_name]);
                            }
                        }
                    }
                }
            } catch (\Exception $e) {}
        }
        return response()->json(['status'=>'pending']);
    }

    public function testCompletePayment(Request $request, $paymentId) {
        $payment = Payment::where('id', $paymentId)->where('user_id', auth()->id())->firstOrFail();
        if ($payment->status !== 'completed') {
            $payment->update(['status'=>'completed']);
            $user = auth()->user();
            $user->increment('token_balance', $payment->credit_amount);
            TokenHistory::create(['user_id'=>$user->id,'type'=>'in','amount'=>$payment->credit_amount,'description'=>'Nap tien (TEST): '.$payment->package_name]);
        }
        return response()->json(['status'=>'completed','credit_amount'=>$payment->credit_amount]);
    }
}

