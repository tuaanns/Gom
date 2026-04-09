<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Prediction;
use App\Models\TokenHistory;
use App\Services\AIService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;

class PredictionController extends Controller
{
    const FREE_LIMIT = 5;
    const TOKEN_COST = 1.0;
    private $aiService;
    public function __construct(AIService $aiService) { $this->aiService = $aiService; }

    public function predict(Request $request): JsonResponse
    {
        set_time_limit(200);
        $request->validate(['image' => 'required|image|max:15360']);
        $user = auth('sanctum')->user();

        // --- Check quota ---
        if ($user) {
            $freeUsed = (int)$user->free_predictions_used;
            $balance  = (float)$user->token_balance;
            if ($freeUsed >= self::FREE_LIMIT && $balance < self::TOKEN_COST) {
                return response()->json([
                    'status'  => 'error',
                    'code'    => 'PAYMENT_REQUIRED',
                    'message' => 'Ban da het 5 luot mien phi. Vui long nap them luot de tiep tuc.',
                    'free_used' => $freeUsed,
                    'token_balance' => $balance,
                ], 402);
            }
        }

        $image = $request->file('image');
        $path  = $image->store('potteries', 'public');
        $prediction = Prediction::create([
            'user_id'          => $user?->id ?? 2,
            'image'            => $path,
            'final_prediction' => 'Dang phan tich...',
            'country'          => 'Dang xu ly',
            'era'              => 'Dang xu ly',
            'result_json'      => null,
        ]);

        $debateResult = $this->aiService->runMultiAgentDebate($image);

        if (isset($debateResult['error'])) {
            $prediction->update(['final_prediction'=>'Loi he thong AI','era'=>'Vui long thu lai','result_json'=>['error'=>$debateResult['error']]]);
            return response()->json(['status'=>'error','message'=>'AI Server Error: '.$debateResult['error'],'db_id'=>$prediction->id], 502);
        }

        $final = $debateResult['final_report'] ?? [];
        $prediction->update([
            'final_prediction' => $final['final_prediction'] ?? 'Unknown',
            'country'          => $final['final_country'] ?? null,
            'era'              => $final['final_era'] ?? null,
            'result_json'      => $debateResult,
        ]);

        // --- Deduct quota/token ---
        if ($user) {
            if ((int)$user->free_predictions_used < self::FREE_LIMIT) {
                $user->increment('free_predictions_used');
                $remaining = self::FREE_LIMIT - $user->fresh()->free_predictions_used;
                $note = 'Luot mien phi con lai: '.$remaining;
            } else {
                $user->decrement('token_balance', self::TOKEN_COST);
                TokenHistory::create(['user_id'=>$user->id,'type'=>'out','amount'=>self::TOKEN_COST,'description'=>'Phan tich gom: '.($final['final_prediction'] ?? 'Unknown')]);
                $note = 'Da tru 1 luot. Con lai: '.(float)$user->fresh()->token_balance;
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => $debateResult,
            'db_id'  => $prediction->id,
            'quota'  => [
                'free_used'     => (int)($user?->fresh()->free_predictions_used ?? 0),
                'free_limit'    => self::FREE_LIMIT,
                'token_balance' => (float)($user?->fresh()->token_balance ?? 0),
                'note'          => $note ?? '',
            ],
        ]);
    }

    public function chat(Request $request): JsonResponse {
        $user = auth('sanctum')->user();
        $query = $request->input('question', '');
        
        if ($user && (float)$user->token_balance < 0.1) {
            return response()->json([
                'status' => 'error', 
                'message' => 'Lỗi: Tài khoản của bạn đã hết lượt. Vui lòng nạp thêm lượt.'
            ], 402);
        }

        try {
            // Forward request to FastAPI engine using pure stream to avoid Guzzle header conflicts
            $opts = [
                'http' => [
                    'method'  => 'POST',
                    'header'  => "Content-Type: application/json\r\n",
                    'content' => json_encode(['question' => $query]),
                    'timeout' => 30
                ]
            ];
            $context = stream_context_create($opts);
            $aiResponse = file_get_contents('http://127.0.0.1:8001/chat', false, $context);
            if ($aiResponse === false) {
                throw new \Exception("Connection failed");
            }
            $aiData = json_decode($aiResponse, true);
            $answer = $aiData['answer'] ?? "Lỗi: Không nhận được phản hồi từ AI Engine.";
            $sources = $aiData['sources'] ?? [];
        } catch (\Exception $e) {
            $answer = "Không thể kết nối đến AI Engine lúc này. Vui lòng thử lại sau.";
            $sources = [];
        }
        
        // Deduct exactly 0.1 token per chat exactly as DOCS mentioned float subtraction
        if ($user) {
            $user->decrement('token_balance', 0.1);
            TokenHistory::create([
                'user_id' => $user->id,
                'type' => 'out',
                'amount' => 0.1,
                'description' => 'Trừ phí sử dụng Chatbot AI'
            ]);
        }

        return response()->json([
            'answer' => $answer,
            'tokens_charged' => 0.1,
            'user_token_balance' => (float)$user?->fresh()->token_balance,
            'sources' => $sources
        ]);
    }

    public function history(): JsonResponse {
        $history = Prediction::where('user_id', auth()->id())->latest()->get()->map(function($item) {
            return ['id'=>$item->id,'image_url'=>url('/api/img/'.$item->image),'prediction'=>$item->final_prediction,'country'=>$item->country,'era'=>$item->era,'data'=>$item->result_json,'created_at'=>$item->created_at];
        });
        return response()->json(['data' => $history]);
    }

    public function show($id): JsonResponse {
        $item = Prediction::findOrFail($id);
        return response()->json(['status'=>'success','data'=>['id'=>$item->id,'image_url'=>url('/api/img/'.$item->image),'prediction'=>$item->final_prediction,'country'=>$item->country,'era'=>$item->era,'data'=>$item->result_json,'created_at'=>$item->created_at]]);
    }
}

