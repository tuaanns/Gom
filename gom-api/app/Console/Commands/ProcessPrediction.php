<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Prediction;
use App\Models\TokenHistory;
use App\Models\User;
use App\Services\AIService;
use Illuminate\Support\Facades\Log;

class ProcessPrediction extends Command
{
    protected $signature = 'app:process-prediction {id} {lang=vi}';
    protected $description = 'Process multi-agent debate or lens prediction in the background';

    public function __construct(private AIService $aiService)
    {
        parent::__construct();
    }

    public function handle()
    {
        $id = $this->argument('id');
        $lang = $this->argument('lang');

        $prediction = Prediction::find($id);
        if (!$prediction) {
            Log::error("ProcessPrediction: Prediction ID {$id} not found");
            return 1;
        }

        $user = User::find($prediction->user_id);
        if (!$user) {
            Log::error("ProcessPrediction: User for prediction ID {$id} not found");
            return 1;
        }

        $tempPath = storage_path("app/temp/prediction_{$id}.jpg");
        if (!file_exists($tempPath)) {
            Log::error("ProcessPrediction: Temp file {$tempPath} not found");
            $prediction->update([
                'final_prediction' => 'Lỗi: Không tìm thấy tệp ảnh tạm thời',
                'era'              => 'Vui lòng thử lại',
            ]);
            return 1;
        }

        Log::info("ProcessPrediction: Processing prediction {$id} (type: {$prediction->source_type}, lang: {$lang})");

        try {
            if (($prediction->source_type ?? 'debate') === 'lens') {
                $debateResult = $this->aiService->runLens($tempPath, $lang);
            } else {
                $debateResult = $this->aiService->runMultiAgentDebate($tempPath, $lang);
            }

            if (isset($debateResult['error'])) {
                $isNonPottery = array_key_exists('is_pottery', $debateResult) && $debateResult['is_pottery'] === false;

                $prediction->update([
                    'final_prediction' => $isNonPottery ? 'Ảnh không phải gốm/sứ' : 'Lỗi hệ thống AI',
                    'country'          => $isNonPottery ? 'Không áp dụng' : 'Không xác định',
                    'era'              => $isNonPottery ? 'Không áp dụng' : 'Vui lòng thử lại',
                    'result_json'      => $debateResult,
                ]);
                Log::warning("ProcessPrediction: AI processing failed: " . $debateResult['error']);
                return 1;
            }

            if (($prediction->source_type ?? 'debate') === 'lens') {
                $prediction->update([
                    'final_prediction' => $debateResult['final_prediction'] ?? 'Unknown',
                    'country'          => 'Google Lens',
                    'era'              => 'AI Conclusion',
                    'result_json'      => $debateResult,
                    'lens_results'     => $debateResult['lens_results'] ?? [],
                ]);
            } else {
                $final = $debateResult['final_report'] ?? [];
                $prediction->update([
                    'final_prediction' => $final['final_prediction'] ?? 'Unknown',
                    'country'          => $final['final_country'] ?? null,
                    'era'              => $final['final_era'] ?? null,
                    'result_json'      => $debateResult,
                    'lens_results'     => $debateResult['lens_results'] ?? [],
                ]);
            }

            // Quota deduction
            $freeLimit = 5;
            $tokenCost = 1.0;
            if ($user->free_predictions_used < $freeLimit) {
                $user->increment('free_predictions_used');
            } else {
                $user->decrement('token_balance', $tokenCost);
                TokenHistory::create([
                    'user_id'     => $user->id,
                    'type'        => 'out',
                    'amount'      => $tokenCost,
                    'description' => (($prediction->source_type ?? 'debate') === 'lens' ? 'Phân tích Lens: ' : 'Phân tích gốm: ') . ($prediction->final_prediction),
                ]);
            }

            Log::info("ProcessPrediction: Successfully processed prediction {$id}");

        } catch (\Throwable $e) {
            Log::error("ProcessPrediction: Exception occurred: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            $prediction->update([
                'final_prediction' => 'Lỗi hệ thống AI',
                'era'              => 'Vui lòng thử lại',
            ]);
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }

        return 0;
    }
}
