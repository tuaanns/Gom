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

    public function updateProfile(Request $request)
    {
        $user = auth()->user();
        $fields = $request->validate([
            'name' => 'required|string',
            'email' => 'required|string|unique:users,email,' . $user->id,
        ]);

        $user->update($fields);
        return response(['user' => $user, 'message' => 'Cập nhật thành công'], 200);
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
}
