<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FarmerBadge;
use App\Models\FarmerProfile;
use App\Notifications\PlatformNotification;
use App\Services\BadgeService;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BadgeController extends Controller
{
    public function index(Request $request, BadgeService $badges): Response
    {
        $filters = $request->validate(['badge' => ['nullable', Rule::in(FarmerBadge::BADGES)], 'q' => 'nullable|string|max:80']);

        $records = FarmerBadge::query()->get()->groupBy('farmer_profile_id');
        $metrics = $badges->metrics()
            ->when($filters['q'] ?? null, fn ($c, $q) => $c->filter(fn ($m) => str_contains(mb_strtolower($m['stall_name']), mb_strtolower($q))))
            ->map(fn ($m) => [
                ...$m,
                'badges' => ($records->get($m['farmer_profile_id']) ?? collect())->map(fn (FarmerBadge $b) => [
                    ...$b->only('id', 'badge', 'source', 'locked', 'reason'),
                    'active' => $b->revoked_at === null,
                    'awarded_at' => $b->awarded_at?->toIso8601String(),
                    'revoked_at' => $b->revoked_at?->toIso8601String(),
                ])->values(),
            ])
            ->when($filters['badge'] ?? null, fn ($c, $b) => $c->filter(fn ($m) => $m['badges']->contains(fn ($x) => $x['badge'] === $b && $x['active'])))
            ->sortByDesc('score')->values();

        return Inertia::render('Admin/Badges', [
            'farmers' => $metrics,
            'rules' => $badges->rules(),
            'settings' => collect(Settings::all())->filter(fn ($v, $k) => str_starts_with($k, 'badge_')),
            'counts' => FarmerBadge::active()->selectRaw('badge, COUNT(*) as c')->groupBy('badge')->pluck('c', 'badge'),
            'filters' => (object) $filters,
        ]);
    }

    public function recompute(BadgeService $badges): RedirectResponse
    {
        $summary = $badges->recompute();
        AuditLog::record('badges.recomputed', "Recalculated stall badges: {$summary['awarded']} awarded, {$summary['revoked']} revoked", null, $summary);

        return back()->with('success', 'flash.badges_recomputed');
    }

    public function rules(Request $request, BadgeService $badges): RedirectResponse
    {
        $data = $request->validate(Settings::rules('badge_'));
        Settings::put($data, $request->user()->id);
        AuditLog::record('badges.rules', 'Changed badge thresholds', null, $data);
        $badges->recompute();

        return back()->with('success', 'flash.badges_rules_saved');
    }

    public function award(Request $request, FarmerProfile $farmer): RedirectResponse
    {
        $data = $request->validate([
            'badge' => ['required', Rule::in(FarmerBadge::BADGES)],
            'reason' => 'required|string|min:5|max:190',
        ]);
        abort_unless($farmer->isApproved(), 422);

        $badge = FarmerBadge::updateOrCreate(
            ['farmer_profile_id' => $farmer->id, 'badge' => $data['badge']],
            ['source' => 'manual', 'locked' => true, 'reason' => $data['reason'], 'awarded_by' => $request->user()->id, 'awarded_at' => now(), 'revoked_at' => null, 'revoked_by' => null],
        );
        $farmer->user?->notify(new PlatformNotification('badge_awarded', ['badge' => $badge->badge], route('farmer.dashboard'), true));
        AuditLog::record('badge.awarded', "Awarded {$badge->badge} to {$farmer->stall_name}: {$data['reason']}", $farmer);

        return back()->with('success', 'flash.badge_awarded');
    }

    public function revoke(Request $request, FarmerBadge $badge): RedirectResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:190']);
        $badge->update(['revoked_at' => now(), 'revoked_by' => $request->user()->id, 'locked' => true, 'source' => 'manual', 'reason' => $data['reason']]);
        AuditLog::record('badge.revoked', "Revoked {$badge->badge} from {$badge->farmer->stall_name}: {$data['reason']}", $badge->farmer);

        return back()->with('success', 'flash.badge_revoked');
    }

    public function unlock(FarmerBadge $badge, BadgeService $badges): RedirectResponse
    {
        $badge->update(['locked' => false, 'source' => 'auto']);
        $badges->recompute($badge->farmer);
        AuditLog::record('badge.unlocked', "Returned {$badge->badge} for {$badge->farmer->stall_name} to automatic rules", $badge->farmer);

        return back()->with('success', 'flash.badge_unlocked');
    }
}
