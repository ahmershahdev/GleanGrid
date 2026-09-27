<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Settings', [
            'settings' => Settings::all(),
            'updated' => DB::table('settings')->leftJoin('users', 'users.id', '=', 'settings.updated_by')
                ->orderByDesc('settings.updated_at')->first(['settings.updated_at', 'users.name']),
            'summary' => (array) (DB::select('CALL sp_platform_summary(?, ?)', [now()->subDays(30)->toDateString(), now()->addDays(30)->toDateString()])[0] ?? []),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(Settings::rules());
        $before = Settings::all();
        Settings::put($data, $request->user()->id);

        $changed = collect($data)->filter(fn ($v, $k) => (string) (int) $before[$k] !== (string) (int) $v)->keys();
        if ($changed->isNotEmpty()) {
            AuditLog::record('settings.updated', 'Changed '.$changed->implode(', '), null, collect($data)->only($changed)->all());
        }

        return back()->with('success', 'flash.settings_saved');
    }
}
