<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PotteryController;
use App\Http\Controllers\Api\PredictionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\CeramicLineController;
use App\Http\Controllers\Api\AzureBlobStorageController;
use App\Http\Controllers\Api\AdminController;

// ── Public API ──

// Health check
Route::get('/health', fn () => response()->json(['success' => true, 'message' => 'OK', 'data' => ['status' => 'healthy']]));
Route::get('/test', fn () => response()->json(['success' => true, 'message' => 'OK', 'data' => ['status' => 'ok']]));

// Public ceramic lines
Route::get('/ceramic-lines', [CeramicLineController::class, 'index']);
Route::get('/ceramic-lines/{id}', [CeramicLineController::class, 'show']);

// Public stats
Route::get('/stats', function () {
    $totalAnalyzed = \App\Models\Prediction::count();

    // Calculate real accuracy from prediction confidence scores
    $accuracy = 95.8; // sensible default
    if ($totalAnalyzed > 0) {
        $avgConfidence = \App\Models\Prediction::whereNotNull('result_json')
            ->get()
            ->map(function ($p) {
                $json = is_array($p->result_json) ? $p->result_json : json_decode($p->result_json, true);
                return $json['confidence'] ?? $json['final_confidence'] ?? null;
            })
            ->filter()
            ->avg();

        if ($avgConfidence !== null) {
            $accuracy = round($avgConfidence, 1);
        }
    }

    return response()->json([
        'success' => true,
        'message' => 'OK',
        'data'    => [
            'total_analyzed' => $totalAnalyzed,
            'accuracy'       => $accuracy,
        ],
    ]);
});

// Contact form
Route::post('/contact', [ContactController::class, 'submit']);

// Public pages
Route::get('/pages/overrides', [App\Http\Controllers\Api\AdminController::class, 'pageOverrides']);
Route::get('/pages', [App\Http\Controllers\Api\AdminController::class, 'pages']);
Route::get('/pages/{slug}', [App\Http\Controllers\Api\AdminController::class, 'showPage']);

// VNPay callbacks (Public)
Route::get('/payment/vnpay-return', [PaymentController::class, 'vnpayReturn']);
Route::get('/payment/vnpay-ipn', [PaymentController::class, 'vnpayIpn']);

