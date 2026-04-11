<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PotteryController;
use App\Http\Controllers\Api\PredictionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PaymentController;

use App\Http\Controllers\Api\CeramicLineController;

// Public ceramic lines API
Route::get('/ceramic-lines', [CeramicLineController::class, 'index']);
Route::get('/ceramic-lines/{id}', [CeramicLineController::class, 'show']);

Route::get('/potteries', [PotteryController::class, 'index']);
Route::post('/upload', [PotteryController::class, 'upload']);
Route::delete('/potteries/{pottery}', [PotteryController::class, 'destroy']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/login/social', [AuthController::class, 'socialLogin']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/history', [PredictionController::class, 'history']);
    Route::get('/history/{id}', [PredictionController::class, 'show']);
    Route::post('/predict', [PredictionController::class, 'predict']);
    Route::post('/ai/debate', [PredictionController::class, 'predict']);
    Route::post('/ai/chat', [PredictionController::class, 'chat']);
    Route::post('/profile/update', [AuthController::class, 'updateProfile']);
    Route::post('/profile/password', [AuthController::class, 'updatePassword']);
    // Payment routes
    Route::get('/payment/status', [PaymentController::class, 'getStatus']);
    Route::get('/payment/packages', [PaymentController::class, 'getPackages']);
    Route::get('/payment/history', [PaymentController::class, 'getHistory']);
    Route::post('/payment/create', [PaymentController::class, 'createPayment']);
    Route::get('/payment/check/{paymentId}', [PaymentController::class, 'checkStatus']);
    Route::post('/payment/test-complete/{paymentId}', [PaymentController::class, 'testCompletePayment']);
});

Route::get('/img/{path}', function (string $path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) { abort(404); }
    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';
    return response()->file($fullPath, ['Content-Type' => $mime, 'Cache-Control' => 'public, max-age=86400']);
})->where('path', '.*');

Route::get("/add_token", function() { \App\Models\User::query()->update(["token_balance" => 1000]); return "OK"; });
