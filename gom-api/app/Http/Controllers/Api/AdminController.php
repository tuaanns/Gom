<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Prediction;
use App\Models\Payment;
use App\Models\CeramicLine;
use App\Models\TokenHistory;
use App\Services\AzureBlobStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private $azureStorage;

    public function __construct(AzureBlobStorageService $azureStorage)
    {
        $this->azureStorage = $azureStorage;
    }

    public function dashboard(): JsonResponse
    {
        $stats = [
            'total_users'           => User::count(),
            'total_predictions'     => Prediction::count(),
            'total_ceramics'        => CeramicLine::count(),
            'total_ceramics_featured' => CeramicLine::where('is_featured', true)->count(),
            'total_revenue'         => (int) Payment::where('status', 'completed')->sum('amount_vnd'),
            'total_credits_sold'    => (int) Payment::where('status', 'completed')->sum('credit_amount'),
            'payments_pending'      => Payment::where('status', 'pending')->count(),
            'payments_failed'       => Payment::where('status', 'failed')->count(),
            'payments_completed'    => Payment::where('status', 'completed')->count(),
        ];

        $recentUsers = User::select(['id', 'name', 'email', 'avatar', 'role', 'token_balance', 'created_at'])
            ->latest()->limit(5)->get();

        $recentPredictions = Prediction::with('user:id,name,email')
            ->select(['id', 'user_id', 'final_prediction', 'country', 'era', 'image', 'created_at'])
            ->latest()->limit(5)->get()
            ->map(function ($p) {
                return [
                    'id'              => $p->id,
                    'predicted_label' => $p->final_prediction,
                    'country'         => $p->country,
                    'era'             => $p->era,
                    'image_url'       => $p->image,
                    'user'            => $p->user,
                    'created_at'      => $p->created_at,
                ];
            });

        $recentPayments = Payment::with('user:id,name,email')
            ->select(['id', 'user_id', 'package_name', 'amount_vnd', 'credit_amount', 'status', 'hex_id', 'created_at'])
            ->latest()->limit(5)->get()
            ->map(function ($p) {
                return [
                    'id'            => $p->id,
                    'hex_id'        => $p->hex_id,
                    'package_name'  => $p->package_name,
                    'amount'        => $p->amount_vnd,
                    'credit_amount' => $p->credit_amount,
                    'status'        => $p->status,
                    'user'          => $p->user,
                    'created_at'    => $p->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data'    => [
                'stats'              => $stats,
                'recent_users'       => $recentUsers,
                'recent_predictions' => $recentPredictions,
                'recent_payments'    => $recentPayments,
            ],
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $query = User::select(['id', 'name', 'email', 'role', 'token_balance', 'free_predictions_used', 'avatar', 'phone', 'created_at']);

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->limit(1000)->get();

        // Add free_limit (hardcoded as 5 for now) and rename free_predictions_used to free_used for frontend
        $users = $users->map(function($user) {
            $user->free_used = $user->free_predictions_used;
            $user->free_limit = 5;
            unset($user->free_predictions_used);
            return $user;
        });

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function showUser($id): JsonResponse
    {
        $user = User::select([
            'id', 'name', 'email', 'role', 'token_balance', 'free_predictions_used',
            'avatar', 'phone', 'email_verified_at', 'created_at', 'updated_at',
        ])->findOrFail($id);

        $recentPredictions = Prediction::where('user_id', $user->id)
            ->select(['id', 'final_prediction', 'country', 'era', 'image', 'created_at'])
            ->latest()->limit(10)->get()
            ->map(function ($p) {
                return [
                    'id'              => $p->id,
                    'predicted_label' => $p->final_prediction,
                    'country'         => $p->country,
                    'era'             => $p->era,
                    'image_url'       => $p->image,
                    'created_at'      => $p->created_at,
                ];
            });

        $recentPayments = Payment::where('user_id', $user->id)
            ->select(['id', 'package_name', 'amount_vnd', 'credit_amount', 'status', 'hex_id', 'created_at'])
            ->latest()->limit(10)->get()
            ->map(function ($p) {
                return [
                    'id'            => $p->id,
                    'hex_id'        => $p->hex_id,
                    'package_name'  => $p->package_name,
                    'amount'        => $p->amount_vnd,
                    'credit_amount' => $p->credit_amount,
                    'status'        => $p->status,
                    'created_at'    => $p->created_at,
                ];
            });

        $recentTokenHistory = TokenHistory::where('user_id', $user->id)
            ->select(['id', 'type', 'amount', 'description', 'created_at'])
            ->latest()->limit(20)->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'user'                 => array_merge($user->toArray(), [
                    'free_used'  => $user->free_predictions_used,
                    'free_limit' => 5,
                ]),
                'recent_predictions'   => $recentPredictions,
                'recent_payments'      => $recentPayments,
                'recent_token_history' => $recentTokenHistory,
            ],
        ]);
    }

    public function updateUser(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'role'          => 'sometimes|in:user,admin',
            'token_balance' => 'sometimes|numeric|min:0',
            'free_limit'    => 'sometimes|integer|min:0',
            'name'          => 'sometimes|string|max:255',
            'avatar'        => 'sometimes|string|nullable',
            'phone'         => 'sometimes|string|max:20|nullable',
        ]);

        // free_limit is not a real DB column — it's hardcoded as 5.
        // When admin sets free_limit, we reset free_predictions_used so
        // the user gets that many free predictions remaining.
        if (array_key_exists('free_limit', $validated)) {
            $newLimit = (int) $validated['free_limit'];
            // Reset used count so remaining = newLimit
            // e.g. if admin sets free_limit=3, we set used = max(0, 5 - 3) 
            // so remaining = 5 - used = 3
            $currentLimit = 5; // hardcoded system limit
            $newUsed = max(0, $currentLimit - $newLimit);
            $validated['free_predictions_used'] = $newUsed;
            unset($validated['free_limit']);
        }

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data'    => $user->fresh(),
        ]);
    }

    public function deleteUser($id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete yourself',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ]);
    }

    public function ceramicLines(Request $request): JsonResponse
    {
        $search   = $request->query('search');
        $country  = $request->query('country');
        $featured = $request->query('featured');

        $query = CeramicLine::select([
            'id', 'name', 'name_en', 'origin', 'origin_en', 'country', 'country_en', 'era', 'era_en', 'description', 'description_en',
            'image_url', 'style', 'style_en', 'is_featured', 'created_at',
        ]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('country', 'like', "%{$search}%")
                  ->orWhere('era', 'like', "%{$search}%")
                  ->orWhere('origin', 'like', "%{$search}%");
            });
        }
        if ($country) {
            $query->where('country', $country);
        }
        if ($featured !== null && $featured !== '') {
            $query->where('is_featured', filter_var($featured, FILTER_VALIDATE_BOOLEAN));
        }

        $lines = $query->orderByDesc('is_featured')->orderBy('name')->limit(500)->get();

        return response()->json([
            'success' => true,
            'data'    => $lines,
        ]);
    }

    public function showCeramicLine($id): JsonResponse
    {
        $line = CeramicLine::findOrFail($id);
        return response()->json(['success' => true, 'data' => $line]);
    }

    public function storeCeramicLine(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'origin' => 'nullable|string|max:255',
            'origin_en' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'country_en' => 'nullable|string|max:255',
            'era' => 'nullable|string|max:255',
            'era_en' => 'nullable|string|max:255',
            'style' => 'nullable|string|max:255',
            'style_en' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'description_en' => 'nullable|string',
            'image_url' => 'nullable|string',
            'is_featured' => 'nullable|boolean',
        ]);

        // Set default values
        if (!isset($data['origin'])) {
            $data['origin'] = $data['country'] ?? 'Unknown';
        }
        if (!isset($data['country'])) {
            $data['country'] = $data['origin'] ?? 'Unknown';
        }

        $line = CeramicLine::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Ceramic line created successfully',
            'data'    => $line,
        ]);
    }

    public function updateCeramicLine(Request $request, $id): JsonResponse
    {
        $line = CeramicLine::findOrFail($id);

        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'name_en'        => 'sometimes|nullable|string|max:255',
            'origin'         => 'sometimes|nullable|string|max:255',
            'origin_en'      => 'sometimes|nullable|string|max:255',
            'country'        => 'sometimes|string|max:255',
            'country_en'     => 'sometimes|nullable|string|max:255',
            'era'            => 'sometimes|nullable|string|max:255',
            'era_en'         => 'sometimes|nullable|string|max:255',
            'style'          => 'sometimes|nullable|string|max:255',
            'style_en'       => 'sometimes|nullable|string|max:255',
            'description'    => 'sometimes|nullable|string',
            'description_en' => 'sometimes|nullable|string',
            'image_url'      => 'sometimes|nullable|string',
            'is_featured'    => 'sometimes|boolean',
        ]);

        $line->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Ceramic line updated successfully',
            'data'    => $line->fresh(),
        ]);
    }

    public function deleteCeramicLine($id): JsonResponse
    {
        $line = CeramicLine::findOrFail($id);
        $line->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ceramic line deleted successfully',
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $search = $request->query('search');
        $status = $request->query('status');

        $query = Payment::select([
            'id', 'user_id', 'amount_vnd', 'credit_amount', 'status',
            'package_name', 'hex_id', 'sepay_tx_id', 'expired_at', 'created_at',
        ]);

        if ($status) {
            $query->where('status', $status);
        }
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('hex_id', 'like', "%{$search}%")
                  ->orWhere('package_name', 'like', "%{$search}%")
                  ->orWhere('sepay_tx_id', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->where('email', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        $payments = $query->latest()->limit(500)->get();

        $userIds = $payments->pluck('user_id')->unique();
        $users = User::whereIn('id', $userIds)->get(['id', 'name', 'email'])->keyBy('id');

        $payments = $payments->map(function ($payment) use ($users) {
            $payment->amount         = $payment->amount_vnd;
            $payment->payment_method = 'bank_transfer';
            $payment->user           = $users->get($payment->user_id);
            unset($payment->amount_vnd);
            return $payment;
        });

        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function showPayment($id): JsonResponse
    {
        $payment = Payment::with('user:id,name,email,avatar')->findOrFail($id);
        $payment->amount         = $payment->amount_vnd;
        $payment->payment_method = 'bank_transfer';
        return response()->json(['success' => true, 'data' => $payment]);
    }

    public function paymentPackages(): JsonResponse
    {
        $packages = \App\Models\PaymentPackage::all();
        return response()->json(['success' => true, 'data' => $packages]);
    }

    public function storePaymentPackage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'name_en'     => 'nullable|string|max:255',
            'price'       => 'required|numeric|min:0',
            'credits'     => 'required|integer|min:1',
            'featured'    => 'nullable|boolean',
            'discount'    => 'nullable|string|max:255',
            'discount_en' => 'nullable|string|max:255',
        ]);

        $pkg = \App\Models\PaymentPackage::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Gói nạp đã được tạo',
            'data'    => $pkg,
        ]);
    }

    public function updatePaymentPackage(Request $request, $id): JsonResponse
    {
        $pkg = \App\Models\PaymentPackage::findOrFail($id);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'name_en'     => 'sometimes|nullable|string|max:255',
            'price'       => 'sometimes|numeric|min:0',
            'credits'     => 'sometimes|integer|min:1',
            'featured'    => 'sometimes|boolean',
            'discount'    => 'sometimes|nullable|string|max:255',
            'discount_en' => 'sometimes|nullable|string|max:255',
        ]);

        $pkg->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật gói nạp thành công',
            'data'    => $pkg->fresh(),
        ]);
    }

    public function deletePaymentPackage($id): JsonResponse
    {
        $pkg = \App\Models\PaymentPackage::findOrFail($id);
        $pkg->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa gói nạp',
        ]);
    }

    public function pages(): JsonResponse
    {
        $pages = \App\Models\Page::all();
        return response()->json(['success' => true, 'data' => $pages]);
    }

    public function showPage($slug): JsonResponse
    {
        $page = \App\Models\Page::where('slug', $slug)->first();
        if (!$page) {
            return response()->json(['success' => false, 'message' => 'Page not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $page]);
    }

    /**
     * Public endpoint: return merged i18n overrides from all pages.
     * Frontend calls this on boot to override default i18n translations.
     */
    public function pageOverrides(): JsonResponse
    {
        $pages = \App\Models\Page::whereNotNull('content')
            ->where('content', '!=', '')
            ->get(['content']);

        $merged = [];
        foreach ($pages as $page) {
            $decoded = json_decode($page->content, true);
            if (is_array($decoded)) {
                $merged = array_merge($merged, $decoded);
            }
        }

        return response()->json(['success' => true, 'data' => $merged]);
    }

    public function updatePage(Request $request, $id): JsonResponse
    {
        $page = \App\Models\Page::findOrFail($id);

        $data = $request->validate([
            'slug'            => 'sometimes|string|max:100|unique:pages,slug,' . $id,
            'title'           => 'sometimes|string|max:255',
            'title_en'        => 'sometimes|nullable|string|max:255',
            'content'         => 'sometimes|string|nullable',
            'seo_title'       => 'sometimes|nullable|string|max:255',
            'seo_description' => 'sometimes|nullable|string',
            'seo_keywords'    => 'sometimes|nullable|string|max:255',
        ]);

        $page->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trang thành công',
            'data'    => $page->fresh(),
        ]);
    }

    public function storePage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slug'            => 'required|string|max:100|unique:pages,slug',
            'title'           => 'required|string|max:255',
            'title_en'        => 'nullable|string|max:255',
            'content'         => 'nullable|string',
            'seo_title'       => 'nullable|string|max:255',
            'seo_description' => 'nullable|string',
            'seo_keywords'    => 'nullable|string|max:255',
        ]);

        $page = \App\Models\Page::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Tạo trang mới thành công',
            'data'    => $page,
        ], 201);
    }

    public function deletePage($id): JsonResponse
    {
        $page = \App\Models\Page::findOrFail($id);
        $page->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa trang thành công',
        ]);
    }

    public function predictions(Request $request): JsonResponse
    {
        $search  = $request->query('search');
        $country = $request->query('country');
        $era     = $request->query('era');

        $query = Prediction::with('user:id,name,email')
            ->select(['id', 'user_id', 'final_prediction', 'country', 'era', 'image', 'result_json', 'created_at']);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('final_prediction', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->where('email', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }
        if ($country) {
            $query->where('country', $country);
        }
        if ($era) {
            $query->where('era', 'like', "%{$era}%");
        }

        $predictions = $query->latest()->limit(500)->get();

        $predictions = $predictions->map(function ($prediction) {
            $resultJson = $prediction->result_json ?? [];
            $finalReport = is_array($resultJson) ? ($resultJson['final_report'] ?? []) : [];
            $rawConfidence = $finalReport['confidence']
                ?? $finalReport['final_confidence']
                ?? null;

            // Normalize: certainty often comes back as 0..100 string; confidence as 0..1
            $confidence = null;
            if (is_numeric($rawConfidence)) {
                $val = (float) $rawConfidence;
                $confidence = $val > 1 ? round($val / 100, 4) : round($val, 4);
            } elseif (isset($finalReport['certainty']) && is_numeric($finalReport['certainty'])) {
                $confidence = round(((float) $finalReport['certainty']) / 100, 4);
            }

            $prediction->predicted_label = $prediction->final_prediction;
            $prediction->label           = $prediction->final_prediction;
            $prediction->confidence      = $confidence;
            $prediction->image_url       = $prediction->image;
            $prediction->image_path      = null;
            // Drop heavy result_json from list payload
            unset($prediction->final_prediction, $prediction->result_json);
            return $prediction;
        });

        return response()->json(['success' => true, 'data' => $predictions]);
    }

    public function showPrediction($id): JsonResponse
    {
        $prediction = Prediction::with('user:id,name,email,avatar')->findOrFail($id);
        $resultJson = $prediction->result_json ?? [];
        $finalReport = is_array($resultJson) ? ($resultJson['final_report'] ?? []) : [];
        $rawConfidence = $finalReport['confidence']
            ?? $finalReport['final_confidence']
            ?? null;

        $confidence = null;
        if (is_numeric($rawConfidence)) {
            $val = (float) $rawConfidence;
            $confidence = $val > 1 ? round($val / 100, 4) : round($val, 4);
        } elseif (isset($finalReport['certainty']) && is_numeric($finalReport['certainty'])) {
            $confidence = round(((float) $finalReport['certainty']) / 100, 4);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'id'              => $prediction->id,
                'user_id'         => $prediction->user_id,
                'user'            => $prediction->user,
                'predicted_label' => $prediction->final_prediction,
                'label'           => $prediction->final_prediction,
                'country'         => $prediction->country,
                'era'             => $prediction->era,
                'confidence'      => $confidence,
                'image_url'       => $prediction->image,
                'result'          => $resultJson,
                'final_report'    => $finalReport,
                'created_at'      => $prediction->created_at,
                'updated_at'      => $prediction->updated_at,
            ],
        ]);
    }

    public function tokenHistory(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');
        $type   = $request->query('type');
        $from   = $request->query('from');
        $to     = $request->query('to');

        $query = TokenHistory::query()
            ->select(['id', 'user_id', 'type', 'amount', 'description', 'created_at']);

        if ($userId) {
            $query->where('user_id', $userId);
        }
        if ($type && in_array($type, ['in', 'out'], true)) {
            $query->where('type', $type);
        }
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to . ' 23:59:59');
        }

        $rows = $query->latest()->limit(500)->get();

        $userIds = $rows->pluck('user_id')->unique();
        $users = User::whereIn('id', $userIds)
            ->get(['id', 'name', 'email', 'avatar'])
            ->keyBy('id');

        $rows = $rows->map(function ($row) use ($users) {
            $row->user = $users->get($row->user_id);
            return $row;
        });

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function getPaymentSettings(): JsonResponse
    {
        $method = \App\Models\Setting::getByKey('payment_method', 'sepay');
        return response()->json([
            'success' => true,
            'data'    => [
                'payment_method' => $method,
            ]
        ]);
    }

    public function updatePaymentSettings(Request $request): JsonResponse
    {
        $request->validate([
            'payment_method' => 'required|string|in:sepay,vnpay',
        ]);

        $method = $request->input('payment_method');
        \App\Models\Setting::setByKey('payment_method', $method);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật cấu hình thanh toán thành công',
            'data'    => [
                'payment_method' => $method,
            ]
        ]);
    }

    public function getApiSettings(): JsonResponse
    {
        $config = $this->loadApiSettings();

        return response()->json([
            'success' => true,
            'data'    => $config,
        ]);
    }

    public function updateApiSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'config' => ['required', 'array'],
            'config.api_keys' => ['nullable', 'array'],
            'config.api_keys.GOOGLE_API_KEY' => ['nullable', 'string'],
            'config.api_keys.GROQ_API_KEY' => ['nullable', 'string'],
            'config.api_keys.OPENAI_API_KEY' => ['nullable', 'string'],
            'config.api_keys.SERPAPI_API_KEY' => ['nullable', 'string'],
            'config.models' => ['required', 'array', 'min:1'],
            'config.models.*.id' => ['required', 'string', 'max:255'],
            'config.models.*.name' => ['nullable', 'string', 'max:255'],
            'config.models.*.provider' => ['required', 'string', 'in:google,groq,openai'],
            'config.models.*.role' => ['required', 'string', 'in:vision,agent_text,historian,kiln,global,judge,chat'],
            'config.models.*.is_active' => ['nullable', 'boolean'],
        ]);

        $config = $this->normalizeApiSettings($validated['config']);
        \App\Models\Setting::setByKey('api_settings', json_encode($config, JSON_UNESCAPED_UNICODE));

        // Sync to Python AI server
        $pythonAiUrl = rtrim((string) env('PYTHON_AI_URL', 'http://127.0.0.1:8001'), '/');
        $endpoint = "{$pythonAiUrl}/sync-keys";
        $syncStatus = 'skipped';

        try {
            $response = \Illuminate\Support\Facades\Http::connectTimeout(5)
                ->timeout(10)
                ->post($endpoint, $config);

            if ($response->successful()) {
                $syncStatus = 'synced';
                \Illuminate\Support\Facades\Log::info('AdminController: synchronized API settings to Python AI server.');
            } else {
                $syncStatus = 'failed';
                \Illuminate\Support\Facades\Log::error('AdminController: failed to sync API settings to Python AI server', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            $syncStatus = 'failed';
            \Illuminate\Support\Facades\Log::error('AdminController: exception syncing API settings: ' . $e->getMessage());
        }

        // Auto-update Laravel .env file with new API keys
        $envSyncStatus = $this->updateEnvKeys($config['api_keys'] ?? []);

        return response()->json([
            'success' => true,
            'message' => 'API and model configuration updated.',
            'data'    => [
                'config' => $config,
                'sync_status' => $syncStatus,
                'env_sync' => $envSyncStatus,
            ],
        ]);
    }

    private function loadApiSettings(): array
    {
        $rawConfig = \App\Models\Setting::getByKey('api_settings');
        if ($rawConfig) {
            $decoded = json_decode($rawConfig, true);
            if (is_array($decoded)) {
                return $this->normalizeApiSettings($decoded);
            }
        }

        return $this->defaultApiSettings();
    }

    private function defaultApiSettings(): array
    {
        return [
            'api_keys' => [
                'GOOGLE_API_KEY' => env('GOOGLE_API_KEY', ''),
                'GROQ_API_KEY'   => env('GROQ_API_KEY', ''),
                'OPENAI_API_KEY' => env('OPENAI_API_KEY', ''),
                'SERPAPI_API_KEY'=> env('SERPAPI_API_KEY', ''),
            ],
            'models' => [
                ['id' => 'gemini-3.1-flash-lite', 'name' => 'Gemini 3.1 Flash Lite (Vision)', 'provider' => 'google', 'role' => 'vision', 'is_active' => true],
                ['id' => 'gemini-2.5-pro', 'name' => 'Gemini 2.5 Pro (Vision)', 'provider' => 'google', 'role' => 'vision', 'is_active' => true],
                ['id' => 'gemini-2.5-flash', 'name' => 'Gemini 2.5 Flash (Vision)', 'provider' => 'google', 'role' => 'vision', 'is_active' => true],
                ['id' => 'llama-3.3-70b-versatile', 'name' => 'Llama 3.3 70B (Text)', 'provider' => 'groq', 'role' => 'agent_text', 'is_active' => true],
            ],
        ];
    }

    private function normalizeApiSettings(array $config): array
    {
        $defaults = $this->defaultApiSettings();
        $apiKeys = array_merge($defaults['api_keys'], $config['api_keys'] ?? []);

        $models = collect($config['models'] ?? $defaults['models'])
            ->filter(fn ($model) => is_array($model) && !empty($model['id']) && !empty($model['provider']) && !empty($model['role']))
            ->map(function ($model) {
                return [
                    'id' => trim((string) $model['id']),
                    'name' => trim((string) ($model['name'] ?? $model['id'])),
                    'provider' => trim((string) $model['provider']),
                    'role' => trim((string) $model['role']),
                    'is_active' => (bool) ($model['is_active'] ?? true),
                ];
            })
            ->values()
            ->all();

        return [
            'api_keys' => [
                'GOOGLE_API_KEY' => (string) ($apiKeys['GOOGLE_API_KEY'] ?? ''),
                'GROQ_API_KEY' => (string) ($apiKeys['GROQ_API_KEY'] ?? ''),
                'OPENAI_API_KEY' => (string) ($apiKeys['OPENAI_API_KEY'] ?? ''),
                'SERPAPI_API_KEY' => (string) ($apiKeys['SERPAPI_API_KEY'] ?? ''),
            ],
            'models' => $models,
        ];
    }

    /**
     * Auto-update the Laravel .env file with new API key values.
     *
     * - If a key exists in .env, update its value (or clear it if empty).
     * - If a key does NOT exist in .env but has a value, append it.
     * - Preserve all other lines (comments, non-API-key settings) untouched.
     */
    private function updateEnvKeys(array $apiKeys): string
    {
        $allowedKeys = ['GOOGLE_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'SERPAPI_API_KEY'];

        try {
            $envPath = base_path('.env');
            if (!file_exists($envPath)) {
                \Illuminate\Support\Facades\Log::warning('AdminController: .env file not found at ' . $envPath);
                return 'not_found';
            }

            $content = file_get_contents($envPath);
            $lines = explode("\n", $content);
            $updatedKeys = [];
            $newLines = [];

            foreach ($lines as $line) {
                $trimmed = trim($line);
                $matchedKey = null;

                foreach ($allowedKeys as $keyName) {
                    if (str_starts_with($trimmed, "{$keyName}=") || $trimmed === $keyName) {
                        $matchedKey = $keyName;
                        break;
                    }
                }

                if ($matchedKey && array_key_exists($matchedKey, $apiKeys)) {
                    $updatedKeys[] = $matchedKey;
                    $value = (string) ($apiKeys[$matchedKey] ?? '');
                    $newLines[] = "{$matchedKey}={$value}";
                } else {
                    $newLines[] = $line;
                }
            }

            // Append any new keys that weren't in the original .env
            foreach ($allowedKeys as $keyName) {
                if (!in_array($keyName, $updatedKeys) && !empty($apiKeys[$keyName] ?? '')) {
                    $newLines[] = "{$keyName}={$apiKeys[$keyName]}";
                }
            }

            file_put_contents($envPath, implode("\n", $newLines));

            \Illuminate\Support\Facades\Log::info('AdminController: updated .env file with API keys: ' . implode(', ', array_keys($apiKeys)));
            return 'synced';
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('AdminController: failed to update .env file: ' . $e->getMessage());
            return 'failed';
        }
    }
}
