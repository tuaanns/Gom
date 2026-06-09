<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Prediction\ChatRequest;
use App\Http\Requests\Prediction\PredictRequest;
use App\Models\Prediction;
use App\Models\TokenHistory;
use App\Services\AIService;
use App\Services\AzureBlobStorageService;
use App\Traits\ApiResponses;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PredictionController extends Controller
{
    use ApiResponses;

    public const FREE_LIMIT = 5;
    public const TOKEN_COST = 1.0;
    public const CHAT_COST  = 0.1;
    private const PENDING_LABELS = ['Đang phân tích...', 'Đang phân tích Lens...'];

    public function __construct(
        private AIService $aiService,
        private AzureBlobStorageService $azureStorage
    ) {}

    public function predict(PredictRequest $request): JsonResponse
    {
        set_time_limit(600); // Allow enough time for Azure AI cold start + debate
        $user = $request->user();

        $freeUsed = (int) ($user->free_predictions_used ?? 0);
        $balance  = (float) ($user->token_balance ?? 0);

        if ($freeUsed >= self::FREE_LIMIT && $balance < self::TOKEN_COST) {
            return $this->fail(
                'Bạn đã hết 5 lượt miễn phí. Vui lòng nạp thêm để tiếp tục.',
                402,
                'PAYMENT_REQUIRED',
                ['free_used' => $freeUsed, 'token_balance' => $balance]
            );
        }

        $image = $request->file('image');

        try {
            $azureUrl = $this->azureStorage->uploadSingleFile($image, 'predictions');
        } catch (\Throwable $e) {
            Log::error('Azure upload failed', ['error' => $e->getMessage()]);
            return $this->serverError('Tải ảnh lên thất bại. Vui lòng thử lại.');
        }

        $prediction = Prediction::create([
            'user_id'          => $user->id,
            'image'            => $azureUrl,
            'final_prediction' => 'Đang phân tích...',
            'country'          => 'Đang xử lý',
            'era'              => 'Đang xử lý',
            'result_json'      => null,
        ]);

        $lang = $request->input('lang', 'vi');

        // Async handling
        if ($this->shouldProcessAsync($request)) {
            $tempDir = storage_path('app/temp');
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }
            $tempPath = $tempDir . '/prediction_' . $prediction->id . '.jpg';
            copy($image->getRealPath(), $tempPath);

            if (function_exists('fastcgi_finish_request')) {
                $response = $this->ok([
                    'db_id' => $prediction->id,
                    'is_async' => true,
                    'quota' => [
                        'free_used'     => (int) $user->fresh()->free_predictions_used,
                        'free_limit'    => self::FREE_LIMIT,
                        'token_balance' => (float) $user->fresh()->token_balance,
                    ],
                ], 'Đã bắt đầu phân tích ngầm');

                $response->send();
                fastcgi_finish_request();

                try {
                    \Illuminate\Support\Facades\Artisan::call('app:process-prediction', [
                        'id' => $prediction->id,
                        'lang' => $lang,
                    ]);
                } catch (\Throwable $e) {
                    Log::error('Failed to run app:process-prediction via fastcgi_finish_request', [
                        'prediction_id' => $prediction->id,
                        'error' => $e->getMessage(),
                    ]);
                    $this->markPredictionFailed(
                        $prediction,
                        'Không thể khởi chạy tiến trình xử lý nền.'
                    );
                    @unlink($tempPath);
                }
                exit;
            }

            $artisanPath = base_path('artisan');
            $phpPath = PHP_BINARY;
            if (strncasecmp(PHP_OS, 'WIN', 3) === 0) {
                $cmd = sprintf(
                    'start "" /B "%s" "%s" app:process-prediction %d "%s"',
                    $phpPath,
                    $artisanPath,
                    $prediction->id,
                    $lang
                );
                $handle = popen($cmd, 'r');
                if ($handle === false) {
                    $this->markPredictionFailed(
                        $prediction,
                        'Không thể khởi chạy tiến trình xử lý nền.'
                    );
                    @unlink($tempPath);
                    return $this->serverError('Không thể bắt đầu giám định.');
                }
                pclose($handle);
            } else {
                $cmd = sprintf(
                    'nohup %s %s app:process-prediction %d %s > %s 2>&1 &',
                    escapeshellarg($phpPath),
                    escapeshellarg($artisanPath),
                    $prediction->id,
                    escapeshellarg($lang),
                    escapeshellarg(storage_path('logs/prediction-worker.log'))
                );
                exec($cmd);
            }

            return $this->ok([
                'db_id' => $prediction->id,
                'is_async' => true,
                'quota' => [
                    'free_used'     => (int) $user->fresh()->free_predictions_used,
                    'free_limit'    => self::FREE_LIMIT,
                    'token_balance' => (float) $user->fresh()->token_balance,
                ],
            ], 'Đã bắt đầu phân tích ngầm');
        }

        $debateResult = $this->aiService->runMultiAgentDebate($image, $lang);

        if (isset($debateResult['error'])) {
            $isNonPottery = array_key_exists('is_pottery', $debateResult) && $debateResult['is_pottery'] === false;

            $prediction->update([
                'final_prediction' => $isNonPottery ? 'Ảnh không phải gốm/sứ' : 'Lỗi hệ thống AI',
                'era'              => 'Vui lòng thử lại',
                'result_json'      => $debateResult,
            ]);

            if ($isNonPottery) {
                return $this->fail(
                    $debateResult['error'],
                    422,
                    'NON_POTTERY_IMAGE',
                    ['db_id' => $prediction->id]
                );
            }

            return $this->fail(
                'AI Server Error: ' . $debateResult['error'],
                502,
                'AI_SERVICE_ERROR',
                ['db_id' => $prediction->id]
            );
        }

        $final = $debateResult['final_report'] ?? [];
        $prediction->update([
            'final_prediction' => $final['final_prediction'] ?? 'Unknown',
            'country'          => $final['final_country'] ?? null,
            'era'              => $final['final_era'] ?? null,
            'result_json'      => $debateResult,
            'lens_results'     => $debateResult['lens_results'] ?? [],
        ]);

        // Quota deduction
        $note = '';
        if ($user->free_predictions_used < self::FREE_LIMIT) {
            $user->increment('free_predictions_used');
            $remaining = self::FREE_LIMIT - $user->fresh()->free_predictions_used;
            $note = 'Lượt miễn phí còn lại: ' . $remaining;
        } else {
            $user->decrement('token_balance', self::TOKEN_COST);
            TokenHistory::create([
                'user_id'     => $user->id,
                'type'        => 'out',
                'amount'      => self::TOKEN_COST,
                'description' => 'Phân tích gốm: ' . ($final['final_prediction'] ?? 'Unknown'),
            ]);
            $note = 'Đã trừ 1 lượt. Còn lại: ' . (float) $user->fresh()->token_balance;
        }

        return $this->ok([
            'data'  => $debateResult,
            'db_id' => $prediction->id,
            'quota' => [
                'free_used'     => (int) $user->fresh()->free_predictions_used,
                'free_limit'    => self::FREE_LIMIT,
                'token_balance' => (float) $user->fresh()->token_balance,
                'note'          => $note,
            ],
        ], 'Phân tích hoàn tất');
    }

    public function predictLens(PredictRequest $request): JsonResponse
    {
        set_time_limit(600); // Lens takes longer
        $user = $request->user();

        $freeUsed = (int) ($user->free_predictions_used ?? 0);
        $balance  = (float) ($user->token_balance ?? 0);

        if ($freeUsed >= self::FREE_LIMIT && $balance < self::TOKEN_COST) {
            return $this->fail(
                'Bạn đã hết 5 lượt miễn phí. Vui lòng nạp thêm để tiếp tục.',
                402,
                'PAYMENT_REQUIRED',
                ['free_used' => $freeUsed, 'token_balance' => $balance]
            );
        }

        $image = $request->file('image');
        $lang = $request->input('lang', 'vi');

        try {
            $azureUrl = $this->azureStorage->uploadSingleFile($image, 'predictions');
        } catch (\Throwable $e) {
            Log::error('Azure upload failed', ['error' => $e->getMessage()]);
            return $this->serverError('Tải ảnh lên thất bại. Vui lòng thử lại.');
        }

        $prediction = Prediction::create([
            'user_id'          => $user->id,
            'image'            => $azureUrl,
            'final_prediction' => 'Đang phân tích Lens...',
            'country'          => 'Google Lens',
            'era'              => 'Google Lens',
            'result_json'      => null,
            'source_type'      => 'lens',
            'lens_results'     => null,
        ]);

        // Async handling
        if ($this->shouldProcessAsync($request)) {
            $tempDir = storage_path('app/temp');
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }
            $tempPath = $tempDir . '/prediction_' . $prediction->id . '.jpg';
            copy($image->getRealPath(), $tempPath);

            if (function_exists('fastcgi_finish_request')) {
                $response = $this->ok([
                    'db_id' => $prediction->id,
                    'is_async' => true,
                    'quota' => [
                        'free_used'     => (int) $user->fresh()->free_predictions_used,
                        'free_limit'    => self::FREE_LIMIT,
                        'token_balance' => (float) $user->fresh()->token_balance,
                    ],
                ], 'Đã bắt đầu phân tích Lens ngầm');

                $response->send();
                fastcgi_finish_request();

                try {
                    \Illuminate\Support\Facades\Artisan::call('app:process-prediction', [
                        'id' => $prediction->id,
                        'lang' => $lang,
                    ]);
                } catch (\Throwable $e) {
                    Log::error('Failed to run app:process-prediction via fastcgi_finish_request', [
                        'prediction_id' => $prediction->id,
                        'error' => $e->getMessage(),
                    ]);
                    $this->markPredictionFailed(
                        $prediction,
                        'Không thể khởi chạy tiến trình xử lý nền.'
                    );
                    @unlink($tempPath);
                }
                exit;
            }

            $artisanPath = base_path('artisan');
            $phpPath = PHP_BINARY;
            if (strncasecmp(PHP_OS, 'WIN', 3) === 0) {
                $cmd = sprintf(
                    'start "" /B "%s" "%s" app:process-prediction %d "%s"',
                    $phpPath,
                    $artisanPath,
                    $prediction->id,
                    $lang
                );
                $handle = popen($cmd, 'r');
                if ($handle === false) {
                    $this->markPredictionFailed(
                        $prediction,
                        'Không thể khởi chạy tiến trình xử lý nền.'
                    );
                    @unlink($tempPath);
                    return $this->serverError('Không thể bắt đầu giám định.');
                }
                pclose($handle);
            } else {
                $cmd = sprintf(
                    'nohup %s %s app:process-prediction %d %s > %s 2>&1 &',
                    escapeshellarg($phpPath),
                    escapeshellarg($artisanPath),
                    $prediction->id,
                    escapeshellarg($lang),
                    escapeshellarg(storage_path('logs/prediction-worker.log'))
                );
                exec($cmd);
            }

            return $this->ok([
                'db_id' => $prediction->id,
                'is_async' => true,
                'quota' => [
                    'free_used'     => (int) $user->fresh()->free_predictions_used,
                    'free_limit'    => self::FREE_LIMIT,
                    'token_balance' => (float) $user->fresh()->token_balance,
                ],
            ], 'Đã bắt đầu phân tích Lens ngầm');
        }

        $lensResult = $this->aiService->runLens($image, $lang);

        if (isset($lensResult['error'])) {
            $isNonPottery = array_key_exists('is_pottery', $lensResult) && $lensResult['is_pottery'] === false;

            $prediction->update([
                'final_prediction' => $isNonPottery ? 'Ảnh không phải gốm/sứ' : 'Lỗi kết nối Google Lens',
                'era'              => 'Vui lòng thử lại',
                'result_json'      => $lensResult,
            ]);

            if ($isNonPottery) {
                return $this->fail(
                    $lensResult['error'],
                    422,
                    'NON_POTTERY_IMAGE',
                    ['db_id' => $prediction->id]
                );
            }

            return $this->fail(
                'AI Lens Error: ' . $lensResult['error'],
                502,
                'AI_LENS_ERROR',
                ['db_id' => $prediction->id]
            );
        }

        $prediction->update([
            'final_prediction' => $lensResult['final_prediction'] ?? 'Unknown',
            'country'          => 'Google Lens',
            'era'              => 'AI Conclusion',
            'result_json'      => $lensResult,
            'lens_results'     => $lensResult['lens_results'] ?? [],
        ]);

        // Quota deduction
        $note = '';
        if ($user->free_predictions_used < self::FREE_LIMIT) {
            $user->increment('free_predictions_used');
            $remaining = self::FREE_LIMIT - $user->fresh()->free_predictions_used;
            $note = 'Lượt miễn phí còn lại: ' . $remaining;
        } else {
            $user->decrement('token_balance', self::TOKEN_COST);
            TokenHistory::create([
                'user_id'     => $user->id,
                'type'        => 'out',
                'amount'      => self::TOKEN_COST,
                'description' => 'Phân tích Lens: ' . mb_substr($lensResult['final_prediction'] ?? 'Unknown', 0, 50) . '...',
            ]);
            $note = 'Đã trừ 1 lượt. Còn lại: ' . (float) $user->fresh()->token_balance;
        }

        return $this->ok([
            'data'  => $lensResult,
            'db_id' => $prediction->id,
            'quota' => [
                'free_used'     => (int) $user->fresh()->free_predictions_used,
                'free_limit'    => self::FREE_LIMIT,
                'token_balance' => (float) $user->fresh()->token_balance,
                'note'          => $note,
            ],
        ], 'Phân tích Lens hoàn tất');
    }

    public function chat(ChatRequest $request): JsonResponse
    {
        set_time_limit(300); // Allow enough time for Azure AI cold start
        $user = $request->user();
        $query = $request->validated()['question'];
        $lang = $request->input('lang', 'vi'); // default to vi
        $pythonAiUrl = rtrim((string) env('PYTHON_AI_URL', 'http://127.0.0.1:8001'), '/');

        $freeUsed = (int) ($user->free_predictions_used ?? 0);
        $balance  = (float) ($user->token_balance ?? 0);

        if ($freeUsed >= self::FREE_LIMIT && $balance < self::CHAT_COST) {
            return $this->fail(
                'Tài khoản của bạn đã hết lượt. Vui lòng nạp thêm lượt.',
                402,
                'PAYMENT_REQUIRED'
            );
        }

        $answer = 'Không thể kết nối đến AI Engine lúc này. Vui lòng thử lại sau.';
        $sources = [];

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(120)
                ->connectTimeout(30)
                ->post($pythonAiUrl . '/chat', [
                    'question' => $query,
                    'lang'     => $lang,
                ]);

            if ($response->successful()) {
                $aiData = $response->json();
                $answer = $aiData['answer'] ?? $answer;
                $sources = $aiData['sources'] ?? [];
            } else {
                Log::warning('AI chat returned non-200', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('AI chat failed', ['error' => $e->getMessage()]);
        }

        if ($user && $user->free_predictions_used >= self::FREE_LIMIT) {
            $user->decrement('token_balance', self::CHAT_COST);
            TokenHistory::create([
                'user_id'     => $user->id,
                'type'        => 'out',
                'amount'      => self::CHAT_COST,
                'description' => 'Trừ phí sử dụng Chatbot AI',
            ]);
        }

        return $this->ok([
            'answer'             => $answer,
            'tokens_charged'     => self::CHAT_COST,
            'user_token_balance' => (float) $user->fresh()->token_balance,
            'sources'            => $sources,
        ], 'OK');
    }

    public function history(): JsonResponse
    {
        $this->expireStalePredictions((int) auth()->id());

        $history = Prediction::where('user_id', auth()->id())
            ->latest()
            ->get()
            ->map(fn ($item) => $this->formatPrediction($item));

        return $this->ok($history, 'OK');
    }

    public function show($id): JsonResponse
    {
        $this->expireStalePredictions((int) auth()->id());

        $item = Prediction::where('user_id', auth()->id())->findOrFail($id);
        return $this->ok($this->formatPrediction($item, true), 'OK');
    }

    private function shouldProcessAsync(PredictRequest $request): bool
    {
        return (bool) config('services.ai.async_enabled', false)
            && $request->boolean('is_async');
    }

    private function expireStalePredictions(int $userId): void
    {
        $timeoutMinutes = max(
            1,
            (int) config('services.ai.pending_timeout_minutes', 15)
        );

        Prediction::where('user_id', $userId)
            ->whereIn('final_prediction', self::PENDING_LABELS)
            ->where('created_at', '<=', now()->subMinutes($timeoutMinutes))
            ->get()
            ->each(function (Prediction $prediction) use ($timeoutMinutes) {
                $this->markPredictionFailed(
                    $prediction,
                    "Quá thời gian xử lý {$timeoutMinutes} phút."
                );
            });
    }

    private function markPredictionFailed(Prediction $prediction, string $reason): void
    {
        $prediction->update([
            'final_prediction' => 'Lỗi xử lý giám định',
            'country' => 'Không xác định',
            'era' => 'Vui lòng thử lại',
            'result_json' => [
                'error' => $reason,
                'status' => 'failed',
            ],
        ]);
    }

    // Format prediction to a stable shape that includes certainty + confidence
    private function formatPrediction(Prediction $item, bool $detailed = false): array
    {
        $imageUrl = filter_var($item->image, FILTER_VALIDATE_URL)
            ? $item->image
            : url('/api/img/' . $item->image);

        $resultJson = $item->result_json ?? [];
        $finalReport = is_array($resultJson) ? ($resultJson['final_report'] ?? []) : [];

        $confidence = $finalReport['confidence']
            ?? $finalReport['final_confidence']
            ?? ($resultJson['confidence'] ?? null);

        $certainty = $finalReport['certainty']
            ?? $finalReport['assessment']
            ?? ($resultJson['confidence'] ?? null);

        $payload = [
            'id'              => $item->id,
            'image_url'       => $imageUrl,
            'predicted_label' => $item->final_prediction,
            'country'         => $item->country,
            'era'             => $item->era,
            'confidence'      => $confidence !== null ? (float) $confidence : null,
            'certainty'       => $certainty,
            'source_type'     => $item->source_type ?? 'debate',
            'lens_results'    => $item->lens_results,
            'lens_status'     => $resultJson['lens_status'] ?? null,
            'created_at'      => $item->created_at,
        ];

        if ($detailed) {
            $payload['result'] = $resultJson;
            $payload['final_report'] = $finalReport;
        }

        return $payload;
    }
}
