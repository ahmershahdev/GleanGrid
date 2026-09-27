<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'action' => 'nullable|string|max:60',
            'q' => 'nullable|string|max:80',
        ]);

        return Inertia::render('Admin/Audit', [
            'logs' => AuditLog::with('user:id,name,role')
                ->when($filters['action'] ?? null, fn ($q, $a) => $q->where('action', 'like', "{$a}%"))
                ->when($filters['q'] ?? null, fn ($q, $s) => $q->searchWords($s, fn ($q, $t) => $q->where('description', 'like', "%{$t}%")))
                ->latest('id')->paginate(30)->withQueryString(),
            'actions' => AuditLog::query()->selectRaw("SUBSTRING_INDEX(action, '.', 1) as area")->distinct()->orderBy('area')->pluck('area'),
            'filters' => (object) $filters,
        ]);
    }
}
