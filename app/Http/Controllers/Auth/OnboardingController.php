<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        if (! $user->needsOnboarding()) {
            return redirect()->route($user->dashboardRoute());
        }

        return Inertia::render('Auth/Onboarding', [
            'profile' => $user->only('name', 'email', 'phone', 'address', 'city', 'role'),
            'avatar' => $user->avatar ? asset('storage/'.$user->avatar) : null,
            'needsStall' => $user->isFarmer() && ! $user->farmerProfile()->exists(),
            'providers' => $user->socialAccounts()->pluck('provider'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $needsStall = $user->isFarmer() && ! $user->farmerProfile()->exists();

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => ['required', 'string', 'max:30', 'regex:/^[0-9+\-\s()]{7,30}$/'],
            'address' => 'required|string|max:500',
            'city' => 'nullable|string|max:80',
            'stall_name' => [Rule::requiredIf($needsStall), 'nullable', 'string', 'max:120'],
            'contact_person' => [Rule::requiredIf($needsStall), 'nullable', 'string', 'max:100'],
            'terms' => 'accepted',
        ]);

        DB::transaction(function () use ($user, $data, $needsStall) {
            $user->update(collect($data)->only('name', 'phone', 'address', 'city')->all());

            if ($needsStall && $user->role === User::ROLE_FARMER) {
                $user->farmerProfile()->firstOrCreate([], [
                    'stall_name' => $data['stall_name'],
                    'slug' => Str::slug($data['stall_name']).'-'.Str::lower(Str::random(4)),
                    'contact_person' => $data['contact_person'],
                    'phone' => $data['phone'],
                    'email' => $user->email,
                    'address' => $data['address'],
                    'operating_days' => [],
                    'status' => 'pending',
                ]);
            }
        });

        return redirect()->route($user->dashboardRoute())->with('success', $user->isFarmer() ? 'flash.farmer_registered' : 'flash.welcome');
    }
}
