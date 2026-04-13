<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $fields = $request->validate([
            'name' => 'required|string',
            'email' => 'required|string|unique:users,email',
            'password' => 'required|string|confirmed'
        ]);

        $user = User::create([
            'name' => $fields['name'],
            'email' => $fields['email'],
            'password' => Hash::make($fields['password']),
        ]);

        $token = $user->createToken('myapptoken')->plainTextToken;

        return response([
            'user' => $user,
            'token' => $token
        ], 201);
    }

    public function login(Request $request)
    {
        $fields = $request->validate([
            'email' => 'required|string',
            'password' => 'required|string'
        ]);

        $user = User::where('email', $fields['email'])->first();

        if (!$user || !Hash::check($fields['password'], $user->password)) {
            return response([
                'status'  => 'error',
                'message' => 'Sai tài khoản hoặc mật khẩu'
            ], 401);
        }

        $token = $user->createToken('myapptoken')->plainTextToken;

        return response([
            'user' => $user,
            'token' => $token
        ], 200);
    }

    public function socialLogin(Request $request)
    {
        $fields = $request->validate([
            'provider' => 'required|in:google,facebook',
            'token' => 'required|string',
        ]);

        $provider = $fields['provider'];
        $token = $fields['token'];
        $email = null;
        $name = null;

        if ($provider === 'google') {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->get('https://oauth2.googleapis.com/tokeninfo?id_token=' . $token);
            if (!$response->successful()) {
                return response(['message' => 'Mã xác thực Google bị từ chối / hết hạn. Vui lòng đăng nhập lại.', 'details' => $response->json()], 401);
            }
            $data = $response->json();
            $email = $data['email'] ?? null;
            $name = $data['name'] ?? null;
        } else if ($provider === 'facebook') {
            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->get('https://graph.facebook.com/me?fields=id,name,email&access_token=' . $token);
            if (!$response->successful()) {
                return response(['message' => 'Mã xác thực Facebook bị từ chối / hết hạn.'], 401);
            }
            $data = $response->json();
            $email = $data['email'] ?? null;
            $name = $data['name'] ?? null;
        }

        if (!$email && $provider === 'facebook') {
            $email = $data['id'] . '@facebook.com';
        } else if (!$email) {
            return response(['message' => 'Không thể lấy được địa chỉ email (Public Profile) từ ' . ucfirst($provider) . '. Vui lòng kiểm tra lại quyền truy cập.'], 400);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            // Register new user automatically
            $user = User::create([
                'name' => $name ?? 'Người dùng',
                'email' => $email,
                'password' => Hash::make(\Illuminate\Support\Str::random(24)),
            ]);
        }

        $loginToken = $user->createToken('myapptoken')->plainTextToken;

        return response([
            'user' => $user,
            'token' => $loginToken
        ], 200);
    }

    public function logout(Request $request)
    {
        auth()->user()->tokens()->delete();
        return ['message' => 'Đã đăng xuất'];
    }
    
    public function me()
    {
        return auth()->user();
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $fields = $request->validate([
            'name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'required|string|unique:users,email,' . $user->id,
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = url('/api/img/' . $path);
        }

        $user->name = $fields['name'];
        $user->email = $fields['email'];
        $user->phone = $fields['phone'];
        $user->save();

        return response(['user' => $user->fresh(), 'message' => 'Cập nhật thành công'], 200);
    }

    public function updatePassword(Request $request)
    {
        $user = auth()->user();
        $request->validate([
            'old_password' => 'required|string',
            'password' => 'required|string|confirmed|min:6',
        ]);

        if (!Hash::check($request->old_password, $user->password)) {
            return response(['message' => 'Mật khẩu cũ không chính xác'], 401);
        }

        $user->update(['password' => Hash::make($request->password)]);
        return response(['message' => 'Đổi mật khẩu thành công'], 200);
    }
    public function forgotPassword(Request $request)
    {
        $fields = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Save to password_reset_tokens
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $fields['email']],
            ['token' => $code, 'created_at' => now()]
        );

        // Send email
        \Illuminate\Support\Facades\Mail::raw("Mã khôi phục mật khẩu của bạn là: $code\n\nMã này có hiệu lực trong 15 phút.", function ($message) use ($fields) {
            $message->to($fields['email'])->subject('Mã Khôi Phục Mật Khẩu - Gom AI');
        });

        return response(['message' => 'Mã khôi phục đã được gửi vào email của bạn (Vui lòng kiểm tra hộp thư đến hoặc hộp thư rác)'], 200);
    }

    public function resetPassword(Request $request)
    {
        $fields = $request->validate([
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        $resetRecord = \Illuminate\Support\Facades\DB::table('password_reset_tokens')
            ->where('email', $fields['email'])
            ->where('token', $fields['code'])
            ->first();

        if (!$resetRecord) {
            return response(['message' => 'Mã xác nhận không hợp lệ hoặc đã hết hạn.'], 400);
        }

        // Check if token is older than 15 minutes
        if (\Carbon\Carbon::parse($resetRecord->created_at)->addMinutes(15)->isPast()) {
            return response(['message' => 'Mã xác nhận đã hết hạn.'], 400);
        }

        $user = User::where('email', $fields['email'])->first();
        $user->update(['password' => Hash::make($fields['password'])]);

        // Delete the token
        \Illuminate\Support\Facades\DB::table('password_reset_tokens')->where('email', $fields['email'])->delete();

        return response(['message' => 'Mật khẩu đã được cập nhật thành công.'], 200);
    }
}
