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
            
            $via = $request->input('via');
            if ($via === 'app') {
                $connector = str_contains($vnp_Returnurl, '?') ? '&' : '?';
                $vnp_Returnurl .= $connector . 'via=app';
            }
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

            try {
                $this->sendPaymentSuccessEmail($payment, $user);
            } catch (\Throwable $e) {
                Log::error('Failed to send payment success email', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    private function sendPaymentSuccessEmail(Payment $payment, \App\Models\User $user): void
    {
        $isEn = $user->language === 'en';
        
        $formattedAmount = number_format($payment->amount_vnd, 0, ',', '.');
        $dateStr = $payment->created_at ? $payment->created_at->format('H:i d/m/Y') : now()->format('H:i d/m/Y');
        
        $packageName = $payment->package_name;
        if ($isEn) {
            $pkg = \App\Models\PaymentPackage::find($payment->package_id);
            if ($pkg && $pkg->name_en) {
                $packageName = $pkg->name_en;
            }
        }
        
        if ($isEn) {
            $subject = 'Payment Successful - The Archivist';
            $successBanner = '✓ Payment Processed Successfully';
            $greeting = "Hello <strong>{$user->name}</strong>,";
            $introText = "Thank you for using <strong>The Archivist</strong>. Your payment has been completed successfully. Tokens have been credited to your account balance.";
            
            $lblInvoice = 'Invoice ID';
            $lblPackage = 'Package';
            $lblTokens = 'Tokens Added';
            $lblTime = 'Date & Time';
            $lblTotal = 'Total Charged';
            $lblBtn = 'View Transaction History';
            $lblFooter = 'This is an automated email from The Archivist system.<br>If you need assistance, please contact us at <a href="mailto:dongnguyenkh123@gmail.com" style="color: #4f46e5; text-decoration: underline;">dongnguyenkh123@gmail.com</a>.';
        } else {
            $subject = 'Thanh toán thành công - The Archivist';
            $successBanner = '✓ Giao dịch đã được thanh toán thành công';
            $greeting = "Chào <strong>{$user->name}</strong>,";
            $introText = "Cảm ơn bạn đã tin dùng dịch vụ của <strong>The Archivist</strong>. Giao dịch mua gói của bạn đã hoàn tất. Token đã được cộng trực tiếp vào tài khoản của bạn.";
            
            $lblInvoice = 'Mã hóa đơn';
            $lblPackage = 'Gói dịch vụ';
            $lblTokens = 'Số lượng Token';
            $lblTime = 'Thời gian';
            $lblTotal = 'Tổng thanh toán';
            $lblBtn = 'Xem lịch sử giao dịch';
            $lblFooter = 'Email này được gửi tự động từ hệ thống The Archivist.<br>Nếu bạn cần hỗ trợ, vui lòng liên hệ qua email <a href="mailto:dongnguyenkh123@gmail.com" style="color: #4f46e5; text-decoration: underline;">dongnguyenkh123@gmail.com</a>.';
        }

        $htmlContent = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>{$subject}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f7; color: #1e293b; padding: 40px; margin: 0; }
                .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); }
                .header { background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px; text-align: center; color: #ffffff; }
                .logo { font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #e2e8f0; }
                .logo span { color: #f59e0b; }
                .content { padding: 32px; }
                h2 { font-size: 20px; font-weight: 700; margin-top: 0; color: #0f172a; }
                .success-banner { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 16px; border-radius: 8px; font-weight: 600; margin-bottom: 24px; text-align: center; }
                .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                .details-table th, .details-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .details-table th { color: #64748b; font-weight: 600; font-size: 14px; width: 35%; }
                .details-table td { color: #334155; font-weight: 500; }
                .total-row td { font-size: 18px; font-weight: 700; color: #1e1b4b; border-bottom: none; }
                .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
                .btn { display: inline-block; background: linear-gradient(135deg, #312e81 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 700; font-size: 15px; margin-top: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(79,70,229,0.4); }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <div class='logo'>THE <span>ARCHIVIST</span></div>
                </div>
                <div class='content'>
                    <div class='success-banner'>{$successBanner}</div>
                    <p>{$greeting}</p>
                    <p>{$introText}</p>
                    
                    <table class='details-table'>
                        <tr>
                            <th>{$lblInvoice}</th>
                            <td>#{$payment->hex_id}</td>
                        </tr>
                        <tr>
                            <th>{$lblPackage}</th>
                            <td>{$packageName}</td>
                        </tr>
                        <tr>
                            <th>{$lblTokens}</th>
                            <td>+{$payment->credit_amount} Tokens</td>
                        </tr>
                        <tr>
                            <th>{$lblTime}</th>
                            <td>{$dateStr}</td>
                        </tr>
                        <tr class='total-row'>
                            <th>{$lblTotal}</th>
                            <td>{$formattedAmount} VND</td>
                        </tr>
                    </table>
                    
                    <p style='text-align: center; margin-top: 28px; margin-bottom: 12px;'>
                        <a href='https://thearchivistai.vercel.app/history' class='btn'>{$lblBtn} →</a>
                    </p>
                </div>
                <div class='footer'>
                    {$lblFooter}
                </div>
            </div>
        </body>
        </html>
        ";

        \Illuminate\Support\Facades\Mail::html($htmlContent, function ($message) use ($user, $subject) {
            $message->to($user->email)
                ->subject($subject);
        });
    }
}
