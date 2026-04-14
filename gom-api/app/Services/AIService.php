<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

class AIService
{
    private $pythonUrl;

    public function __construct()
    {
        // Adjust endpoint as needed. Default is 8001 for Python AI Server
        $this->pythonUrl = env('PYTHON_AI_URL', 'http://127.0.0.1:8001');
    }

    /**
     * Call the Multi-Agent Debate Python Server.
     */
    public function runMultiAgentDebate(UploadedFile $image): array
    {
        Log::info("AIService: sending image to Python server...");
        
        try {
            $response = Http::timeout(120)->attach(
                'file',
                file_get_contents($image->getRealPath()),
                $image->getClientOriginalName()
            )->post("{$this->pythonUrl}/predict");

            if (!$response->successful()) {
                $errorMsg = 'AI Server responded with status ' . $response->status();
                $body = $response->json();
                if (is_array($body) && isset($body['detail'])) {
                    $errorMsg = $body['detail'];
                }
                
                Log::error("AI Server response failed: " . $response->body());
                return [
                    'error' => $errorMsg
                ];
            }

            return $response->json();
            
        } catch (\Exception $e) {
            Log::error("AIService Connection Error: " . $e->getMessage());
            return [
                'error' => 'Could not connect to Python AI Server'
            ];
        }
    }
}