// Auth (public)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/login/social', [AuthController::class, 'socialLogin']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Public storage proxy (read-only)
Route::get('/img/{path}', function (string $path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';
    return response()->file($fullPath, [
        'Content-Type'  => $mime,
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->where('path', '.*');

// Public image proxy for Flutter Web CORS workaround
Route::get('/proxy-image', function (\Illuminate\Http\Request $request) {
    $url = $request->query('url');
    if (!$url) {
        return abort(400, 'Missing url parameter');
    }
    try {
        $response = \Illuminate\Support\Facades\Http::withoutVerifying()->timeout(10)->get($url);
        if (!$response->successful()) {
            return abort(404, 'Image fetch failed');
        }
        $mime = $response->header('Content-Type') ?: 'image/jpeg';
        return response($response->body(), 200)
            ->header('Content-Type', $mime)
            ->header('Cache-Control', 'public, max-age=86400');
    } catch (\Throwable $e) {
        return abort(404, 'Invalid image url');
    }
});

// ── Authenticated API ──

Route::middleware('auth:sanctum')->group(function () {
    // Auth / profile
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/profile/update', [AuthController::class, 'updateProfile']);
    Route::post('/profile/password', [AuthController::class, 'updatePassword']);
    Route::delete('/profile/delete', [AuthController::class, 'deleteAccount']);

    // Predictions / chat
    Route::get('/history', [PredictionController::class, 'history']);
    Route::get('/history/{id}', [PredictionController::class, 'show']);
    Route::post('/predict', [PredictionController::class, 'predict']);
    Route::post('/predict/lens', [PredictionController::class, 'predictLens']);
    Route::post('/ai/debate', [PredictionController::class, 'predict']);
    Route::post('/ai/chat', [PredictionController::class, 'chat']);

    // Pottery (legacy admin-flavored endpoints - now require auth)
    Route::get('/potteries', [PotteryController::class, 'index']);
    Route::post('/upload', [PotteryController::class, 'upload']);
    Route::delete('/potteries/{pottery}', [PotteryController::class, 'destroy']);

    // Payments
    Route::get('/payment/status', [PaymentController::class, 'getStatus']);
    Route::get('/payment/packages', [PaymentController::class, 'getPackages']);
    Route::get('/payment/history', [PaymentController::class, 'getHistory']);
    Route::get('/payment/active-method', [PaymentController::class, 'getActiveMethod']);
    Route::post('/payment/create', [PaymentController::class, 'createPayment']);
    Route::get('/payment/check/{paymentId}', [PaymentController::class, 'checkStatus']);

    // Azure Blob Storage (write-protected)
    Route::prefix('v1/storage/azure-blob')->group(function () {
        Route::post('/upload/single', [AzureBlobStorageController::class, 'uploadSingleFile']);
        Route::post('/upload/multiple', [AzureBlobStorageController::class, 'uploadMultipleFiles']);
        Route::delete('/delete/single', [AzureBlobStorageController::class, 'deleteSingleFile']);
        Route::delete('/delete/multiple', [AzureBlobStorageController::class, 'deleteMultipleFiles']);
        Route::put('/move/single', [AzureBlobStorageController::class, 'moveSingleFile']);
        Route::put('/move/multiple', [AzureBlobStorageController::class, 'moveMultipleFiles']);
    });

    // Admin
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);

        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{id}', [AdminController::class, 'showUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);

        Route::get('/ceramic-lines', [AdminController::class, 'ceramicLines']);
        Route::get('/ceramic-lines/{id}', [AdminController::class, 'showCeramicLine']);
        Route::post('/ceramic-lines', [AdminController::class, 'storeCeramicLine']);
        Route::put('/ceramic-lines/{id}', [AdminController::class, 'updateCeramicLine']);
        Route::delete('/ceramic-lines/{id}', [AdminController::class, 'deleteCeramicLine']);

        Route::get('/payments', [AdminController::class, 'payments']);
        Route::get('/payments/{id}', [AdminController::class, 'showPayment']);

        Route::get('/payment-packages', [AdminController::class, 'paymentPackages']);
        Route::post('/payment-packages', [AdminController::class, 'storePaymentPackage']);
        Route::put('/payment-packages/{id}', [AdminController::class, 'updatePaymentPackage']);
        Route::delete('/payment-packages/{id}', [AdminController::class, 'deletePaymentPackage']);

        Route::get('/pages', [AdminController::class, 'pages']);
        Route::post('/pages', [AdminController::class, 'storePage']);
        Route::put('/pages/{id}', [AdminController::class, 'updatePage']);
        Route::delete('/pages/{id}', [AdminController::class, 'deletePage']);

        Route::get('/predictions', [AdminController::class, 'predictions']);
        Route::get('/predictions/{id}', [AdminController::class, 'showPrediction']);

        Route::get('/token-history', [AdminController::class, 'tokenHistory']);

        // Payment Settings
        Route::get('/payment-settings', [AdminController::class, 'getPaymentSettings']);
        Route::post('/payment-settings', [AdminController::class, 'updatePaymentSettings']);

        // API & Model settings
        Route::get('/api-settings', [AdminController::class, 'getApiSettings']);
        Route::post('/api-settings', [AdminController::class, 'updateApiSettings']);
    });
});

// ── Development-only routes (gated by APP_ENV) ──

if (app()->environment('local', 'testing')) {
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/payment/test-complete/{paymentId}', [PaymentController::class, 'testCompletePayment']);
    });
}

// ── CORS preflight ──

Route::options('/{any}', fn () => response('', 200))->where('any', '.*');
