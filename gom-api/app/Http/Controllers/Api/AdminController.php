<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\CeramicLine;
use App\Models\Payment;
use App\Models\Prediction;
use App\Models\TokenHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminController extends Controller
{
    // ================== DASHBOARD STATS ==================

    public function dashboard()
    {
        $totalUsers = User::count();
        $totalPredictions = Prediction::count();
        $totalPayments = Payment::where('status', 'completed')->count();
        $totalRevenue = Payment::where('status', 'completed')->sum('amount_vnd');
        $totalCeramicLines = CeramicLine::count();

        // Recent 7 days predictions
        $dailyPredictions = Prediction::where('created_at', '>=', Carbon::now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Recent 7 days new users
        $dailyUsers = User::where('created_at', '>=', Carbon::now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top users by predictions
        $topUsers = User::withCount('predictions')
            ->orderByDesc('predictions_count')
            ->take(5)
            ->get(['id', 'name', 'email', 'avatar']);

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'total_predictions' => $totalPredictions,
                'total_payments' => $totalPayments,
                'total_revenue' => $totalRevenue,
                'total_ceramic_lines' => $totalCeramicLines,
            ],
            'daily_predictions' => $dailyPredictions,
            'daily_users' => $dailyUsers,
            'top_users' => $topUsers,
        ]);
    }

    // ================== USER MANAGEMENT ==================

    public function users(Request $request)
    {
        $query = User::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        if ($request->has('role') && $request->role) {
            $query->where('role', $request->role);
        }

        $users = $query->withCount('predictions')
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($users);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $fields = $request->validate([
            'name' => 'sometimes|string',
            'email' => 'sometimes|string|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:user,admin',
            'token_balance' => 'sometimes|numeric|min:0',
            'free_predictions_used' => 'sometimes|integer|min:0',
        ]);

        $user->update($fields);

        return response()->json([
            'message' => 'Cập nhật người dùng thành công',
            'user' => $user->fresh()
        ]);
    }

    public function deleteUser($id)
    {
        $user = User::findOrFail($id);

        $user->tokens()->delete();
        $user->predictions()->delete();
        $user->payments()->delete();
        $user->tokenHistories()->delete();
        $user->delete();

        return response()->json(['message' => 'Đã xóa người dùng']);
    }

    // ================== CERAMIC LINES MANAGEMENT ==================

    public function ceramicLines(Request $request)
    {
        $query = CeramicLine::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('origin', 'like', "%$search%")
                  ->orWhere('country', 'like', "%$search%");
            });
        }

        $ceramics = $query->orderBy('name')->get();

        return response()->json(['data' => $ceramics]);
    }

    public function createCeramicLine(Request $request)
    {
        $fields = $request->validate([
            'name' => 'required|string',
            'origin' => 'nullable|string',
            'country' => 'nullable|string',
            'era' => 'nullable|string',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string',
            'style' => 'nullable|string',
            'is_featured' => 'boolean',
        ]);

        $ceramic = CeramicLine::create($fields);

        return response()->json([
            'message' => 'Tạo dòng gốm thành công',
            'data' => $ceramic
        ], 201);
    }

    public function updateCeramicLine(Request $request, $id)
    {
        $ceramic = CeramicLine::findOrFail($id);

        $fields = $request->validate([
            'name' => 'sometimes|string',
            'origin' => 'nullable|string',
            'country' => 'nullable|string',
            'era' => 'nullable|string',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string',
            'style' => 'nullable|string',
            'is_featured' => 'sometimes|boolean',
        ]);

        $ceramic->update($fields);

        return response()->json([
            'message' => 'Cập nhật dòng gốm thành công',
            'data' => $ceramic->fresh()
        ]);
    }

    public function deleteCeramicLine($id)
    {
        $ceramic = CeramicLine::findOrFail($id);
        $ceramic->delete();

        return response()->json(['message' => 'Đã xóa dòng gốm']);
    }

    // ================== PAYMENTS OVERVIEW ==================

    public function payments(Request $request)
    {
        $query = Payment::with('user:id,name,email');

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        $payments = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($payments);
    }

    // ================== PREDICTIONS OVERVIEW ==================

    public function predictions(Request $request)
    {
        $query = Prediction::with('user:id,name,email');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('final_prediction', 'like', "%$search%")
                  ->orWhereHas('user', function ($q2) use ($search) {
                      $q2->where('name', 'like', "%$search%")
                         ->orWhere('email', 'like', "%$search%");
                  });
            });
        }

        $predictions = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($predictions);
    }
}
