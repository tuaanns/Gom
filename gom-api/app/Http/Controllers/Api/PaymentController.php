<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\CreatePaymentRequest;
use App\Models\Payment;
use App\Models\TokenHistory;
use App\Traits\ApiResponses;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use ApiResponses;

    public const SECRET_XOR_KEY = 0x5EAFB;
    public const FREE_LIMIT = 5;

    private function encodeId(int $id): string
    {
        return strtoupper(dechex($id ^ self::SECRET_XOR_KEY));
    }

    public function getStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        return $this->ok([
            'token_balance'         => (float) $user->token_balance,
            'free_predictions_used' => (int) $user->free_predictions_used,
            'free_limit'            => self::FREE_LIMIT,
            'can_predict'           => $user->free_predictions_used < self::FREE_LIMIT || $user->token_balance > 0,
        ]);
    }

    public function getPackages(): JsonResponse
    {
        $packages = \App\Models\PaymentPackage::all()->map(fn ($pkg) => [
            'id'          => $pkg->id,
            'name'        => $pkg->name,
            'name_en'     => $pkg->name_en,
            'price'       => $pkg->price,
            'credits'     => $pkg->credits,
            'featured'    => $pkg->featured,
            'discount'    => $pkg->discount,
            'discount_en' => $pkg->discount_en,
        ])->toArray();
        return $this->ok($packages);
    }

    public function getHistory(Request $request): JsonResponse
    {
        $history = Payment::where('user_id', $request->user()->id)
            ->latest()
            ->take(50)
            ->get()
            ->map(fn (Payment $p) => [
                'id'            => $p->id,
                'package_id'    => $p->package_id,
                'package_name'  => $p->package_name,
                'amount'        => (float) $p->amount_vnd,
                'credit_amount' => (int) $p->credit_amount,
                'status'        => $p->status,
                'created_at'    => $p->created_at,
            ]);

        return $this->ok($history);
    }

    public function getActiveMethod(): JsonResponse
    {
        $method = \App\Models\Setting::getByKey('payment_method', 'sepay');
        return $this->ok(['payment_method' => $method]);
    }

    public function createPayment(CreatePaymentRequest $request): JsonResponse
    {
        $packageId = (int) $request->validated()['package_id'];

        $pkg = \App\Models\PaymentPackage::find($packageId);
        if (!$pkg) {
            return $this->fail('Gói không tồn tại.', 422, 'INVALID_PACKAGE');
        }

        $payment = Payment::create([
            'user_id'       => $request->user()->id,
            'package_id'    => $packageId,
            'package_name'  => $pkg->name,
            'amount_vnd'    => $pkg->price,
            'credit_amount' => $pkg->credits,
            'status'        => 'pending',
            'expired_at'    => Carbon::now()->addMinutes(60),
        ]);

        $hexId = $this->encodeId($payment->id);
        $payment->update(['hex_id' => $hexId]);

        $paymentMethod = \App\Models\Setting::getByKey('payment_method', 'sepay');

        if ($paymentMethod === 'vnpay') {
            $vnp_Url = env('VNP_URL', "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html");
            $vnp_Returnurl = env('VNP_RETURN_URL', "http://localhost:3000/payment/vnpay-return");
            $vnp_TmnCode = env('VNP_TMN_CODE', "2QXGZSTR");
            $vnp_HashSecret = env('VNP_HASH_SECRET', "NDWSHBWWGIPHGLQOQEYVNJVUNWLEQYQW");
            
            $vnp_TxnRef = $payment->id;
            $vnp_OrderInfo = "GOM NAP TOKEN " . $hexId;
            $vnp_OrderType = 'billpayment';
            $vnp_Amount = $pkg->price * 100;
            $vnp_Locale = 'vn';
            $vnp_IpAddr = $request->ip() ?: '127.0.0.1';
            if ($vnp_IpAddr === '::1' || !filter_var($vnp_IpAddr, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $vnp_IpAddr = '127.0.0.1';
            }
            
            $inputData = array(
                "vnp_Version" => "2.1.0",
                "vnp_TmnCode" => $vnp_TmnCode,
                "vnp_Amount" => $vnp_Amount,
                "vnp_Command" => "pay",
                "vnp_CreateDate" => Carbon::now('Asia/Ho_Chi_Minh')->format('YmdHis'),
                "vnp_CurrCode" => "VND",
                "vnp_IpAddr" => $vnp_IpAddr,
                "vnp_Locale" => $vnp_Locale,
                "vnp_OrderInfo" => $vnp_OrderInfo,
                "vnp_OrderType" => $vnp_OrderType,
                "vnp_ReturnUrl" => $vnp_Returnurl,
                "vnp_TxnRef" => $vnp_TxnRef,
            );
            
            ksort($inputData);
            $query = "";
            $i = 0;
            $hashdata = "";
            foreach ($inputData as $key => $value) {
                if ($i == 1) {
                    $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
                } else {
                    $hashdata .= urlencode($key) . "=" . urlencode($value);
                    $i = 1;
                }
                $query .= urlencode($key) . "=" . urlencode($value) . '&';
            }
            
            $vnp_Url = $vnp_Url . "?" . $query;
            if (isset($vnp_HashSecret)) {
                $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
                $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
            }

            return $this->ok([
                'id'               => $payment->id,
                'payment_id'       => $payment->id,
                'hex_id'           => $hexId,
                'amount'           => (float) $pkg->price,
                'transfer_content' => $vnp_OrderInfo,
                'bank_name'        => 'VNPAY',
                'account_number'   => 'Cổng thanh toán',
                'account_name'     => 'VNPay Payment',
                'qr_url'           => $vnp_Url,
                'vnpay_url'        => $vnp_Url,
                'payment_method'   => 'vnpay',
                'package'          => [
                    'id'      => $packageId,
                    'name'    => $pkg->name,
                    'credits' => $pkg->credits,
                    'price'   => $pkg->price,
                ],
                'expired_at' => $payment->expired_at,
            ], 'Đơn hàng VNPay đã được tạo');
        }

        $siteName = env('SEPAY_SITE_NAME', 'GOMAI');
        $bankName = env('SEPAY_BANK_NAME', 'ACB');
        $account  = env('SEPAY_BANK_ACCOUNT', '28569967');
        $owner    = env('SEPAY_BANK_OWNER', 'MA GIA TUAN');
        $content  = strtoupper($siteName) . 'NAPTOKEN' . $hexId;

        $qrUrl = sprintf(
            'https://qr.sepay.vn/img?bank=%s&acc=%s&template=compact&amount=%d&des=%s',
            urlencode($bankName),
            urlencode($account),
            $pkg->price,
            urlencode($content),
        );

        return $this->ok([
            'id'               => $payment->id,
            'payment_id'       => $payment->id,
            'hex_id'           => $hexId,
            'amount'           => (float) $pkg->price,
            'transfer_content' => $content,
            'bank_name'        => $bankName,
            'account_number'   => $account,
            'account_name'     => $owner,
            'qr_url'           => $qrUrl,
            'payment_method'   => 'sepay',
            'package'          => [
                'id'      => $packageId,
                'name'    => $pkg->name,
                'credits' => $pkg->credits,
                'price'   => $pkg->price,
            ],
            'expired_at' => $payment->expired_at,
        ], 'Đơn hàng đã được tạo');
    }

    public function checkStatus(Request $request, $paymentId): JsonResponse
    {
        $payment = Payment::where('id', $paymentId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($payment->status === 'completed') {
            return $this->ok([
                'status'        => 'completed',
                'credit_amount' => (int) $payment->credit_amount,
            ]);
        }

        if ($payment->status === 'failed' || ($payment->expired_at && Carbon::now()->gt($payment->expired_at))) {
            $payment->update(['status' => 'failed']);
            return $this->ok(['status' => 'failed']);
        }

        // Poll SePay
        $apiKey = env('SEPAY_API_KEY', '');
        if ($apiKey) {
            try {
                $resp = Http::withHeaders(['Authorization' => 'Bearer ' . $apiKey])
                    ->get('https://my.sepay.vn/userapi/transactions/list', ['limit' => 20]);
                if ($resp->successful()) {
                    $siteName = strtoupper(env('SEPAY_SITE_NAME', 'GOMAI'));
                    foreach (($resp->json()['transactions'] ?? []) as $tx) {
                        $content = strtoupper($tx['transaction_content'] ?? '');
                        if (str_contains($content, $siteName . 'NAPTOKEN' . $payment->hex_id)) {
                            if ((float) ($tx['amount_in'] ?? 0) >= (float) $payment->amount_vnd) {
                                $this->markPaymentCompleted($payment, $tx['id'] ?? null);
                                return $this->ok([
                                    'status'        => 'completed',
                                    'credit_amount' => (int) $payment->credit_amount,
                                ]);
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('SePay poll failed', ['error' => $e->getMessage()]);
            }
        }

        return $this->ok(['status' => 'pending']);
    }

    public function testCompletePayment(Request $request, $paymentId): JsonResponse
    {
        $payment = Payment::where('id', $paymentId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($payment->status !== 'completed') {
            $this->markPaymentCompleted($payment, null, '(TEST) ');
        }

        return $this->ok([
            'status'        => 'completed',
            'credit_amount' => (int) $payment->credit_amount,
        ], 'Test payment completed');
    }

    public function vnpayReturn(Request $request): JsonResponse
    {
        $vnp_SecureHash = $request->input('vnp_SecureHash');
        $inputData = array();
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == "vnp_") {
                $inputData[$key] = $value;
            }
        }
        
        unset($inputData['vnp_SecureHash']);
        ksort($inputData);
        $i = 0;
        $hashData = "";
        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashData = $hashData . '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData = $hashData . urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }
        
        $vnp_HashSecret = env('VNP_HASH_SECRET', "NDWSHBWWGIPHGLQOQEYVNJVUNWLEQYQW");
        $secureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
        
        if ($secureHash === $vnp_SecureHash) {
            $paymentId = $request->input('vnp_TxnRef');
            $vnp_ResponseCode = $request->input('vnp_ResponseCode');
            $vnp_TransactionNo = $request->input('vnp_TransactionNo');
            
            $payment = Payment::find($paymentId);
            if ($payment) {
                if ($vnp_ResponseCode == '00') {
                    if ($payment->status !== 'completed') {
                        $this->markPaymentCompleted($payment, $vnp_TransactionNo, 'VNPay ');
                    }
                    return $this->ok([
                        'status'        => 'completed',
                        'credit_amount' => (int) $payment->credit_amount,
                    ], 'Thanh toán thành công');
                } else {
                    $payment->update(['status' => 'failed']);
                    return $this->fail('Giao dịch thất bại', 400, 'VNPAY_FAILED');
                }
            }
            return $this->fail('Không tìm thấy đơn hàng', 404, 'PAYMENT_NOT_FOUND');
        } else {
            return $this->fail('Chữ ký không hợp lệ', 400, 'INVALID_SIGNATURE');
        }
    }

    public function vnpayIpn(Request $request): JsonResponse
    {
        try {
            $vnp_SecureHash = $request->input('vnp_SecureHash');
            $inputData = array();
            foreach ($request->all() as $key => $value) {
                if (substr($key, 0, 4) == "vnp_") {
                    $inputData[$key] = $value;
                }
            }
            
            unset($inputData['vnp_SecureHash']);
            ksort($inputData);
            $i = 0;
            $hashData = "";
            foreach ($inputData as $key => $value) {
                if ($i == 1) {
                    $hashData = $hashData . '&' . urlencode($key) . "=" . urlencode($value);
                } else {
                    $hashData = $hashData . urlencode($key) . "=" . urlencode($value);
                    $i = 1;
                }
            }
            
            $vnp_HashSecret = env('VNP_HASH_SECRET', "NDWSHBWWGIPHGLQOQEYVNJVUNWLEQYQW");
            $secureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
            
            if ($secureHash === $vnp_SecureHash) {
                $paymentId = $request->input('vnp_TxnRef');
                $vnp_ResponseCode = $request->input('vnp_ResponseCode');
                $vnp_TransactionNo = $request->input('vnp_TransactionNo');
                
                $payment = Payment::find($paymentId);
                if ($payment) {
                    $vnp_Amount = (float) $request->input('vnp_Amount') / 100;
                    if ($payment->amount_vnd == $vnp_Amount) {
                        if ($payment->status !== 'completed') {
                            if ($vnp_ResponseCode == '00') {
                                $this->markPaymentCompleted($payment, $vnp_TransactionNo, 'VNPay ');
                                return response()->json(["RspCode" => "00", "Message" => "Confirm Success"]);
                            } else {
                                $payment->update(['status' => 'failed']);
                                return response()->json(["RspCode" => "00", "Message" => "Confirm Success"]);
                            }
                        } else {
                            return response()->json(["RspCode" => "02", "Message" => "Order already confirmed"]);
                        }
                    } else {
                        return response()->json(["RspCode" => "04", "Message" => "Invalid amount"]);
                    }
                } else {
                    return response()->json(["RspCode" => "01", "Message" => "Order not found"]);
                }
            } else {
                return response()->json(["RspCode" => "97", "Message" => "Invalid signature"]);
            }
        } catch (\Exception $e) {
            return response()->json(["RspCode" => "99", "Message" => "Input data required"]);
        }
    }

    private function markPaymentCompleted(Payment $payment, $sepayTxId = null, string $prefix = ''): void
    {
        $payment->update([
            'status'      => 'completed',
            'sepay_tx_id' => $sepayTxId,
        ]);
        $user = $payment->user ?? auth()->user();
        if ($user) {
            $user->increment('token_balance', $payment->credit_amount);
            TokenHistory::create([
                'user_id'     => $user->id,
                'type'        => 'in',
                'amount'      => $payment->credit_amount,
                'description' => $prefix . 'Nạp tiền: ' . $payment->package_name,
            ]);
        }
    }
}
