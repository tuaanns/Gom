<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CeramicLine;
use Illuminate\Http\Request;

class CeramicLineController extends Controller
{
    /**
     * Lấy danh sách dòng gốm (có phân trang, lọc, tìm kiếm)
     */
    public function index(Request $request)
    {
        $query = CeramicLine::query();

        // Lọc theo quốc gia
        if ($request->has('country')) {
            $query->where('country', $request->country);
        }

        // Lọc featured
        if ($request->has('featured')) {
            $query->where('is_featured', true);
        }

        // Tìm kiếm theo tên
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('origin', 'like', "%$search%")
                  ->orWhere('country', 'like', "%$search%")
                  ->orWhere('style', 'like', "%$search%");
            });
        }

        $ceramics = $query->orderByDesc('is_featured')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'data' => $ceramics,
        ]);
    }

    /**
     * Chi tiết một dòng gốm
     */
    public function show($id)
    {
        $ceramic = CeramicLine::findOrFail($id);
        return response()->json([
            'status' => 'success',
            'data' => $ceramic,
        ]);
    }
}
