<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIService
{
    private string $pythonUrl;

    public function __construct()
    {
        $this->pythonUrl = rtrim((string) env('PYTHON_AI_URL', 'http://127.0.0.1:8001'), '/');
    }

    // Call the Python FastAPI Multi-Agent Debate Server
    public function runMultiAgentDebate(UploadedFile $image, string $lang = 'vi'): array
    {
        $endpoint = "{$this->pythonUrl}/predict";

        Log::info('AIService: preparing to send image to Python AI server', [
            'endpoint' => $endpoint,
            'lang' => $lang,
            'original_name' => $image->getClientOriginalName(),
            'mime_type' => $image->getMimeType(),
            'size_bytes' => $image->getSize(),
            'real_path' => $image->getRealPath(),
        ]);

        if (!$image->isValid()) {
            Log::error('AIService: uploaded image is invalid', [
                'error' => $image->getErrorMessage(),
            ]);

            return [
                'error' => 'Uploaded image is invalid: ' . $image->getErrorMessage(),
            ];
        }

        $realPath = $image->getRealPath();

        if (!$realPath || !file_exists($realPath)) {
            Log::error('AIService: uploaded image temp file not found', [
                'real_path' => $realPath,
            ]);

            return [
                'error' => 'Uploaded image temp file not found',
            ];
        }

        try {
            $response = Http::connectTimeout(30)
                ->timeout(300)
                ->retry(1, 2000)
                ->attach(
                    'file',
                    fopen($realPath, 'r'),
                    $image->getClientOriginalName()
                )
                ->post($endpoint, ['lang' => $lang]);

            Log::info('AIService: Python AI server responded', [
                'status' => $response->status(),
                'body_preview' => substr($response->body(), 0, 1000),
            ]);

            if (!$response->successful()) {
                $errorMsg = 'AI Server responded with status ' . $response->status();

                $body = $response->json();

                if (is_array($body)) {
                    if (isset($body['detail'])) {
                        $errorMsg = is_string($body['detail'])
                            ? $body['detail']
                            : json_encode($body['detail'], JSON_UNESCAPED_UNICODE);
                    } elseif (isset($body['error'])) {
                        $errorMsg = is_string($body['error'])
                            ? $body['error']
                            : json_encode($body['error'], JSON_UNESCAPED_UNICODE);
                    } elseif (isset($body['message'])) {
                        $errorMsg = is_string($body['message'])
                            ? $body['message']
                            : json_encode($body['message'], JSON_UNESCAPED_UNICODE);
                    }
                }

                Log::error('AIService: Python AI server returned non-success response', [
                    'status' => $response->status(),
                    'error' => $errorMsg,
                    'body' => $response->body(),
                ]);

                return [
                    'error' => $errorMsg,
                ];
            }

            $json = $response->json();

            if (!is_array($json)) {
                Log::error('AIService: Python AI server returned invalid JSON', [
                    'body' => $response->body(),
                ]);

                return [
                    'error' => 'AI Server returned invalid JSON response',
                ];
            }

            return $json;
        } catch (\Throwable $e) {
            Log::error('AIService: connection or timeout error when calling Python AI server', [
                'endpoint' => $endpoint,
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'error' => 'Could not connect to Python AI Server: ' . $e->getMessage(),
            ];
        }
    }

    // Call the Python FastAPI Lens Endpoint
    public function runLens(UploadedFile $image, string $lang = 'vi'): array
    {
        $endpoint = "{$this->pythonUrl}/predict/lens";

        Log::info('AIService: preparing to send image to Python Lens endpoint', [
            'endpoint' => $endpoint,
            'lang' => $lang,
        ]);

        $realPath = $image->getRealPath();

        if (!$realPath || !file_exists($realPath)) {
            return ['error' => 'Uploaded image temp file not found'];
        }

        try {
            $response = Http::connectTimeout(30)
                ->timeout(600) // 10 mins for Lens
                ->retry(1, 2000)
                ->attach('file', fopen($realPath, 'r'), $image->getClientOriginalName())
                ->post($endpoint, ['lang' => $lang]);

            if (!$response->successful()) {
                Log::error('AIService Lens error', ['status' => $response->status(), 'body' => $response->body()]);
                return ['error' => 'AI Server returned status ' . $response->status()];
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('AIService Lens exception', ['error' => $e->getMessage()]);
            return ['error' => 'Could not connect to Python AI Server: ' . $e->getMessage()];
        }
    }
}