<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\SocialLoginRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\User;
use App\Traits\ApiResponses;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponses;

    public function register(RegisterRequest $request)
    {
        $fields = $request->validated();

        $user = User::create([
            'name'     => $fields['name'],
            'email'    => $fields['email'],
            'password' => Hash::make($fields['password']),
        ]);

        $token = $user->createToken('myapptoken')->plainTextToken;

        // Keep raw shape for FE compatibility
        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $fields = $request->validated();

        $user = User::where('email', $fields['email'])->first();
        if (!$user || !Hash::check($fields['password'], $user->password)) {
            return $this->unauthorized('Sai tài khoản hoặc mật khẩu');
        }

        $token = $user->createToken('myapptoken')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
    }

    public function socialLogin(SocialLoginRequest $request)
    {
        $fields = $request->validated();
        $provider = $fields['provider'];
        $token = $fields['token'];

        $email = null;
        $name  = null;
        $data  = [];

        try {
            if ($provider === 'google') {
                $response = Http::withoutVerifying()->get('https://oauth2.googleapis.com/tokeninfo', [
                    'id_token' => $token,
                ]);
                if (!$response->successful()) {
                    return $this->unauthorized('Mã xác thực Google bị từ chối / hết hạn.');
                }
                $data = $response->json();
                $email = $data['email'] ?? null;
                $name = $data['name'] ?? null;
            } elseif ($provider === 'facebook') {
                $response = Http::withoutVerifying()->get('https://graph.facebook.com/me', [
                    'fields'       => 'id,name,email',
                    'access_token' => $token,
                ]);
                if (!$response->successful()) {
                    return $this->unauthorized('Mã xác thực Facebook bị từ chối / hết hạn.');
                }
                $data = $response->json();
                $email = $data['email'] ?? null;
                $name = $data['name'] ?? null;
                if (!$email && !empty($data['id'])) {
                    $email = $data['id'] . '@facebook.com';
                }
            }
        } catch (\Throwable $e) {
            Log::error('Social login provider error', ['provider' => $provider, 'error' => $e->getMessage()]);
            return $this->unauthorized('Không thể xác thực với ' . ucfirst($provider));
        }

        if (!$email) {
            return $this->fail(
                'Không thể lấy email từ ' . ucfirst($provider) . '. Vui lòng kiểm tra quyền truy cập.',
                400,
                'EMAIL_NOT_PROVIDED'
            );
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'     => $name ?: 'Người dùng',
                'password' => Hash::make(Str::random(24)),
            ]
        );

        $loginToken = $user->createToken('myapptoken')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $loginToken,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->tokens()->delete();
        return response()->json(['message' => 'Đã đăng xuất']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $fields = $request->validated();

        if (array_key_exists('name', $fields))   $user->name   = $fields['name'];
        if (array_key_exists('phone', $fields))  $user->phone  = $fields['phone'];
        if (array_key_exists('avatar', $fields)) $user->avatar = $fields['avatar'];
        if (array_key_exists('language', $fields)) $user->language = $fields['language'];

        $user->save();

        return response()->json([
            'user'    => $user->fresh(),
            'message' => 'Cập nhật thành công',
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();
        $fields = $request->validated();

        if (!Hash::check($fields['current_password'], $user->password)) {
            return $this->unauthorized('Mật khẩu hiện tại không chính xác');
        }

        $user->update(['password' => Hash::make($fields['new_password'])]);

        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $fields = $request->validated();

        // Don't leak whether email exists
        $user = User::where('email', $fields['email'])->first();

        if ($user) {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $fields['email']],
                ['token' => Hash::make($code), 'created_at' => now()]
            );

            try {
                Mail::raw(
                    "Mã khôi phục mật khẩu của bạn là: $code\n\nMã này có hiệu lực trong 15 phút.",
                    function ($message) use ($fields) {
                        $message->to($fields['email'])->subject('Mã Khôi Phục Mật Khẩu - The Archivist');
                    }
                );
            } catch (\Throwable $e) {
                Log::error('Forgot password mail failed', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => 'Nếu email tồn tại trong hệ thống, mã khôi phục sẽ được gửi đến hộp thư của bạn.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $fields = $request->validated();

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $fields['email'])
            ->first();

        if (!$resetRecord || !Hash::check($fields['code'], $resetRecord->token)) {
            return $this->fail('Mã xác nhận không hợp lệ hoặc đã hết hạn.', 400, 'INVALID_CODE');
        }

        if (Carbon::parse($resetRecord->created_at)->addMinutes(15)->isPast()) {
            return $this->fail('Mã xác nhận đã hết hạn.', 400, 'CODE_EXPIRED');
        }

        $user = User::where('email', $fields['email'])->first();
        if (!$user) {
            return $this->notFound('User not found.');
        }

        $user->update(['password' => Hash::make($fields['password'])]);

        DB::table('password_reset_tokens')->where('email', $fields['email'])->delete();

        return response()->json(['message' => 'Mật khẩu đã được cập nhật thành công.']);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();
        Log::info("deleteAccount: starting deletion for user {$user->id}");

        try {
            // Revoke all tokens
            Log::info("deleteAccount: revoking tokens...");
            $user->tokens()->delete();
            Log::info("deleteAccount: tokens revoked successfully.");
        } catch (\Exception $e) {
            Log::error("deleteAccount: error revoking tokens: " . $e->getMessage());
        }

        try {
            // Delete related payments
            Log::info("deleteAccount: deleting payments...");
            $user->payments()->delete();
            Log::info("deleteAccount: payments deleted successfully.");
        } catch (\Exception $e) {
            Log::error("deleteAccount: error deleting payments: " . $e->getMessage());
        }

        try {
            // Delete related token histories
            Log::info("deleteAccount: deleting token histories...");
            $user->tokenHistories()->delete();
            Log::info("deleteAccount: token histories deleted successfully.");
        } catch (\Exception $e) {
            Log::error("deleteAccount: error deleting token histories: " . $e->getMessage());
        }

        try {
            // Delete predictions
            Log::info("deleteAccount: deleting predictions...");
            \App\Models\Prediction::where('user_id', $user->id)->delete();
            Log::info("deleteAccount: predictions deleted successfully.");
        } catch (\Exception $e) {
            Log::error("deleteAccount: error deleting predictions: " . $e->getMessage());
        }

        try {
            // Delete the user record
            Log::info("deleteAccount: deleting user record...");
            $user->delete();
            Log::info("deleteAccount: user record deleted successfully.");
        } catch (\Exception $e) {
            Log::error("deleteAccount: error deleting user record: " . $e->getMessage());
            throw $e;
        }

        Log::info("deleteAccount: account deletion completed successfully.");

        return response()->json([
            'message' => 'Tài khoản và toàn bộ dữ liệu của bạn đã được xóa hoàn thành công.'
        ]);
    }
}
