<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!auth()->check() || !auth()->user()->isAdmin()) {
            return response()->json(['message' => 'Bạn không có quyền truy cập chức năng này.'], 403);
        }
        return $next($request);
    }
}
